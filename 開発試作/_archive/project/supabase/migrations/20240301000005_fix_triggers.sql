-- Enable bypass RLS for the handle_new_user function
alter table public.profiles force row level security;
alter table public.customers force row level security;

-- Create or replace the handle_updated_at function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create or replace the handle_new_user function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
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

-- Grant necessary permissions to the trigger function
grant usage on schema public to postgres, authenticated, anon;
grant all on all tables in schema public to postgres, authenticated;
grant all on all sequences in schema public to postgres, authenticated;
grant all on all routines in schema public to postgres, authenticated;

-- Drop existing trigger if exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create new trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();