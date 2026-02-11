-- Create customers table with LINE integration
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,
  line_user_id text unique,
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add source column to messages table
alter table public.messages add column source text check (source in ('web', 'line')) default 'web';

-- Add line_user_id to conversations table
alter table public.conversations add column customer_id uuid references public.customers(id);

-- Create RLS policies
alter table public.customers enable row level security;

create policy "Customers are viewable by authenticated users only"
  on public.customers for select
  to authenticated
  using (true);

create policy "Customers are insertable by authenticated users only"
  on public.customers for insert
  to authenticated
  with check (true);

create policy "Customers are updatable by authenticated users only"
  on public.customers for update
  to authenticated
  using (true);