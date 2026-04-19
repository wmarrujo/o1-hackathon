-- =============================================================================
-- Tasks and Notes — CareTrack checklist app
-- =============================================================================

-- Tasks: standalone to-do items for a patient (simpler than schedule_events)
create table public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  description  text not null,
  start_time   timestamptz,
  due_time     timestamptz,
  assignee_id  uuid references public.users(id) on delete set null,
  location     text,
  repeat       text check (repeat in ('daily', 'weekly', 'monthly')),
  complete     boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.users(id) on delete set null
);

create index on public.tasks (patient_id);
create index on public.tasks (due_time);

-- Notes: freestanding or task-linked notes for a patient
create table public.notes (
  id         uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  task_id    uuid references public.tasks(id) on delete set null,
  author_id  uuid not null references public.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index on public.notes (patient_id, created_at desc);

-- RLS
alter table public.tasks enable row level security;
alter table public.notes enable row level security;

-- Tasks: any member (coordinator or caregiver) can read/write
create policy "tasks: member read"
on public.tasks for select
using (public.has_any_role(patient_id));

create policy "tasks: member insert"
on public.tasks for insert
with check (public.has_any_role(patient_id));

create policy "tasks: member update"
on public.tasks for update
using (public.has_any_role(patient_id))
with check (public.has_any_role(patient_id));

create policy "tasks: member delete"
on public.tasks for delete
using (public.has_any_role(patient_id));

-- Notes: any member can read/insert; only author can delete
create policy "notes: member read"
on public.notes for select
using (public.has_any_role(patient_id));

create policy "notes: member insert"
on public.notes for insert
with check (public.has_any_role(patient_id));

create policy "notes: author delete"
on public.notes for delete
using (auth.uid() = author_id);
