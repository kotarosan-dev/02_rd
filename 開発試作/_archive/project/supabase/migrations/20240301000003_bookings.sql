-- Create bookings table
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) not null,
  service_id text not null,
  booking_date date not null,
  booking_time text not null,
  status text check (status in ('pending', 'confirmed', 'cancelled')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for better query performance
create index bookings_customer_id_idx on public.bookings(customer_id);
create index bookings_date_time_idx on public.bookings(booking_date, booking_time);
create index bookings_status_idx on public.bookings(status);

-- Enable RLS
alter table public.bookings enable row level security;

-- Create RLS policies
create policy "Customers can view their own bookings"
  on public.bookings for select
  using (
    auth.uid() in (
      select user_id from public.customers
      where id = customer_id
    )
  );

create policy "Customers can create bookings"
  on public.bookings for insert
  with check (
    auth.uid() in (
      select user_id from public.customers
      where id = customer_id
    )
  );

create policy "Customers can update their own bookings"
  on public.bookings for update
  using (
    auth.uid() in (
      select user_id from public.customers
      where id = customer_id
    )
  );

-- Allow admin users to view all bookings
create policy "Admin users can view all bookings"
  on public.bookings for select
  using (
    auth.uid() in (
      select user_id from public.admin_users
    )
  );

-- Create trigger for updated_at
create trigger handle_updated_at
  before update on public.bookings
  for each row
  execute function public.handle_updated_at();