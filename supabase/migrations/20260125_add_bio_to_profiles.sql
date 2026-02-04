-- Add bio column to profiles table
alter table profiles add column if not exists bio text;
