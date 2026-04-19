import { redirect, fail } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_SECRET_KEY } from '$env/static/private'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	const { supabase, session } = locals
	const user = session!.user

	// Ensure user profile exists
	const fallbackName = user.email?.split('@')[0] ?? 'Unknown'
	await supabase.from('users').upsert(
		{ id: user.id, email: user.email ?? '', full_name: user.user_metadata?.full_name ?? fallbackName, preferred_language: 'en' },
		{ onConflict: 'id', ignoreDuplicates: true }
	)

	const { data: roleData } = await supabase
		.from('user_roles')
		.select('*')
		.eq('user_id', user.id)

	const userRoles = roleData ?? []

	if (userRoles.length === 0) {
		return { patients: [], userEmail: user.email ?? '' }
	}

	const patientIds = userRoles.map((r) => r.patient_id)
	const { data: patientData } = await supabase
		.from('patients')
		.select('*')
		.in('id', patientIds)
		.order('full_name')

	const patients = patientData ?? []

	if (patients.length === 1 && !url.searchParams.has('switch')) {
		redirect(303, `/${patients[0].id}`)
	}

	return { patients, userEmail: user.email ?? '', userRoles }
}

export const actions: Actions = {
	createPatient: async ({ locals, request }) => {
		const { session } = locals
		if (!session) return fail(401, { error: 'Not authenticated' })

		const formData = await request.formData()
		const full_name = (formData.get('full_name') as string)?.trim()
		const dob = (formData.get('dob') as string)?.trim() || null

		if (!full_name) {
			return fail(400, { error: 'Name is required' })
		}

		// Use the secret key (service role) for server-side writes — the publishable key's
		// ES256 JWT tokens aren't being verified by local PostgREST, so auth.uid() is null.
		const admin = createClient(import.meta.env.VITE_SUPABASE_URL, SUPABASE_SECRET_KEY)

		const { data: patient, error: patientError } = await admin
			.from('patients')
			.insert({ full_name, dob })
			.select()
			.single()

		if (patientError || !patient) {
			console.error('createPatient error:', patientError)
			return fail(500, { error: patientError?.message ?? 'Failed to create patient' })
		}

		// Trigger won't fire auth.uid() with service role, so insert user_roles manually
		const { error: roleError } = await admin
			.from('user_roles')
			.insert({ user_id: session.user.id, patient_id: patient.id, role: 'coordinator' })

		if (roleError) {
			console.error('createPatient role error:', roleError)
			// Clean up the orphaned patient
			await admin.from('patients').delete().eq('id', patient.id)
			return fail(500, { error: 'Failed to assign coordinator role' })
		}

		redirect(303, `/${patient.id}`)
	}
}
