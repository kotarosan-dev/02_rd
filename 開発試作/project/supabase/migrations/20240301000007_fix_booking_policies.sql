-- Add more permissive policies for bookings
drop policy if exists "Customers can create bookings" on public.bookings;
drop policy if exists "Customers can view their own bookings" on public.bookings;

create policy "Enable booking creation for authenticated users"
  on public.bookings for insert
  to authenticated
  with check (true);

create policy "Enable booking viewing for authenticated users"
  on public.bookings for select
  to authenticated
  using (true);

-- Add more permissive policies for customers
drop policy if exists "Customers are viewable by authenticated users only" on public.customers;
drop policy if exists "Users can insert customer data during signup" on public.customers;

create policy "Enable customer creation for authenticated users"
  on public.customers for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Enable customer viewing for authenticated users"
  on public.customers for select
  to authenticated
  using (true);

-- Ensure proper permissions
grant usage on schema public to authenticated;
grant all on public.bookings to authenticated;
grant all on public.customers to authenticated;