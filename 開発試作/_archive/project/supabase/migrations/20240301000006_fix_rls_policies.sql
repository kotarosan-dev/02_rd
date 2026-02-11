-- Drop existing policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "System can manage profiles" on public.profiles;

-- Create new RLS policies for profiles
create policy "Enable read access for own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Enable insert access for own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Enable update access for own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Create policy for system-level operations
create policy "Enable system-level operations"
  on public.profiles
  as permissive
  for all
  to postgres
  using (true)
  with check (true);

-- Recreate the handle_new_user function with proper permissions
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grant necessary permissions
grant usage on schema public to postgres, authenticated, anon;
grant all on all tables in schema public to postgres;
grant all on all sequences in schema public to postgres;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.customers to authenticated;