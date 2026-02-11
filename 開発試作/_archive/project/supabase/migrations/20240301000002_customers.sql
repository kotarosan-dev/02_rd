-- Create customers table
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,
  line_user_id text unique,
  name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.customers enable row level security;

-- Create RLS policies
create policy "Customers are viewable by authenticated users only"
  on public.customers for select
  to authenticated
  using (true);

create policy "Customers can update their own data"
  on public.customers for update
  using (auth.uid() = user_id);

create policy "Users can insert customer data during signup"
  on public.customers for insert
  with check (auth.uid() = user_id);

-- Create trigger for updated_at
create trigger handle_updated_at
  before update on public.customers
  for each row
  execute function public.handle_updated_at();