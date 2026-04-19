import { error } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const { supabase, session } = locals

	const { data: role } = await supabase
		.from('user_roles')
		.select('*')
		.eq('user_id', session!.user.id)
		.eq('patient_id', params.patientId)
		.single()

	// Return 403 for both "patient doesn't exist" and "no access" — don't leak which IDs are real
	if (!role) error(403, 'Forbidden')

	const { data: patient } = await supabase
		.from('patients')
		.select('*')
		.eq('id', params.patientId)
		.single()

	if (!patient) error(403, 'Forbidden')

	const { data: userProfile } = await supabase
		.from('users')
		.select('full_name')
		.eq('id', session!.user.id)
		.single()

	return {
		patient,
		userRole: role,
		userId: session!.user.id,
		userFullName: userProfile?.full_name ?? session!.user.email?.split('@')[0] ?? 'Unknown',
		canManageTasks: role.role === 'coordinator' || role.role === 'gov_coordinator'
	}
}
