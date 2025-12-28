-- Add instagram_user_id to customers table
alter table public.customers
add column if not exists instagram_user_id text unique;

-- Update existing RLS policies
drop policy if exists "Enable customer access for customers and admins" on public.customers;

create policy "Enable customer access for customers and admins"
  on public.customers
  as permissive
  for all
  using (
    auth.uid() = user_id or 
    auth.uid() in (
      select user_id from public.admin_users
    )
  )
  with check (
    auth.uid() = user_id or 
    auth.uid() in (
      select user_id from public.admin_users
    )
  );

-- Create index for better query performance
create index if not exists customers_instagram_user_id_idx on public.customers(instagram_user_id);