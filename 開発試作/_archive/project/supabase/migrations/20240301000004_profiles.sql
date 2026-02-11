-- Create profiles table
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  display_name text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create RLS policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Allow insert for authenticated users
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Allow system functions to manage profiles
create policy "System can manage profiles"
  on public.profiles
  as permissive
  for all
  using (true)
  with check (true);

-- Create updated_at trigger
create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();