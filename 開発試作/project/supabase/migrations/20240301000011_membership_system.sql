-- Add membership levels
create type membership_level as enum ('basic', 'silver', 'gold', 'platinum');

-- Add membership details to profiles
alter table public.profiles
add column membership_level membership_level default 'basic',
add column points integer default 0,
add column phone_number text,
add column birth_date date,
add column address text,
add column preferences jsonb default '{}'::jsonb;

-- Create membership_benefits table
create table public.membership_benefits (
  id uuid primary key default uuid_generate_v4(),
  level membership_level not null,
  name text not null,
  description text,
  points_multiplier numeric(3,1) default 1.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create point_transactions table
create table public.point_transactions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) not null,
  points integer not null,
  description text not null,
  transaction_type text check (transaction_type in ('earn', 'spend')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default membership benefits
insert into public.membership_benefits (level, name, description, points_multiplier) values
('basic', 'ベーシック会員', '基本特典が利用可能', 1.0),
('silver', 'シルバー会員', 'ポイント還元率1.2倍、優先予約可能', 1.2),
('gold', 'ゴールド会員', 'ポイント還元率1.5倍、特別価格でのサービス提供', 1.5),
('platinum', 'プラチナ会員', 'ポイント還元率2.0倍、専属スタイリスト付き', 2.0);

-- Add RLS policies
alter table public.point_transactions enable row level security;

create policy "Users can view their own point transactions"
  on public.point_transactions for select
  using (auth.uid() in (
    select user_id from public.profiles where id = profile_id
  ));

-- Create function to update points
create or replace function public.update_profile_points()
returns trigger as $$
begin
  if new.transaction_type = 'earn' then
    update public.profiles
    set points = points + new.points
    where id = new.profile_id;
  elsif new.transaction_type = 'spend' then
    update public.profiles
    set points = points - new.points
    where id = new.profile_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for points update
create trigger on_point_transaction
  after insert on public.point_transactions
  for each row execute function public.update_profile_points();