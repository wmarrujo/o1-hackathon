-- =============================================================================
-- Demo Seed Data — Joyce Henderson
-- Only contains data that doesn't depend on auth.users. The auth users, their
-- public.users rows, and user_roles are created by scripts/seed-auth-users.js
-- (which uses the Supabase admin API — seeding auth via raw SQL is fragile).
-- =============================================================================

-- Patient
alter table public.patients disable trigger trg_assign_coordinator_on_patient_create;

insert into public.patients (id, full_name, dob, emergency_contact, family_contact, notes)
values (
  '00000000-0000-0000-0000-000000000010',
  'Joyce Henderson',
  '1941-08-22',
  'Dianne Henderson (daughter) — (555) 234-8765',
  'Dianne Henderson — (555) 234-8765',
  'Allergic to sulfa drugs. Prefers morning routine before 9am. Mild dementia — responds well to familiar faces and music from the 1960s. Diabetic — check blood sugar before meals. Likes her coffee with cream, no sugar.'
),
(
  '00000000-0000-0000-0000-000000000011',
  'Arturo Ramos',
  '1952-03-15',
  'Maria Ramos (wife) — (555) 412-9087',
  'Sofia Ramos (daughter) — (555) 412-3321',
  'Spanish is his primary language — he understands English but prefers Spanish. Parkinson''s disease — tremors worse in the morning before medication. Uses a walker. Loves telenovelas and coffee with two sugars. Do NOT give acetaminophen (liver concern).'
)
on conflict (id) do nothing;

alter table public.patients enable trigger trg_assign_coordinator_on_patient_create;

-- Health conditions (no user FKs)
insert into public.health_conditions (id, patient_id, name, description, diagnosed_at)
values
  ('00000000-0000-0000-0002-000000000001',
   '00000000-0000-0000-0000-000000000010',
   'Type 2 Diabetes',
   'Managed with metformin 500mg twice daily. Check blood glucose before each meal and at bedtime. Target range 80–180 mg/dL. Contact Dianne immediately if reading is below 70 or above 300.',
   '2008-03-01'),
  ('00000000-0000-0000-0002-000000000002',
   '00000000-0000-0000-0000-000000000010',
   'Hypertension',
   'Managed with lisinopril 10mg once daily (morning). Monitor blood pressure twice a day — morning before medications and evening before dinner. Target below 130/80.',
   '2012-11-15'),
  ('00000000-0000-0000-0002-000000000003',
   '00000000-0000-0000-0000-000000000010',
   'Mild Cognitive Impairment',
   'Early-stage dementia. Familiar routines and faces help with orientation. May become confused or agitated in the late afternoon (sundowning). Do not leave unattended near the stove. Use simple, short sentences and allow extra time for responses.',
   '2023-06-10'),
  ('00000000-0000-0000-0002-000000000004',
   '00000000-0000-0000-0000-000000000011',
   'Parkinson''s Disease',
   'Diagnosed stage 2. Managed with carbidopa-levodopa 25-100mg three times daily (8am, 1pm, 6pm). Tremor and rigidity worst first thing in the morning before the 8am dose — allow extra time for breakfast and dressing. Requires walker for all ambulation. Call Sofia if he falls or refuses medication.',
   '2019-09-12'),
  ('00000000-0000-0000-0002-000000000005',
   '00000000-0000-0000-0000-000000000011',
   'Osteoarthritis (knees)',
   'Bilateral knee osteoarthritis. Topical diclofenac gel as needed for pain — apply to knees twice daily. AVOID acetaminophen (liver concern from prior hepatitis). Gentle range-of-motion exercises in the morning help with stiffness.',
   '2016-04-22')
on conflict (id) do nothing;

-- Schedule events (assigned_user_id left null — set by seed-auth-users.js after users exist)
insert into public.schedule_events (id, patient_id, assigned_user_id, ics_uid, title, event_type, dtstart, dtend, rrule, status, additional_notes)
values
  ('00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0000-000000000010',
   null,
   'morning-shift-joyce-2026@salus',
   'Morning Care Shift',
   'shift',
   '2026-04-18 08:00:00+00',
   '2026-04-18 12:00:00+00',
   'FREQ=DAILY',
   'CONFIRMED',
   'Check blood glucose and BP first thing. Joyce prefers NPR on the radio during breakfast.'),
  ('00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0000-000000000010',
   null,
   'evening-shift-joyce-2026@salus',
   'Evening Care Shift',
   'shift',
   '2026-04-18 17:00:00+00',
   '2026-04-18 20:00:00+00',
   'FREQ=DAILY',
   'CONFIRMED',
   'Joyce tends to be more confused in the evening. Keep lights bright and routine consistent.'),
  ('00000000-0000-0000-0001-000000000003',
   '00000000-0000-0000-0000-000000000010',
   null,
   'dr-smith-appt-20260422@salus',
   'Dr. Smith — Primary Care Checkup',
   'appointment',
   '2026-04-22 14:00:00+00',
   '2026-04-22 15:00:00+00',
   null,
   'CONFIRMED',
   'Quarterly checkup. Bring the printed medication list and the blood pressure log from the past month. Dr. Smith office: (555) 310-4400.')
on conflict (id) do nothing;

-- Checklist items for morning shift
insert into public.checklist_items (id, event_id, description, category, done)
values
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001', 'Check blood glucose before breakfast', 'medication', false),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0001-000000000001', 'Administer metformin 500mg with breakfast', 'medication', false),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0001-000000000001', 'Administer lisinopril 10mg', 'medication', false),
  ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0001-000000000001', 'Check blood pressure (log the reading)', 'general', false),
  ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0001-000000000001', 'Prepare and serve breakfast', 'general', false),
  ('00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0001-000000000001', 'Assist with morning hygiene (shower or wash, dress)', 'general', false),
  ('00000000-0000-0000-0004-000000000007', '00000000-0000-0000-0001-000000000001', 'Morning walk — 15–20 min if weather permits', 'general', false)
on conflict (id) do nothing;

-- Checklist items for evening shift
insert into public.checklist_items (id, event_id, description, category, done)
values
  ('00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0001-000000000002', 'Check blood glucose before dinner', 'medication', false),
  ('00000000-0000-0000-0004-000000000009', '00000000-0000-0000-0001-000000000002', 'Administer metformin 500mg with dinner', 'medication', false),
  ('00000000-0000-0000-0004-000000000010', '00000000-0000-0000-0001-000000000002', 'Check blood pressure (log the reading)', 'general', false),
  ('00000000-0000-0000-0004-000000000011', '00000000-0000-0000-0001-000000000002', 'Prepare and serve dinner', 'general', false),
  ('00000000-0000-0000-0004-000000000012', '00000000-0000-0000-0001-000000000002', 'Ensure Joyce is settled and comfortable before leaving', 'general', false)
on conflict (id) do nothing;
