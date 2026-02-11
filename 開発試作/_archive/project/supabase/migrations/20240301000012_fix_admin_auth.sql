-- Drop existing admin policies if they exist
drop policy if exists "Admin users are viewable by authenticated users only" on public.admin_users;
drop policy if exists "Enable all operations for authenticated users" on public.profiles;

-- Create more permissive admin policies
create policy "Enable admin operations"
  on public.admin_users
  as permissive
  for all
  using (true)
  with check (true);

-- Ensure admin_users table exists and has proper structure
create table if not exists public.admin_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Create function to check admin status
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.admin_users
    where admin_users.user_id = $1
  );
$$;

-- Create function to handle new admin user
create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Create profile for admin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.user_id,
    (select email from auth.users where id = new.user_id),
    'Admin'
  )
  on conflict (user_id) do nothing;
  
  return new;
end;
$$;

-- Create trigger for new admin users
create trigger on_admin_user_created
  after insert on public.admin_users
  for each row
  execute function public.handle_new_admin_user();

-- Grant necessary permissions
grant usage on schema public to postgres, authenticated, anon;
grant all on public.admin_users to postgres, authenticated;
grant all on public.profiles to postgres, authenticated;