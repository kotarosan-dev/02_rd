-- Enable RLS
alter table services enable row level security;

-- Allow public read access to services
create policy "Enable read access for all users"
on services for select
using (true);

-- Allow admin to manage services
create policy "Enable full access for admin users"
on services for all
using (
  auth.role() = 'authenticated' 
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);