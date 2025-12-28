-- Enable RLS
alter table public.admin_users enable row level security;

-- Create admin_users table
create table public.admin_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Create RLS policies
create policy "Admin users are viewable by authenticated users only"
  on public.admin_users for select
  to authenticated
  using (true);

-- Insert initial admin user (メールアドレスを実際の管理者のものに変更してください)
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@example.com';