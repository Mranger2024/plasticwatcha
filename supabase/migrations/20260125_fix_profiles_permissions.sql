-- Grant basic SELECT permissions to the roles used by the Client API
grant usage on schema public to anon, authenticated;
grant select on table public.profiles to anon, authenticated;

-- Ensure RLS is enabled (it likely is, but good to be sure)
alter table public.profiles enable row level security;

-- Re-assert the policies to be absolutely safe
drop policy if exists "Profiles are viewable by anon users" on public.profiles;
create policy "Profiles are viewable by anon users"
on public.profiles for select to anon using (true);

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
on public.profiles for select to authenticated using (true);
