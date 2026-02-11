-- profilesテーブルの作成
create table if not exists profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text,
    full_name text,
    avatar_url text,
    bio text,
    username text unique,
    display_name text,
    role text not null default 'user',
    created_at timestamp with time zone default timezone('utc', now()),
    updated_at timestamp with time zone default timezone('utc', now()),
    constraint profiles_role_check check (
        role = any (array['user', 'admin', 'staff'])
    )
);

-- RLSの有効化
alter table profiles enable row level security;

-- 既存のポリシーを削除
drop policy if exists "Anyone can view profiles" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can view their own profile" on profiles;

-- ポリシーの作成
create policy "Public profiles are viewable by everyone"
    on profiles for select
    using (true);

create policy "Users can view their own profile"
    on profiles for select
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on profiles for insert
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on profiles for update
    using (auth.uid() = id);

-- インデックスの作成
create index if not exists profiles_email_idx on profiles(email);
create index if not exists profiles_username_idx on profiles(username);
create index if not exists profiles_role_idx on profiles(role);

-- トリガー関数の作成
create or replace function update_profiles_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

-- 既存のトリガーを削除
drop trigger if exists profiles_updated_at on profiles;

-- トリガーの作成
create trigger profiles_updated_at
    before update on profiles
    for each row
    execute function update_profiles_updated_at();

-- プロフィール作成トリガー関数
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'user');
    return new;
end;
$$ language plpgsql security definer;

-- 既存のトリガーを削除
drop trigger if exists on_auth_user_created on auth.users;

-- 新規ユーザー作成時のトリガー
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user(); 