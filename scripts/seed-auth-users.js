#!/usr/bin/env node
// Creates the demo auth users via Supabase's admin API, then inserts the
// matching public.users and user_roles rows. Run after `supabase db reset`.
//
// Usage: node scripts/seed-auth-users.js

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
	execSync('npx supabase status -o env', { encoding: 'utf8' })
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const i = line.indexOf('=');
			return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')];
		})
);

const supabase = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const PATIENT_ID = '00000000-0000-0000-0000-000000000010';

const DIANNE = '00000000-0000-0000-0000-000000000001';
const LINDA  = '00000000-0000-0000-0000-000000000003';

const USERS = [
	{ id: DIANNE,                                    email: 'dianne@demo.com', full_name: 'Dianne Henderson', language: 'en', role: 'coordinator' },
	{ id: LINDA,                                     email: 'linda@demo.com',  full_name: 'Linda Torres',     language: 'es', role: 'caregiver'   },
	{ id: '00000000-0000-0000-0000-000000000004',    email: 'cathy@demo.com',  full_name: 'Cathy Williams',   language: 'en', role: 'caregiver'   },
	{ id: '00000000-0000-0000-0000-000000000005',    email: 'peggy@demo.com',  full_name: 'Peggy Johnson',    language: 'en', role: 'caregiver'   },
	{ id: '00000000-0000-0000-0000-000000000006',    email: 'kelsey@demo.com', full_name: 'Kelsey Park',      language: 'en', role: 'caregiver'   }
];

for (const u of USERS) {
	const { error: authErr } = await supabase.auth.admin.createUser({
		id: u.id,
		email: u.email,
		password: 'password123',
		email_confirm: true,
		user_metadata: { full_name: u.full_name }
	});
	if (authErr && !authErr.message.includes('already')) {
		console.error(`auth.admin.createUser(${u.email}):`, authErr.message);
		process.exit(1);
	}

	const { error: profileErr } = await supabase
		.from('users')
		.upsert({ id: u.id, full_name: u.full_name, email: u.email, preferred_language: u.language });
	if (profileErr) { console.error(`public.users(${u.email}):`, profileErr.message); process.exit(1); }

	const { error: roleErr } = await supabase
		.from('user_roles')
		.upsert({ user_id: u.id, patient_id: PATIENT_ID, role: u.role }, { onConflict: 'user_id,patient_id' });
	if (roleErr) { console.error(`user_roles(${u.email}):`, roleErr.message); process.exit(1); }

	console.log(`✓ ${u.email} (${u.role})`);
}

// Assign shifts now that users exist
const shiftAssignments = [
	{ id: '00000000-0000-0000-0001-000000000001', assigned_user_id: DIANNE },
	{ id: '00000000-0000-0000-0001-000000000002', assigned_user_id: LINDA  },
	{ id: '00000000-0000-0000-0001-000000000003', assigned_user_id: DIANNE }
];
for (const { id, assigned_user_id } of shiftAssignments) {
	const { error } = await supabase.from('schedule_events').update({ assigned_user_id }).eq('id', id);
	if (error) { console.error('schedule_events assign:', error.message); process.exit(1); }
}
console.log('✓ shift assignments');

// Tasks (reference Dianne as creator/assignee)
const { error: taskErr } = await supabase.from('tasks').upsert([
	{
		id: '00000000-0000-0000-0003-000000000001',
		patient_id: PATIENT_ID,
		description: 'Pick up metformin refill from CVS (Prescription #4821)',
		due_time: '2026-04-20T17:00:00+00:00',
		assignee_id: DIANNE,
		complete: false,
		created_by: DIANNE,
		created_at: '2026-04-17T10:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000002',
		patient_id: PATIENT_ID,
		description: 'Call Dr. Smith office to confirm April 22 appointment — (555) 310-4400',
		due_time: '2026-04-19T12:00:00+00:00',
		assignee_id: DIANNE,
		complete: false,
		created_by: DIANNE,
		created_at: '2026-04-17T10:05:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000003',
		patient_id: PATIENT_ID,
		description: 'Order new non-slip bath mat for the main bathroom',
		due_time: '2026-04-25T17:00:00+00:00',
		assignee_id: DIANNE,
		complete: false,
		created_by: DIANNE,
		created_at: '2026-04-16T09:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000004',
		patient_id: PATIENT_ID,
		description: 'Share updated medication list with caregiver team',
		due_time: '2026-04-18T09:00:00+00:00',
		assignee_id: DIANNE,
		complete: true,
		completed_by: DIANNE,
		completed_at: '2026-04-18T08:45:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-15T14:00:00+00:00'
	}
], { onConflict: 'id' });
if (taskErr) { console.error('tasks:', taskErr.message); process.exit(1); }
console.log('✓ tasks');

// Notes
const { error: noteErr } = await supabase.from('notes').upsert([
	{
		id: '00000000-0000-0000-0005-000000000001',
		patient_id: PATIENT_ID,
		task_id: '00000000-0000-0000-0003-000000000001',
		author_id: DIANNE,
		content: "CVS on Oak Street has it in stock. They said the prescription expires on the 30th so we have some time, but don't wait too long.",
		created_at: '2026-04-17T10:30:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000002',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: DIANNE,
		content: 'Joyce was in good spirits this morning. Blood glucose was 142 before breakfast — within range. She asked about her sister Claire twice.',
		created_at: '2026-04-17T09:45:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000003',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: LINDA,
		content: 'Evening was calm. Joyce ate most of her dinner and went to bed around 8:30. BP was 126/78.',
		created_at: '2026-04-17T20:15:00+00:00'
	}
], { onConflict: 'id' });
if (noteErr) { console.error('notes:', noteErr.message); process.exit(1); }
console.log('✓ notes');

console.log('\nSign in at http://localhost:5173 with password: password123');
console.log('  Coordinator: dianne@demo.com');
console.log('  Caregiver:   linda@demo.com');
console.log('  Caregiver:   cathy@demo.com');
console.log('  Caregiver:   peggy@demo.com');
console.log('  Caregiver:   kelsey@demo.com');
