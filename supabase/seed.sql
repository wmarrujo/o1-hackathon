-- =============================================================================
-- Demo Seed Data
-- Creates two coordinators, one caregiver, and one patient for demo purposes.
-- Passwords are all: password123
-- =============================================================================

-- Auth users (bypasses email confirmation)
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'alice@demo.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'bob@demo.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'maria@demo.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    now(),
    now()
  );

-- App-level user profiles
insert into public.users (id, full_name, email, preferred_language)
values
  ('00000000-0000-0000-0000-000000000001', 'Alice Coordinator', 'alice@demo.com', 'en'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Coordinator',   'bob@demo.com',   'en'),
  ('00000000-0000-0000-0000-000000000003', 'Maria Caregiver',   'maria@demo.com', 'es');

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

-- Roles: both Alices/Bobs are coordinators, Maria is a caregiver
insert into public.user_roles (user_id, patient_id, role)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'coordinator'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'coordinator'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'caregiver');
