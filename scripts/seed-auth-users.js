#!/usr/bin/env node
// Creates demo auth users via Supabase's admin API, then upserts all seed data.
// Safe to run on every deploy — all operations are idempotent.
//
// Production: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
// Local:      falls back to `npx supabase status -o env` if env vars are absent.
//
// Usage: node scripts/seed-auth-users.js

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

let supabaseUrl = process.env.SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	const localEnv = Object.fromEntries(
		execSync('npx supabase status -o env', { encoding: 'utf8' })
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const i = line.indexOf('=');
				return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')];
			})
	);
	supabaseUrl = localEnv.API_URL;
	serviceRoleKey = localEnv.SERVICE_ROLE_KEY;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false }
});

// ── IDs ────────────────────────────────────────────────────────────────────────
const PATIENT_ID = '00000000-0000-0000-0000-000000000010';
const PATIENT_ID_2 = '00000000-0000-0000-0000-000000000011';

// ── Patient ────────────────────────────────────────────────────────────────────
// ignoreDuplicates: true → ON CONFLICT DO NOTHING, so the trigger that
// auto-assigns a coordinator role is skipped on subsequent runs.
// On first insert, auth.uid() is null (service role), so the trigger also
// skips the auto-assignment — user_roles are handled explicitly below.
{
	const { error } = await supabase.from('patients').upsert([{
		id: PATIENT_ID,
		full_name: 'Joyce Henderson',
		dob: '1941-08-22',
		emergency_contact: 'Dianne Henderson (daughter) — (555) 234-8765',
		family_contact: 'Dianne Henderson — (555) 234-8765',
		notes: 'Allergic to sulfa drugs. Prefers morning routine before 9am. Mild dementia — responds well to familiar faces and music from the 1960s. Diabetic — check blood sugar before meals. Likes her coffee with cream, no sugar.',
	}], { onConflict: 'id', ignoreDuplicates: true });
	if (error) { console.error('patients:', error.message); process.exit(1); }
	console.log('✓ patient (Joyce Henderson)');
}

{
	const { error } = await supabase.from('patients').upsert([{
		id: PATIENT_ID_2,
		full_name: 'Arturo Ramos',
		dob: '1952-03-15',
		emergency_contact: 'Maria Ramos (wife) — (555) 412-9087',
		family_contact: 'Sofia Ramos (daughter) — (555) 412-3321',
		notes: "Spanish is his primary language — he understands English but prefers Spanish. Parkinson's disease — tremors worse in the morning before medication. Uses a walker. Loves telenovelas and coffee with two sugars. Do NOT give acetaminophen (liver concern).",
	}], { onConflict: 'id', ignoreDuplicates: true });
	if (error) { console.error('patients:', error.message); process.exit(1); }
	console.log('✓ patient (Arturo Ramos)');
}

// ── Health conditions ──────────────────────────────────────────────────────────
{
	const { error } = await supabase.from('health_conditions').upsert([
		{
			id: '00000000-0000-0000-0002-000000000001',
			patient_id: PATIENT_ID,
			name: 'Type 2 Diabetes',
			description: 'Managed with metformin 500mg twice daily. Check blood glucose before each meal and at bedtime. Target range 80–180 mg/dL. Contact Dianne immediately if reading is below 70 or above 300.',
			diagnosed_at: '2008-03-01',
		},
		{
			id: '00000000-0000-0000-0002-000000000002',
			patient_id: PATIENT_ID,
			name: 'Hypertension',
			description: 'Managed with lisinopril 10mg once daily (morning). Monitor blood pressure twice a day — morning before medications and evening before dinner. Target below 130/80.',
			diagnosed_at: '2012-11-15',
		},
		{
			id: '00000000-0000-0000-0002-000000000003',
			patient_id: PATIENT_ID,
			name: 'Mild Cognitive Impairment',
			description: 'Early-stage dementia. Familiar routines and faces help with orientation. May become confused or agitated in the late afternoon (sundowning). Do not leave unattended near the stove. Use simple, short sentences and allow extra time for responses.',
			diagnosed_at: '2023-06-10',
		},
	], { onConflict: 'id' });
	if (error) { console.error('health_conditions:', error.message); process.exit(1); }
	console.log('✓ health conditions (3 total)');
}

