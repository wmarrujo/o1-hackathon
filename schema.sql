-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Patients table
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  date_of_birth date,
  notes text,
  created_at timestamptz not null default now()
);

-- Members joining table: links auth users to patients with role
create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  coordinator boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, patient_id)
);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  description text not null,
  start_time timestamptz,
  due_time timestamptz,
  assignee_id uuid references auth.users(id) on delete set null,
  location text,
  repeat text check (repeat in ('daily', 'weekly', 'monthly')),
  complete boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- Notes table
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table patients enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;

-- Members: users can see their own memberships
create policy "members: own rows" on members
  for select using (auth.uid() = user_id);

-- Members: coordinators can insert/delete members for their patients
create policy "members: coordinator insert" on members
  for insert with check (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = members.patient_id
        and m.coordinator = true
    )
  );

create policy "members: coordinator delete" on members
  for delete using (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = members.patient_id
        and m.coordinator = true
    )
  );

-- Patients: visible to members
create policy "patients: member select" on patients
  for select using (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = patients.id
    )
  );

-- Patients: coordinators can insert/update
create policy "patients: coordinator insert" on patients
  for insert with check (true); -- seeded by admin; can lock down further

create policy "patients: coordinator update" on patients
  for update using (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = patients.id
        and m.coordinator = true
    )
  );

-- Tasks: visible to members
create policy "tasks: member select" on tasks
  for select using (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = tasks.patient_id
    )
  );

-- Tasks: members can insert/update/delete
create policy "tasks: member insert" on tasks
  for insert with check (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = tasks.patient_id
    )
  );

create policy "tasks: member update" on tasks
  for update using (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = tasks.patient_id
    )
  );

create policy "tasks: member delete" on tasks
  for delete using (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = tasks.patient_id
    )
  );

-- Notes: visible to members
create policy "notes: member select" on notes
  for select using (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = notes.patient_id
    )
  );

create policy "notes: member insert" on notes
  for insert with check (
    exists (
      select 1 from members m
      where m.user_id = auth.uid()
        and m.patient_id = notes.patient_id
    )
  );

create policy "notes: author delete" on notes
  for delete using (auth.uid() = author_id);

-- Helper view: user profiles from auth.users
create or replace view user_profiles as
  select id, email, raw_user_meta_data->>'full_name' as full_name
  from auth.users;

grant select on user_profiles to authenticated;
