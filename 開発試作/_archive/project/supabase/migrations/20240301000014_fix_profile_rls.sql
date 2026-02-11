-- Drop all existing policies on profiles
drop policy if exists "Enable read access for users own profile" on public.profiles;
drop policy if exists "Enable update access for users own profile" on public.profiles;
drop policy if exists "Enable insert for authenticated users" on public.profiles;
drop policy if exists "Enable system-level operations" on public.profiles;
drop policy if exists "Enable all operations for authenticated users" on public.profiles;

-- Create a single, more permissive policy for profiles
create policy "Enable all operations for users own profile"
  on public.profiles
  as permissive
  for all
  using (auth.uid() = user_id or auth.uid() in (select user_id from admin_users))
  with check (auth.uid() = user_id or auth.uid() in (select user_id from admin_users));

-- Update handle_new_user function to be more permissive
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  display_name text;
begin
  display_name := 'ゲスト' || floor(random() * 1000)::text;
  
  -- Create profile with security definer
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, display_name);
  
  -- Create customer record
  insert into public.customers (user_id, email, name)
  values (new.id, new.email, display_name);
  
  return new;
end;
$$;

-- Ensure proper permissions
grant usage on schema public to authenticated, anon;
grant all on public.profiles to authenticated;
grant all on public.customers to authenticated;

-- Recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();