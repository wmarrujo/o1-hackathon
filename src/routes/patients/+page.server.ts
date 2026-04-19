import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
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

	if (patients.length === 1) {
		redirect(303, `/${patients[0].id}/tasks`)
	}

	return { patients, userEmail: user.email ?? '' }
}
