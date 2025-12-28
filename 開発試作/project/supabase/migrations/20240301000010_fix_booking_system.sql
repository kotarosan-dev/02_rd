-- Drop existing policies
drop policy if exists "Enable customer creation for authenticated users" on public.customers;
drop policy if exists "Enable customer viewing for authenticated users" on public.customers;
drop policy if exists "Customers can update their own data" on public.customers;

-- Create more permissive policies for customers table
create policy "Enable all operations for authenticated users"
  on public.customers
  as permissive
  for all
  to authenticated
  using (true)
  with check (true);

-- Ensure proper permissions for bookings
grant usage on schema public to authenticated;
grant all on public.bookings to authenticated;
grant all on public.customers to authenticated;

-- Add booking history view
create or replace view public.booking_history as
select 
  b.id,
  b.booking_date,
  b.booking_time,
  b.service_id,
  b.status,
  c.name as customer_name,
  b.created_at
from public.bookings b
join public.customers c on b.customer_id = c.id
order by b.booking_date desc, b.booking_time desc;

-- Add policy for booking history view
create policy "Enable booking history viewing for authenticated users"
  on public.booking_history
  for select
  to authenticated
  using (true);