{
	const { error } = await supabase.from('health_conditions').upsert([
		{
			id: '00000000-0000-0000-0002-000000000004',
			patient_id: PATIENT_ID_2,
			name: "Parkinson's Disease",
			description: 'Diagnosed stage 2. Managed with carbidopa-levodopa 25-100mg three times daily (8am, 1pm, 6pm). Tremor and rigidity worst first thing in the morning before the 8am dose — allow extra time for breakfast and dressing. Requires walker for all ambulation. Call Sofia if he falls or refuses medication.',
			diagnosed_at: '2019-09-11',
		},
		{
			id: '00000000-0000-0000-0002-000000000005',
			patient_id: PATIENT_ID_2,
			name: 'Osteoarthritis (knees)',
			description: 'Bilateral knee osteoarthritis. Topical diclofenac gel as needed for pain — apply to knees twice daily. AVOID acetaminophen (liver concern from prior hepatitis). Gentle range-of-motion exercises in the morning help with stiffness.',
			diagnosed_at: '2016-04-21',
		},
	], { onConflict: 'id' });
	if (error) { console.error('health_conditions (Arturo):', error.message); process.exit(1); }
	console.log('✓ health conditions — Arturo (2 total)');
}

// ── Base schedule events (from seed.sql) ───────────────────────────────────────
{
	const { error } = await supabase.from('schedule_events').upsert([
		{
			id: '00000000-0000-0000-0001-000000000001',
			patient_id: PATIENT_ID,
			assigned_user_id: null,
			ics_uid: 'morning-shift-joyce-2026@salus',
			title: 'Morning Care Shift',
			event_type: 'shift',
			dtstart: '2026-04-18 12:00:00+00',
			dtend: '2026-04-18 16:00:00+00',
			rrule: null,
			status: 'CONFIRMED',
			additional_notes: 'Check blood glucose and BP first thing. Joyce prefers NPR on the radio during breakfast.',
		},
		{
			id: '00000000-0000-0000-0001-000000000002',
			patient_id: PATIENT_ID,
			assigned_user_id: null,
			ics_uid: 'evening-shift-joyce-2026@salus',
			title: 'Evening Care Shift',
			event_type: 'shift',
			dtstart: '2026-04-18 21:00:00+00',
			dtend: '2026-04-18 23:00:00+00',
			rrule: null,
			status: 'CONFIRMED',
			additional_notes: 'Joyce tends to be more confused in the evening. Keep lights bright and routine consistent.',
		},
		{
			id: '00000000-0000-0000-0001-000000000003',
			patient_id: PATIENT_ID,
			assigned_user_id: null,
			ics_uid: 'dr-smith-appt-20260422@salus',
			title: 'Dr. Smith — Primary Care Checkup',
			event_type: 'appointment',
			dtstart: '2026-04-22 14:00:00+00',
			dtend: '2026-04-22 15:00:00+00',
			rrule: null,
			status: 'CONFIRMED',
			additional_notes: 'Quarterly checkup. Bring the printed medication list and the blood pressure log from the past month. Dr. Smith office: (555) 310-4400.',
		},
	], { onConflict: 'id' });
	if (error) { console.error('schedule_events (base):', error.message); process.exit(1); }
	console.log('✓ base schedule events (3 total)');
}

