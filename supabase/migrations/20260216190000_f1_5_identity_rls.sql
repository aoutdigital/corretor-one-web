-- F1.5 - Identity RLS
-- profiles and portal_users: user can only CRUD own record

alter table public.profiles enable row level security;
alter table public.portal_users enable row level security;

drop policy if exists portal_users_select_own on public.portal_users;
create policy portal_users_select_own
  on public.portal_users
  for select
  using (id = auth.uid());

drop policy if exists portal_users_insert_own on public.portal_users;
create policy portal_users_insert_own
  on public.portal_users
  for insert
  with check (id = auth.uid());

drop policy if exists portal_users_update_own on public.portal_users;
create policy portal_users_update_own
  on public.portal_users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists portal_users_delete_own on public.portal_users;
create policy portal_users_delete_own
  on public.portal_users
  for delete
  using (id = auth.uid());

