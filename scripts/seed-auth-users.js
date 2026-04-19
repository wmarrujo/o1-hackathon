#!/usr/bin/env node
// Creates demo auth users via Supabase's admin API, then inserts matching
// public.users, user_roles, schedule shifts, tasks, and notes.
// Run after `supabase db reset`.
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

// ── IDs ────────────────────────────────────────────────────────────────────────
const PATIENT_ID = '00000000-0000-0000-0000-000000000010';

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
	{ id: '00000000-0000-0000-0001-000000000014', title: 'Morning Care Shift', dtstart: '2026-04-19 12:00:00+00', dtend: '2026-04-19 16:00:00+00', assignee: KELSEY, notes: 'Sunday routine — Joyce likes hymns on the radio in the morning.' },
	{ id: '00000000-0000-0000-0001-000000000015', title: 'Evening Care Shift', dtstart: '2026-04-19 21:00:00+00', dtend: '2026-04-19 23:00:00+00', assignee: CATHY,  notes: null },

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
	{ id: '00000000-0000-0000-0001-000000000026', title: 'Morning Care Shift', dtstart: '2026-04-25 12:00:00+00', dtend: '2026-04-25 16:00:00+00', assignee: CATHY,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000027', title: 'Evening Care Shift', dtstart: '2026-04-25 21:00:00+00', dtend: '2026-04-25 23:00:00+00', assignee: KELSEY, notes: null },
	// Apr 26 Sun
	{ id: '00000000-0000-0000-0001-000000000028', title: 'Morning Care Shift', dtstart: '2026-04-26 12:00:00+00', dtend: '2026-04-26 16:00:00+00', assignee: PEGGY,  notes: null },
	{ id: '00000000-0000-0000-0001-000000000029', title: 'Evening Care Shift', dtstart: '2026-04-26 21:00:00+00', dtend: '2026-04-26 23:00:00+00', assignee: LINDA,  notes: null },
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
	{ id: '00000000-0000-0000-0001-000000000002', assigned_user_id: LINDA  },
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
	},
	// New tasks
	{
		id: '00000000-0000-0000-0003-000000000005',
		patient_id: PATIENT_ID,
		description: 'Print 30-day blood pressure log for Dr. Smith appointment',
		due_time: '2026-04-22T11:00:00+00:00',
		assignee_id: PEGGY,
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
		assignee_id: CATHY,
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
		due_time: '2026-04-18T15:00:00+00:00',
		assignee_id: LINDA,
		complete: true,
		completed_by: LINDA,
		completed_at: '2026-04-18T14:50:00+00:00',
		created_by: DIANNE,
		created_at: '2026-04-18T08:00:00+00:00'
	},
], { onConflict: 'id' });
if (taskErr) { console.error('tasks:', taskErr.message); process.exit(1); }
console.log('✓ tasks (13 total)');

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
		created_at: '2026-04-19T14:00:00+00:00'
	},
	{
		id: '00000000-0000-0000-0005-000000000010',
		patient_id: PATIENT_ID,
		task_id: null,
		author_id: DIANNE,
		content: 'Spoke with Joyce\'s daughter Dianne this afternoon. She\'s planning to attend the Dr. Smith appointment on the 22nd. Please make sure Joyce is dressed and ready by 1:30pm.',
		created_at: '2026-04-19T11:00:00+00:00'
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
