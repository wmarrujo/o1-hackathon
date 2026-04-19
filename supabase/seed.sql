-- =============================================================================
-- Demo Seed Data
-- Only contains data that doesn't depend on auth.users. The auth users, their
-- public.users rows, and user_roles are created by scripts/seed-auth-users.js
-- (which uses the Supabase admin API — seeding auth via raw SQL is fragile).
-- =============================================================================

-- Patient (disable trigger so auth.uid() null doesn't break the seed)
alter table public.patients disable trigger trg_assign_coordinator_on_patient_create;

insert into public.patients (id, full_name, dob, emergency_contact, notes)
values (
  '00000000-0000-0000-0000-000000000010',
  'Eleanor Rigby',
  '1942-03-15',
  'Father McKenzie — (555) 867-5309',
  'Prefers morning visits. Allergic to penicillin.'
);

alter table public.patients enable trigger trg_assign_coordinator_on_patient_create;
