-- Allow all roles (coordinator, caregiver, gov_coordinator) to manage
-- schedule_events. The user requirement is that every role can add, edit,
-- and delete shift entries on the calendar.

drop policy "schedule_events: coordinator can insert" on public.schedule_events;
drop policy "schedule_events: coordinator can update" on public.schedule_events;
drop policy "schedule_events: coordinator can delete" on public.schedule_events;

create policy "schedule_events: any role can insert"
on public.schedule_events for insert
with check (public.has_any_role(patient_id));

create policy "schedule_events: any role can update"
on public.schedule_events for update
using (public.has_any_role(patient_id))
with check (public.has_any_role(patient_id));

create policy "schedule_events: any role can delete"
on public.schedule_events for delete
using (public.has_any_role(patient_id));
