-- Drop existing policies
drop policy if exists "Enable admin operations" on public.admin_users;
drop policy if exists "Enable all operations for authenticated users" on public.profiles;

-- Create more specific admin policies
create policy "Enable admin read access"
  on public.admin_users
  for select
  using (true);

create policy "Enable admin write access"
  on public.admin_users
  for insert
  with check (auth.uid() = user_id);

-- Ensure profiles table has correct structure and policies
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null unique,
  display_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Drop existing profile policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "System can manage profiles" on public.profiles;

-- Create new profile policies
create policy "Enable read access for users own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "Enable update access for users own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id);

create policy "Enable insert for authenticated users"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

-- Function to handle new admin users
create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.user_id,
    (select email from auth.users where id = new.user_id),
    'Admin'
  )
  on conflict (user_id) do update
  set display_name = 'Admin',
      updated_at = now();
  
  return new;
end;
$$;

-- Recreate admin check function
create or replace function public.is_admin(uid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from admin_users
    where user_id = uid
  );
end;
$$;

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.profiles to authenticated;
grant all on public.admin_users to authenticated;
grant execute on function public.is_admin to authenticated;