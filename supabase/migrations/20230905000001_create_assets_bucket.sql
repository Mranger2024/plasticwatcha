-- Create a storage bucket for site assets
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Set up storage policies for the assets bucket
create policy "Public Access"
on storage.objects for select
to public
using (bucket_id = 'assets');

create policy "Authenticated users can upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'assets');

create policy "Users can update their own files"
on storage.objects for update
to authenticated
using (auth.uid() = owner);

-- Create a function to generate a unique filename
create or replace function generate_unique_filename(filename text)
returns text
language plpgsql
as $$
begin
  return concat(
    substr(md5(random()::text), 1, 10),
    '_',
    replace(filename, ' ', '_')
  );
end;
$$;
