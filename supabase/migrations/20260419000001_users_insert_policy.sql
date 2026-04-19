-- Allow authenticated users to insert their own profile row.
-- Without this, the app's ensureProfile() upsert fails silently,
-- and RLS on user_roles blocks all queries.
create policy "users: insert own"
on public.users for insert
with check (id = auth.uid());
