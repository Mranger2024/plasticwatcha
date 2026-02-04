-- 1. Ensure the bio column exists
alter table public.profiles add column if not exists bio text;

-- 2. Grant proper permissions to authenticated users
-- Without this, even with RLS, the user cannot INSERT/UPDATE
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- 3. Ensure RLS policies for modification exist and are correct
-- Drop existing policies to ensure clean state
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can upsert own profile" on public.profiles;

-- Create comprehensive policies
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ( auth.uid() = id );

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ( auth.uid() = id );

-- Allow users to delete their own profile (optional but good practice)
create policy "Users can delete own profile"
on public.profiles for delete
to authenticated
using ( auth.uid() = id );
