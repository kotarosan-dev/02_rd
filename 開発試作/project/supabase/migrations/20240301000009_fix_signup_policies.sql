-- Drop existing policies that might conflict
drop policy if exists "Enable read access for own profile" on public.profiles;
drop policy if exists "Enable insert access for own profile" on public.profiles;
drop policy if exists "Enable update access for own profile" on public.profiles;
drop policy if exists "Enable system-level operations" on public.profiles;

-- Create more permissive policies for profiles
create policy "Enable all operations for authenticated users"
  on public.profiles
  as permissive
  for all
  to authenticated
  using (true)
  with check (true);

-- Create policy for public access during signup
create policy "Enable insert for signup"
  on public.profiles
  for insert
  to anon
  with check (true);

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
  
  -- Create profile
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, display_name);
  
  -- Create customer record
  insert into public.customers (user_id, email, name)
  values (new.id, new.email, display_name);
  
  return new;
end;
$$;

-- Ensure proper permissions
alter function public.handle_new_user() owner to postgres;

-- Grant necessary permissions
grant usage on schema public to postgres, authenticated, anon;
grant all on public.profiles to postgres, authenticated, anon;
grant all on public.customers to postgres, authenticated, anon;