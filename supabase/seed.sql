-- =============================================================================
-- Demo Seed Data
-- Creates two coordinators, one caregiver, and one patient for demo purposes.
-- Passwords are all: password123
-- =============================================================================

-- Auth users (bypasses email confirmation)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'alice@demo.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
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
    'bob@demo.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
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
    'maria@demo.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    now(),
    now()
  );

-- Auth identities (required for password login)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'alice@demo.com', 'email', '{"sub":"00000000-0000-0000-0000-000000000001","email":"alice@demo.com"}', now(), now(), now()),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000002', 'bob@demo.com',   'email', '{"sub":"00000000-0000-0000-0000-000000000002","email":"bob@demo.com"}',   now(), now(), now()),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000003', 'maria@demo.com', 'email', '{"sub":"00000000-0000-0000-0000-000000000003","email":"maria@demo.com"}', now(), now(), now());

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