// ── Checklist items ────────────────────────────────────────────────────────────
{
	const { error } = await supabase.from('checklist_items').upsert([
		{ id: '00000000-0000-0000-0004-000000000001', event_id: '00000000-0000-0000-0001-000000000001', description: 'Check blood glucose before breakfast', category: 'medication', done: false },
		{ id: '00000000-0000-0000-0004-000000000002', event_id: '00000000-0000-0000-0001-000000000001', description: 'Administer metformin 500mg with breakfast', category: 'medication', done: false },
		{ id: '00000000-0000-0000-0004-000000000003', event_id: '00000000-0000-0000-0001-000000000001', description: 'Administer lisinopril 10mg', category: 'medication', done: false },
		{ id: '00000000-0000-0000-0004-000000000004', event_id: '00000000-0000-0000-0001-000000000001', description: 'Check blood pressure (log the reading)', category: 'general', done: false },
		{ id: '00000000-0000-0000-0004-000000000005', event_id: '00000000-0000-0000-0001-000000000001', description: 'Prepare and serve breakfast', category: 'general', done: false },
		{ id: '00000000-0000-0000-0004-000000000006', event_id: '00000000-0000-0000-0001-000000000001', description: 'Assist with morning hygiene (shower or wash, dress)', category: 'general', done: false },
		{ id: '00000000-0000-0000-0004-000000000007', event_id: '00000000-0000-0000-0001-000000000001', description: 'Morning walk — 15–20 min if weather permits', category: 'general', done: false },
		{ id: '00000000-0000-0000-0004-000000000008', event_id: '00000000-0000-0000-0001-000000000002', description: 'Check blood glucose before dinner', category: 'medication', done: false },
		{ id: '00000000-0000-0000-0004-000000000009', event_id: '00000000-0000-0000-0001-000000000002', description: 'Administer metformin 500mg with dinner', category: 'medication', done: false },
		{ id: '00000000-0000-0000-0004-000000000010', event_id: '00000000-0000-0000-0001-000000000002', description: 'Check blood pressure (log the reading)', category: 'general', done: false },
		{ id: '00000000-0000-0000-0004-000000000011', event_id: '00000000-0000-0000-0001-000000000002', description: 'Prepare and serve dinner', category: 'general', done: false },
		{ id: '00000000-0000-0000-0004-000000000012', event_id: '00000000-0000-0000-0001-000000000002', description: 'Ensure Joyce is settled and comfortable before leaving', category: 'general', done: false },
	], { onConflict: 'id', ignoreDuplicates: true });
	if (error) { console.error('checklist_items:', error.message); process.exit(1); }
	console.log('✓ checklist items (12 total)');
}

const DIANNE = '00000000-0000-0000-0000-000000000001';
const LINDA  = '00000000-0000-0000-0000-000000000003';
const CATHY  = '00000000-0000-0000-0000-000000000004';
const PEGGY  = '00000000-0000-0000-0000-000000000005';
const KELSEY = '00000000-0000-0000-0000-000000000006';

// ── Auth users ─────────────────────────────────────────────────────────────────
const USERS = [
	{ id: DIANNE, email: 'dianne@demo.com', full_name: 'Dianne Henderson', language: 'en', role: 'coordinator' },
	{ id: LINDA,  email: 'linda@demo.com',  full_name: 'Linda Torres',     language: 'es', role: 'caregiver'   },
	{ id: CATHY,  email: 'cathy@demo.com',  full_name: 'Cathy Williams',   language: 'en', role: 'caregiver'   },
	{ id: PEGGY,  email: 'peggy@demo.com',  full_name: 'Peggy Johnson',    language: 'en', role: 'caregiver'   },
	{ id: KELSEY, email: 'kelsey@demo.com', full_name: 'Kelsey Park',      language: 'en', role: 'caregiver'   },
];

