-- =============================================================================
-- Care Coordinator — Initial Migration
-- Generated: 2026-04-18
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

create extension if not exists "uuid-ossp";


-- =============================================================================
-- ENUMS
-- =============================================================================

create type user_role as enum ('coordinator', 'caregiver', 'gov_coordinator');

create type event_type as enum ('shift', 'appointment', 'medication', 'other');

create type ics_status as enum ('TENTATIVE', 'CONFIRMED', 'CANCELLED');

create type checklist_category as enum ('medication', 'appointment', 'reminder', 'general');

create type treatment_type as enum ('medication', 'therapy', 'procedure', 'lifestyle', 'other');

create type trend_status as enum ('stable', 'improving', 'worsening', 'critical');

create type check_in_type as enum ('start_of_shift', 'end_of_shift', 'remote');


-- =============================================================================
-- TABLES
-- =============================================================================

-- Users (mirrors Supabase auth.users via id)
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  preferred_language text not null default 'en',
  created_at    timestamptz not null default now()
);
comment on table public.users is 'App-level user profiles, linked to Supabase auth.';

-- Patients
create table public.patients (
  id                uuid primary key default uuid_generate_v4(),
  full_name         text not null,
  dob               date,
  emergency_contact text,
  family_contact    text,
  notes             text,
  created_at        timestamptz not null default now()
);
comment on table public.patients is 'People receiving care. Access is controlled via user_roles.';

-- User ↔ Patient roles
create table public.user_roles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  patient_id  uuid not null references public.patients(id) on delete cascade,
  role        user_role not null,
  created_at  timestamptz not null default now(),
  unique (user_id, patient_id)
);
comment on table public.user_roles is 'Assigns a role to a user for a specific patient. This is the RLS access key.';

-- Schedule events (ICS-compatible)
create table public.schedule_events (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references public.patients(id) on delete cascade,
  assigned_user_id uuid references public.users(id) on delete set null,
  ics_uid          text not null unique default (uuid_generate_v4()::text || '@carecoordinator.app'),
  title            text not null,
  event_type       event_type not null default 'shift',
  dtstart          timestamptz not null,
  dtend            timestamptz not null,
  rrule            text,       -- e.g. FREQ=WEEKLY;BYDAY=MO,WE
  status           ics_status not null default 'CONFIRMED',
  medication       text,
  additional_notes text,
  created_at       timestamptz not null default now(),
  constraint dtend_after_dtstart check (dtend > dtstart)
);
comment on table public.schedule_events is 'Shifts, appointments, and recurring events. ICS fields allow calendar export/import.';

