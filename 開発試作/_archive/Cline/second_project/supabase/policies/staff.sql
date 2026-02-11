-- Enable RLS
alter table staff enable row level security;

-- Allow public read access to staff
create policy "Enable read access for all users"
on staff for select
using (true);

-- Allow admin to manage staff
create policy "Enable full access for admin users"
on staff for all
using (
  auth.role() = 'authenticated'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);