-- Enable RLS
alter table appointments enable row level security;

-- Create policy to allow authenticated users to read their own appointments
create policy "Users can view own appointments"
on appointments for select
to authenticated
using (auth.uid() = user_id);

-- Create policy to allow authenticated users to insert their own appointments
create policy "Users can create own appointments"
on appointments for insert
to authenticated
with check (auth.uid() = user_id);

-- Create policy to allow authenticated users to update their own appointments
create policy "Users can update own appointments"
on appointments for update
to authenticated
using (auth.uid() = user_id);