for (const u of USERS) {
	const { error: authErr } = await supabase.auth.admin.createUser({
		id: u.id,
		email: u.email,
		password: 'password123',
		email_confirm: true,
		user_metadata: { full_name: u.full_name }
	});
	if (authErr) {
		if (!authErr.message.toLowerCase().includes('already')) {
			console.error(`auth.admin.createUser(${u.email}):`, authErr.message);
			process.exit(1);
		}
		// User already exists (auth.users survives db reset) — ensure password is correct
		const { error: updateErr } = await supabase.auth.admin.updateUserById(u.id, {
			password: 'password123',
			email_confirm: true,
		});
		if (updateErr) {
			console.error(`auth.admin.updateUserById(${u.email}):`, updateErr.message);
			process.exit(1);
		}
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

// ── Second patient (Arturo Ramos) — role assignments ──────────────────────────
const PATIENT_2_ROLES = [
	{ user_id: LINDA, role: 'coordinator' },
];
for (const r of PATIENT_2_ROLES) {
	const { error } = await supabase
		.from('user_roles')
		.upsert({ user_id: r.user_id, patient_id: PATIENT_ID_2, role: r.role }, { onConflict: 'user_id,patient_id' });
	if (error) { console.error(`user_roles (patient 2, ${r.user_id}):`, error.message); process.exit(1); }
}
console.log(`✓ patient 2 roles (${PATIENT_2_ROLES.length} total)`);

// ── Schedule shifts ────────────────────────────────────────────────────────────
// seed.sql already has shift 001 (Apr 18 morning) and 002 (Apr 18 evening),
// and appointment 003 (Apr 22). We assign those plus add a full two-week spread.
//
// Times are UTC. Joyce is in EDT (UTC-4), so 12:00Z = 8am, 16:00Z = 12pm,
// 21:00Z = 5pm, 23:00Z = 7pm local.

const SHIFTS = [
	// ── Week of Apr 13 (Mon) – Apr 19 (Sun) — current week ──────────────────
	// Apr 13 Mon
	{ id: '00000000-0000-0000-0001-000000000004', title: 'Morning Care Shift', dtstart: '2026-04-13 12:00:00+00', dtend: '2026-04-13 16:00:00+00', assignee: LINDA,  notes: 'Check BP and glucose first. Joyce mentioned wanting to call her daughter today.' },
	{ id: '00000000-0000-0000-0001-000000000005', title: 'Evening Care Shift', dtstart: '2026-04-13 21:00:00+00', dtend: '2026-04-13 23:00:00+00', assignee: CATHY,  notes: 'Keep lights bright — she tends to get anxious after 6pm.' },
	// Apr 14 Tue
	{ id: '00000000-0000-0000-0001-000000000006', title: 'Morning Care Shift', dtstart: '2026-04-14 12:00:00+00', dtend: '2026-04-14 16:00:00+00', assignee: PEGGY,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000007', title: 'Evening Care Shift', dtstart: '2026-04-14 21:00:00+00', dtend: '2026-04-14 23:00:00+00', assignee: LINDA,  notes: null },
	// Apr 15 Wed
	{ id: '00000000-0000-0000-0001-000000000008', title: 'Morning Care Shift', dtstart: '2026-04-15 12:00:00+00', dtend: '2026-04-15 16:00:00+00', assignee: CATHY,  notes: 'Physiotherapist visit at 10am — be ready to assist.' },
	{ id: '00000000-0000-0000-0001-000000000009', title: 'Evening Care Shift', dtstart: '2026-04-15 21:00:00+00', dtend: '2026-04-15 23:00:00+00', assignee: KELSEY, notes: null },
	// Apr 16 Thu
	{ id: '00000000-0000-0000-0001-000000000010', title: 'Morning Care Shift', dtstart: '2026-04-16 12:00:00+00', dtend: '2026-04-16 16:00:00+00', assignee: LINDA,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000011', title: 'Evening Care Shift', dtstart: '2026-04-16 21:00:00+00', dtend: '2026-04-16 23:00:00+00', assignee: CATHY,  notes: null },
	// Apr 17 Fri
	{ id: '00000000-0000-0000-0001-000000000012', title: 'Morning Care Shift', dtstart: '2026-04-17 12:00:00+00', dtend: '2026-04-17 16:00:00+00', assignee: PEGGY,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000013', title: 'Evening Care Shift', dtstart: '2026-04-17 21:00:00+00', dtend: '2026-04-17 23:00:00+00', assignee: LINDA,  notes: null },
	// Apr 18 Sat — already in seed.sql (001 = morning/Dianne, 002 = evening/Linda)
	// Apr 19 Sun — today
	{ id: '00000000-0000-0000-0001-000000000014', title: 'Morning Care Shift', dtstart: '2026-04-19 11:00:00+00', dtend: '2026-04-19 15:00:00+00', assignee: KELSEY, notes: 'Sunday routine — Joyce likes hymns on the radio in the morning.' },
	{ id: '00000000-0000-0000-0001-000000000015', title: 'Evening Care Shift', dtstart: '2026-04-19 17:00:00+00', dtend: '2026-04-19 20:00:00+00', assignee: LINDA,  notes: null },

	// ── Week of Apr 20 (Mon) – Apr 26 (Sun) — next week ─────────────────────
	// Apr 20 Mon
	{ id: '00000000-0000-0000-0001-000000000016', title: 'Morning Care Shift', dtstart: '2026-04-20 12:00:00+00', dtend: '2026-04-20 16:00:00+00', assignee: LINDA,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000017', title: 'Evening Care Shift', dtstart: '2026-04-20 21:00:00+00', dtend: '2026-04-20 23:00:00+00', assignee: PEGGY,  notes: null },
	// Apr 21 Tue
	{ id: '00000000-0000-0000-0001-000000000018', title: 'Morning Care Shift', dtstart: '2026-04-21 12:00:00+00', dtend: '2026-04-21 16:00:00+00', assignee: CATHY,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000019', title: 'Evening Care Shift', dtstart: '2026-04-21 21:00:00+00', dtend: '2026-04-21 23:00:00+00', assignee: KELSEY, notes: null },
	// Apr 22 Wed — Dr. Smith appointment already in seed.sql (003)
	{ id: '00000000-0000-0000-0001-000000000020', title: 'Morning Care Shift', dtstart: '2026-04-22 12:00:00+00', dtend: '2026-04-22 16:00:00+00', assignee: PEGGY,  notes: 'Prepare printed medication list and BP log for Dr. Smith at 2pm.' },
	{ id: '00000000-0000-0000-0001-000000000021', title: 'Evening Care Shift', dtstart: '2026-04-22 21:00:00+00', dtend: '2026-04-22 23:00:00+00', assignee: LINDA,  notes: null },
	// Apr 23 Thu
	{ id: '00000000-0000-0000-0001-000000000022', title: 'Morning Care Shift', dtstart: '2026-04-23 12:00:00+00', dtend: '2026-04-23 16:00:00+00', assignee: KELSEY, notes: null },
	{ id: '00000000-0000-0000-0001-000000000023', title: 'Evening Care Shift', dtstart: '2026-04-23 21:00:00+00', dtend: '2026-04-23 23:00:00+00', assignee: CATHY,  notes: null },
	// Apr 24 Fri
	{ id: '00000000-0000-0000-0001-000000000024', title: 'Morning Care Shift', dtstart: '2026-04-24 12:00:00+00', dtend: '2026-04-24 16:00:00+00', assignee: LINDA,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000025', title: 'Evening Care Shift', dtstart: '2026-04-24 21:00:00+00', dtend: '2026-04-24 23:00:00+00', assignee: PEGGY,  notes: null },
	// Apr 25 Sat
	{ id: '00000000-0000-0000-0001-000000000026', title: 'Morning Care Shift', dtstart: '2026-04-25 12:00:00+00', dtend: '2026-04-25 16:00:00+00', assignee: DIANNE, notes: null },
	{ id: '00000000-0000-0000-0001-000000000027', title: 'Evening Care Shift', dtstart: '2026-04-25 21:00:00+00', dtend: '2026-04-25 23:00:00+00', assignee: CATHY,  notes: null },
	// Apr 26 Sun
	{ id: '00000000-0000-0000-0001-000000000028', title: 'Morning Care Shift', dtstart: '2026-04-26 11:00:00+00', dtend: '2026-04-26 15:00:00+00', assignee: KELSEY, notes: null },
	{ id: '00000000-0000-0000-0001-000000000029', title: 'Evening Care Shift', dtstart: '2026-04-26 17:00:00+00', dtend: '2026-04-26 20:00:00+00', assignee: LINDA,  notes: null },
];

const { error: shiftsErr } = await supabase.from('schedule_events').upsert(
	SHIFTS.map(s => ({
		id: s.id,
		patient_id: PATIENT_ID,
		assigned_user_id: s.assignee,
		ics_uid: `${s.id}@caretrack`,
		title: s.title,
		event_type: 'shift',
		dtstart: s.dtstart,
		dtend: s.dtend,
		rrule: null,
		status: 'CONFIRMED',
		additional_notes: s.notes,
	})),
	{ onConflict: 'id' }
);
if (shiftsErr) { console.error('schedule_events (shifts):', shiftsErr.message); process.exit(1); }

// Assign the seed.sql shifts (001 = morning Apr 18, 002 = evening Apr 18, 003 = Dr. Smith)
const seedShiftAssignments = [
	{ id: '00000000-0000-0000-0001-000000000001', assigned_user_id: DIANNE },
	{ id: '00000000-0000-0000-0001-000000000002', assigned_user_id: CATHY  },
	{ id: '00000000-0000-0000-0001-000000000003', assigned_user_id: DIANNE },
];
for (const { id, assigned_user_id } of seedShiftAssignments) {
	const { error } = await supabase.from('schedule_events').update({ assigned_user_id }).eq('id', id);
	if (error) { console.error('schedule_events assign:', error.message); process.exit(1); }
}
console.log(`✓ schedule shifts (${SHIFTS.length + seedShiftAssignments.length} total)`);

// ── Tasks ──────────────────────────────────────────────────────────────────────
const { error: taskErr } = await supabase.from('tasks').upsert([
	// Already in seed (kept for reference, re-upserted for idempotency)
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
		due_time: '2026-04-18T12:00:00+00:00',
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
		due_time: '2026-04-19T09:00:00+00:00',
		assignee_id: DIANNE,
		complete: true,
		completed_by: DIANNE,
		completed_at: '2026-04-19T08:45:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-15T14:00:00+00:00'
	},
	// New tasks
	{
		id: '00000000-0000-0000-0003-000000000005',
		patient_id: PATIENT_ID,
		description: 'Print 30-day blood pressure log for Dr. Smith appointment',
		due_time: '2026-04-22T11:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: DIANNE,
		created_at: '2026-04-18T09:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000006',
		patient_id: PATIENT_ID,
		description: 'Schedule monthly family video call with Dianne and cousins',
		due_time: '2026-04-25T17:00:00+00:00',
		assignee_id: DIANNE,
		complete: false,
		created_by: DIANNE,
		created_at: '2026-04-18T09:15:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000007',
		patient_id: PATIENT_ID,
		description: 'Check and replace smoke detector batteries',
		due_time: '2026-04-21T17:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: DIANNE,
		created_at: '2026-04-17T11:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000008',
		patient_id: PATIENT_ID,
		description: 'Refill hand soap and shampoo in the main bathroom',
		due_time: '2026-04-20T12:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: DIANNE,
		created_at: '2026-04-18T07:30:00+00:00'
	},
	// Completed tasks — different caregivers, shows "completed by X" in UI
	{
		id: '00000000-0000-0000-0003-000000000009',
		patient_id: PATIENT_ID,
		description: 'Assist Joyce with morning hygiene and dressing',
		due_time: '2026-04-17T13:00:00+00:00',
		assignee_id: PEGGY,
		complete: true,
		completed_by: PEGGY,
		completed_at: '2026-04-17T13:20:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-16T20:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000010',
		patient_id: PATIENT_ID,
		description: 'Log evening blood glucose and blood pressure readings',
		due_time: '2026-04-16T22:00:00+00:00',
		assignee_id: CATHY,
		complete: true,
		completed_by: CATHY,
		completed_at: '2026-04-16T21:45:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-15T18:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000011',
		patient_id: PATIENT_ID,
		description: 'Grocery run — milk, eggs, yogurt, decaf, cream',
		due_time: '2026-04-15T16:00:00+00:00',
		assignee_id: LINDA,
		complete: true,
		completed_by: LINDA,
		completed_at: '2026-04-15T15:30:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-14T10:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000012',
		patient_id: PATIENT_ID,
		description: "Wash and fold Joyce's laundry",
		due_time: '2026-04-14T16:00:00+00:00',
		assignee_id: KELSEY,
		complete: true,
		completed_by: KELSEY,
		completed_at: '2026-04-14T15:10:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-13T09:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0003-000000000013',
		patient_id: PATIENT_ID,
		description: 'Walk with Joyce around the block — 15 min',
		due_time: '2026-04-19T15:00:00+00:00',
		assignee_id: LINDA,
		complete: true,
		completed_by: LINDA,
		completed_at: '2026-04-19T14:50:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-19T08:00:00+00:00'
	},
	// ── Arturo Ramos tasks (Linda is sole caregiver + coordinator) ──────────
	{
		id: '00000000-0000-0000-0006-000000000001',
		patient_id: PATIENT_ID_2,
		description: 'Pick up carbidopa-levodopa refill at Walgreens (Prescription #7712)',
		due_time: '2026-04-21T17:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: LINDA,
		created_at: '2026-04-18T14:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0006-000000000002',
		patient_id: PATIENT_ID_2,
		description: 'Schedule 6-month neurologist follow-up with Dr. Okafor — (555) 881-2034',
		due_time: '2026-04-22T17:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: LINDA,
		created_at: '2026-04-18T14:05:00+00:00'
	},
	{
		id: '00000000-0000-0000-0006-000000000003',
		patient_id: PATIENT_ID_2,
		description: 'Apply diclofenac gel to both knees — morning and evening',
		due_time: '2026-04-18T22:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: LINDA,
		created_at: '2026-04-18T11:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0006-000000000004',
		patient_id: PATIENT_ID_2,
		description: 'Install non-slip mat in the shower and check bathroom grab bar',
		due_time: '2026-04-23T17:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: LINDA,
		created_at: '2026-04-17T09:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0006-000000000005',
		patient_id: PATIENT_ID_2,
		description: "Grocery run — bananas, yogurt, eggs, soft bread, Arturo's decaf",
		due_time: '2026-04-20T16:00:00+00:00',
		assignee_id: LINDA,
		complete: false,
		created_by: LINDA,
		created_at: '2026-04-18T18:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0006-000000000006',
		patient_id: PATIENT_ID_2,
		description: "Refill Arturo's weekly pill organizer (Mon–Sun, 3 doses/day)",
		due_time: '2026-04-19T12:00:00+00:00',
		assignee_id: LINDA,
		complete: true,
		completed_by: LINDA,
		completed_at: '2026-04-19T11:30:00+00:00',
		created_by: LINDA,
		created_at: '2026-04-17T20:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0006-000000000007',
		patient_id: PATIENT_ID_2,
		description: 'Drive Arturo to physical therapy session',
		due_time: '2026-04-17T14:00:00+00:00',
		assignee_id: LINDA,
		complete: true,
		completed_by: LINDA,
		completed_at: '2026-04-17T15:30:00+00:00',
		created_by: LINDA,
		created_at: '2026-04-16T10:00:00+00:00'
	},
], { onConflict: 'id' });
if (taskErr) { console.error('tasks:', taskErr.message); process.exit(1); }
console.log('✓ tasks (20 total)');

// ── Notes ──────────────────────────────────────────────────────────────────────
const { error: noteErr } = await supabase.from('notes').upsert([
	// Existing
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
	},
	// New notes
	{
		id: '00000000-0000-0000-0005-000000000004',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: PEGGY,
		content: "Glucose was 158 this morning before breakfast — a little high. She had a bigger dinner last night apparently. Gave metformin as usual. Will monitor at lunch.",
		created_at: '2026-04-18T13:10:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000005',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: CATHY,
		content: "Joyce was confused about what day it was this evening — kept asking if it was Sunday. Redirected with her photo album and she settled down well. No agitation.",
		created_at: '2026-04-16T22:30:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000006',
		patient_id: PATIENT_ID,
		task_id: '00000000-0000-0000-0003-000000000011',
		author_id: LINDA,
		content: 'Got everything on the list. Also grabbed some decaf chamomile tea since she mentioned liking it. Receipt is in the kitchen drawer.',
		created_at: '2026-04-15T15:45:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000007',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: KELSEY,
		content: 'Monday morning shift went smoothly. Joyce was talkative and mentioned her grandson is visiting next month — seemed happy about it. BP 122/76, glucose 131.',
		created_at: '2026-04-13T16:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000008',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: LINDA,
		content: "She didn't want to take her lisinopril this morning — said it makes her feel dizzy. I encouraged her and she eventually took it with a full glass of water. May be worth mentioning to Dr. Smith.",
		created_at: '2026-04-16T13:30:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000009',
		patient_id: PATIENT_ID,
		task_id: '00000000-0000-0000-0003-000000000005',
		author_id: PEGGY,
		content: "Printed the BP log from the spreadsheet Dianne shared. 30 days, formatted and ready. Left it in the folder on the kitchen counter.",
		created_at: '2026-04-18T14:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000010',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: DIANNE,
		content: 'Spoke with Joyce\'s daughter Dianne this afternoon. She\'s planning to attend the Dr. Smith appointment on the 22nd. Please make sure Joyce is dressed and ready by 1:30pm.',
		created_at: '2026-04-18T11:00:00+00:00'
	},
], { onConflict: 'id' });
if (noteErr) { console.error('notes:', noteErr.message); process.exit(1); }
console.log('✓ notes (10 total)');

console.log('\nSign in at http://localhost:5173 with password: password123');
console.log('  Coordinator: dianne@demo.com');
console.log('  Caregiver:   linda@demo.com');
console.log('  Caregiver:   cathy@demo.com');
console.log('  Caregiver:   peggy@demo.com');
console.log('  Caregiver:   kelsey@demo.com');
