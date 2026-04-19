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

const USERS = [
	{ id: '00000000-0000-0000-0000-000000000001', email: 'alice@demo.com', full_name: 'Alice Coordinator', language: 'en', role: 'coordinator' },
	{ id: '00000000-0000-0000-0000-000000000002', email: 'bob@demo.com',   full_name: 'Bob Coordinator',   language: 'en', role: 'coordinator' },
	{ id: '00000000-0000-0000-0000-000000000003', email: 'maria@demo.com', full_name: 'Maria Caregiver',   language: 'es', role: 'caregiver'   }
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

console.log('\nSign in at http://localhost:5173 with password: password123');
