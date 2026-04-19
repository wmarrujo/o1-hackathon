-- The trigger previously called auth.uid() unconditionally.
-- When inserting via service role (e.g. seeding), auth.uid() returns null,
-- which violates the NOT NULL constraint on user_roles.user_id.
-- Skip the auto-assignment when there is no authenticated user.
create or replace function public.assign_coordinator_on_patient_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.user_roles (user_id, patient_id, role)
    values (auth.uid(), new.id, 'coordinator');
  end if;
  return new;
end;
$$;
