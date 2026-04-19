-- The original policy only allowed a user to see their own user_roles row
-- (or all rows if they were a coordinator). This meant caregivers couldn't
-- build a full team member list, so completed_by / assignee lookups showed
-- no name for any team member other than themselves.
--
-- Replace with a policy that lets any team member (any role) read all
-- role assignments for the same patient. has_any_role() is security definer
-- so it bypasses RLS and avoids recursive policy evaluation.

drop policy "user_roles: read own assignments" on public.user_roles;

create policy "user_roles: team can read"
on public.user_roles for select
using (public.has_any_role(patient_id));
