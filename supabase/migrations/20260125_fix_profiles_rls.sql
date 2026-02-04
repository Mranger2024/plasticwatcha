-- Drop the old policy if it exists (to avoid conflicts or ambiguity)
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;

-- Create explicit policy for Authenticated users
create policy "Profiles are viewable by authenticated users"
on public.profiles
for select
to authenticated
using ( true );

-- Create explicit policy for Anonymous users
create policy "Profiles are viewable by anon users"
on public.profiles
for select
to anon
using ( true );