-- Checklist items (attached to a schedule event)
create table public.checklist_items (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid not null references public.schedule_events(id) on delete cascade,
  completed_by uuid references public.users(id) on delete set null,
  description  text not null,
  category     checklist_category not null default 'general',
  done         boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
comment on table public.checklist_items is 'Task items within a scheduled event. Caregivers tick these done during a shift.';

-- Health conditions
create table public.health_conditions (
  id            uuid primary key default uuid_generate_v4(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  name          text not null,
  description   text,
  ai_summary    text,       -- AI-generated, refreshed by Edge Function
  diagnosed_at  timestamptz,
  created_at    timestamptz not null default now()
);
comment on table public.health_conditions is 'Medical conditions for a patient. AI summary is generated asynchronously.';

-- Treatments (linked to a condition)
create table public.treatments (
  id                  uuid primary key default uuid_generate_v4(),
  condition_id        uuid not null references public.health_conditions(id) on delete cascade,
  name                text not null,
  type                treatment_type not null default 'other',
  description         text,
  research_report_url text,
  grant_info          text,
  support_group_url   text,
  created_at          timestamptz not null default now()
);
comment on table public.treatments is 'Treatment options for a condition, including research links and grants.';

-- Condition metrics / biometrics
create table public.condition_metrics (
  id            uuid primary key default uuid_generate_v4(),
  condition_id  uuid not null references public.health_conditions(id) on delete cascade,
  recorded_by   uuid references public.users(id) on delete set null,
  metric_name   text not null,       -- e.g. 'blood_pressure_systolic'
  value         numeric not null,
  unit          text not null,       -- e.g. 'mmHg', 'bpm', 'kg'
  trend_status  trend_status not null default 'stable',
  recorded_at   timestamptz not null default now()
);
comment on table public.condition_metrics is 'Time-series biometric readings logged by caregivers.';

-- Health documents
create table public.health_documents (
  id            uuid primary key default uuid_generate_v4(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  uploaded_by   uuid references public.users(id) on delete set null,
  file_name     text not null,
  file_url      text not null,       -- Supabase Storage URL
  document_type text,
  uploaded_at   timestamptz not null default now()
);
comment on table public.health_documents is 'Health-related files stored in Supabase Storage.';

-- Chores (recurring task templates)
create table public.chores (
  id          uuid primary key default uuid_generate_v4(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  title       text not null,
  description text,
  video_url   text,
  criteria    text,
  rrule       text,       -- e.g. FREQ=DAILY for daily chores
  created_at  timestamptz not null default now()
);
comment on table public.chores is 'Reusable chore templates assigned to a patient. rrule drives recurrence.';

-- Chore completions
create table public.chore_completions (
  id           uuid primary key default uuid_generate_v4(),
  chore_id     uuid not null references public.chores(id) on delete cascade,
  completed_by uuid references public.users(id) on delete set null,
  notes        text,
  completed_at timestamptz not null default now()
);
comment on table public.chore_completions is 'Log of each time a caregiver completed a chore.';

-- Check-ins (start/end of shift or remote family check-in)
create table public.check_ins (
  id                 uuid primary key default uuid_generate_v4(),
  patient_id         uuid not null references public.patients(id) on delete cascade,
  user_id            uuid references public.users(id) on delete set null,
  check_in_type      check_in_type not null,
  has_moved_today    boolean,
  health_status_note text,
  ai_summary         text,        -- AI-generated end-of-shift summary
  ai_missed_items    text,        -- AI-detected items not completed
  ai_future_issues   text,        -- AI-predicted upcoming concerns
  created_at         timestamptz not null default now()
);
comment on table public.check_ins is 'Shift check-ins submitted by caregivers. AI fields populated by Edge Function post-insert.';


-- =============================================================================
-- INDEXES
-- =============================================================================

create index on public.user_roles (user_id);
create index on public.user_roles (patient_id);
create index on public.schedule_events (patient_id);
create index on public.schedule_events (assigned_user_id);
create index on public.schedule_events (dtstart);
create index on public.checklist_items (event_id);
create index on public.health_conditions (patient_id);
create index on public.condition_metrics (condition_id, recorded_at desc);
create index on public.chores (patient_id);
create index on public.chore_completions (chore_id);
create index on public.check_ins (patient_id, created_at desc);


-- =============================================================================
-- TRIGGER: auto-assign coordinator role on patient creation
-- When a coordinator inserts a patient, no user_roles row exists yet so
-- has_role() would return false for all subsequent RLS checks on that patient.
-- This trigger runs AFTER INSERT on patients (as security definer, bypassing
-- RLS) and immediately creates the coordinator role row for the creating user.
-- =============================================================================

create or replace function public.assign_coordinator_on_patient_create()
returns trigger
language plpgsql
security definer  -- runs as the function owner, bypasses RLS on user_roles
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, patient_id, role)
  values (auth.uid(), new.id, 'coordinator');
  return new;
end;
$$;

create trigger trg_assign_coordinator_on_patient_create
after insert on public.patients
for each row
execute function public.assign_coordinator_on_patient_create();


-- =============================================================================
-- HELPER FUNCTION
-- Returns true if the calling user has the given role for the given patient.
-- Used in every RLS policy below.
-- =============================================================================

create or replace function public.has_role(p_patient_id uuid, p_role user_role)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id   = auth.uid()
      and patient_id = p_patient_id
      and role       = p_role
  );
$$;

-- Convenience: true if user is coordinator OR caregiver for this patient
create or replace function public.has_any_role(p_patient_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id    = auth.uid()
      and patient_id = p_patient_id
      and role       in ('coordinator', 'caregiver')
  );
$$;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.users              enable row level security;
alter table public.patients           enable row level security;
alter table public.user_roles         enable row level security;
alter table public.schedule_events    enable row level security;
alter table public.checklist_items    enable row level security;
alter table public.health_conditions  enable row level security;
alter table public.treatments         enable row level security;
alter table public.condition_metrics  enable row level security;
alter table public.health_documents   enable row level security;
alter table public.chores             enable row level security;
alter table public.chore_completions  enable row level security;
alter table public.check_ins          enable row level security;


-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------

-- Everyone can read profiles of users they share a patient with
create policy "users: read shared"
on public.users for select
using (
  id = auth.uid()
  or exists (
    select 1 from public.user_roles ur1
    join public.user_roles ur2 on ur1.patient_id = ur2.patient_id
    where ur1.user_id = auth.uid()
      and ur2.user_id = public.users.id
  )
);

-- Users can update only their own profile
create policy "users: update own"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());


-- -----------------------------------------------------------------------------
-- patients
-- -----------------------------------------------------------------------------

create policy "patients: any role can read"
on public.patients for select
using (public.has_any_role(id));

-- Any authenticated user can create a patient. The trigger above immediately
-- inserts a coordinator role for auth.uid(), so all subsequent RLS checks work.
create policy "patients: authenticated can insert"
on public.patients for insert
with check (auth.uid() is not null);

create policy "patients: coordinator can update"
on public.patients for update
using (public.has_role(id, 'coordinator'))
with check (public.has_role(id, 'coordinator'));


-- -----------------------------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------------------------

create policy "user_roles: read own assignments"
on public.user_roles for select
using (
  user_id = auth.uid()
  or public.has_role(patient_id, 'coordinator')
);

create policy "user_roles: coordinator can insert"
on public.user_roles for insert
with check (public.has_role(patient_id, 'coordinator'));

create policy "user_roles: coordinator can delete"
on public.user_roles for delete
using (public.has_role(patient_id, 'coordinator'));


-- -----------------------------------------------------------------------------
-- schedule_events
-- -----------------------------------------------------------------------------

create policy "schedule_events: any role can read"
on public.schedule_events for select
using (public.has_any_role(patient_id));

create policy "schedule_events: coordinator can insert"
on public.schedule_events for insert
with check (public.has_role(patient_id, 'coordinator'));

create policy "schedule_events: coordinator can update"
on public.schedule_events for update
using (public.has_role(patient_id, 'coordinator'))
with check (public.has_role(patient_id, 'coordinator'));

create policy "schedule_events: coordinator can delete"
on public.schedule_events for delete
using (public.has_role(patient_id, 'coordinator'));


-- -----------------------------------------------------------------------------
-- checklist_items
-- Caregivers can only flip done + completed_at. Coordinators have full access.
-- -----------------------------------------------------------------------------

create policy "checklist_items: any role can read"
on public.checklist_items for select
using (
  exists (
    select 1 from public.schedule_events se
    where se.id = checklist_items.event_id
      and public.has_any_role(se.patient_id)
  )
);

create policy "checklist_items: coordinator can insert"
on public.checklist_items for insert
with check (
  exists (
    select 1 from public.schedule_events se
    where se.id = checklist_items.event_id
      and public.has_role(se.patient_id, 'coordinator')
  )
);

-- Coordinator: full update
create policy "checklist_items: coordinator can update"
on public.checklist_items for update
using (
  exists (
    select 1 from public.schedule_events se
    where se.id = checklist_items.event_id
      and public.has_role(se.patient_id, 'coordinator')
  )
);

-- Caregiver: only tick done (enforced at app layer; RLS allows the row)
create policy "checklist_items: caregiver can tick done"
on public.checklist_items for update
using (
  exists (
    select 1 from public.schedule_events se
    where se.id = checklist_items.event_id
      and public.has_role(se.patient_id, 'caregiver')
  )
)
with check (
  exists (
    select 1 from public.schedule_events se
    where se.id = checklist_items.event_id
      and public.has_role(se.patient_id, 'caregiver')
  )
);

create policy "checklist_items: coordinator can delete"
on public.checklist_items for delete
using (
  exists (
    select 1 from public.schedule_events se
    where se.id = checklist_items.event_id
      and public.has_role(se.patient_id, 'coordinator')
  )
);


-- -----------------------------------------------------------------------------
-- health_conditions
-- -----------------------------------------------------------------------------

create policy "health_conditions: any role can read"
on public.health_conditions for select
using (public.has_any_role(patient_id));

create policy "health_conditions: coordinator can insert"
on public.health_conditions for insert
with check (public.has_role(patient_id, 'coordinator'));

create policy "health_conditions: coordinator can update"
on public.health_conditions for update
using (public.has_role(patient_id, 'coordinator'))
with check (public.has_role(patient_id, 'coordinator'));


-- -----------------------------------------------------------------------------
-- treatments
-- -----------------------------------------------------------------------------

create policy "treatments: any role can read"
on public.treatments for select
using (
  exists (
    select 1 from public.health_conditions hc
    where hc.id = treatments.condition_id
      and public.has_any_role(hc.patient_id)
  )
);

create policy "treatments: coordinator can insert"
on public.treatments for insert
with check (
  exists (
    select 1 from public.health_conditions hc
    where hc.id = treatments.condition_id
      and public.has_role(hc.patient_id, 'coordinator')
  )
);

create policy "treatments: coordinator can update"
on public.treatments for update
using (
  exists (
    select 1 from public.health_conditions hc
    where hc.id = treatments.condition_id
      and public.has_role(hc.patient_id, 'coordinator')
  )
);


-- -----------------------------------------------------------------------------
-- condition_metrics
-- -----------------------------------------------------------------------------

create policy "condition_metrics: any role can read"
on public.condition_metrics for select
using (
  exists (
    select 1 from public.health_conditions hc
    where hc.id = condition_metrics.condition_id
      and public.has_any_role(hc.patient_id)
  )
);

-- Both roles can log metrics (caregivers record biometrics during shifts)
create policy "condition_metrics: any role can insert"
on public.condition_metrics for insert
with check (
  exists (
    select 1 from public.health_conditions hc
    where hc.id = condition_metrics.condition_id
      and public.has_any_role(hc.patient_id)
  )
);

-- No updates or deletes — metrics are an append-only log


-- -----------------------------------------------------------------------------
-- health_documents
-- -----------------------------------------------------------------------------

create policy "health_documents: any role can read"
on public.health_documents for select
using (public.has_any_role(patient_id));

create policy "health_documents: coordinator can insert"
on public.health_documents for insert
with check (public.has_role(patient_id, 'coordinator'));

create policy "health_documents: coordinator can delete"
on public.health_documents for delete
using (public.has_role(patient_id, 'coordinator'));


-- -----------------------------------------------------------------------------
-- chores
-- -----------------------------------------------------------------------------

create policy "chores: any role can read"
on public.chores for select
using (public.has_any_role(patient_id));

create policy "chores: coordinator can insert"
on public.chores for insert
with check (public.has_role(patient_id, 'coordinator'));

create policy "chores: coordinator can update"
on public.chores for update
using (public.has_role(patient_id, 'coordinator'))
with check (public.has_role(patient_id, 'coordinator'));

create policy "chores: coordinator can delete"
on public.chores for delete
using (public.has_role(patient_id, 'coordinator'));


-- -----------------------------------------------------------------------------
-- chore_completions
-- -----------------------------------------------------------------------------

create policy "chore_completions: any role can read"
on public.chore_completions for select
using (
  exists (
    select 1 from public.chores c
    where c.id = chore_completions.chore_id
      and public.has_any_role(c.patient_id)
  )
);

-- Only caregivers log completions
create policy "chore_completions: caregiver can insert"
on public.chore_completions for insert
with check (
  exists (
    select 1 from public.chores c
    where c.id = chore_completions.chore_id
      and public.has_role(c.patient_id, 'caregiver')
  )
);

-- No updates or deletes — completions are an immutable log


-- -----------------------------------------------------------------------------
-- check_ins
-- -----------------------------------------------------------------------------

create policy "check_ins: any role can read"
on public.check_ins for select
using (public.has_any_role(patient_id));

-- Only caregivers submit check-ins
create policy "check_ins: caregiver can insert"
on public.check_ins for insert
with check (public.has_role(patient_id, 'caregiver'));

-- No updates after submit — AI fields are written by service role in Edge Function
-- No deletes
