-- Enable RLS
alter table profiles enable row level security;

-- Allow users to read their own profile
create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id);

-- Allow profile creation during signup
create policy "Allow profile creation during signup"
on profiles for insert
with check (auth.uid() = id);

-- Allow admins to manage all profiles
create policy "Enable full access for admin users"
on profiles for all
using (
  auth.role() = 'authenticated'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);