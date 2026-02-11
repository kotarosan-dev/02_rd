-- 既存のテーブルとポリシーを削除
drop policy if exists "Users can view their own goals" on goals;
drop policy if exists "Users can insert their own goals" on goals;
drop policy if exists "Users can update their own goals" on goals;

drop table if exists goals cascade;

-- プロフィールテーブルの作成（存在しない場合）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- テーブルを作成
create table goals (
  id bigint primary key generated always as identity,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  target_value numeric not null default 0,
  current_value numeric not null default 0,
  type text not null default 'daily' check (type in ('daily', 'weekly', 'monthly')),
  category text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  start_date timestamp with time zone default timezone('utc'::text, now()),
  end_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_public boolean not null default true
);

-- RLSポリシーの設定
alter table goals enable row level security;

create policy "Users can view goals"
  on goals for select
  using (is_public = true or user_id = auth.uid());

create policy "Users can insert their own goals"
  on goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on goals for update
  using (auth.uid() = user_id);

-- 関連テーブルの再作成
create table if not exists goal_progress (
  id bigint primary key generated always as identity,
  goal_id bigint references goals(id) on delete cascade,
  value numeric not null,
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists goal_achievements (
  id bigint primary key generated always as identity,
  goal_id bigint references goals(id) on delete cascade,
  achieved_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists goal_likes (
  id bigint primary key generated always as identity,
  goal_id bigint references goals(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  clap_number integer not null default 1,
  constraint goal_likes_goal_id_user_id_clap_number_key unique(goal_id, user_id, clap_number)
);

-- 関連テーブルのRLSポリシー
alter table goal_progress enable row level security;
alter table goal_achievements enable row level security;
alter table goal_likes enable row level security;

-- goal_progressのポリシー
create policy "Users can view progress of their own goals"
  on goal_progress for select
  using (exists (select 1 from goals where goals.id = goal_id and goals.user_id = auth.uid()));

create policy "Users can insert progress for their own goals"
  on goal_progress for insert
  with check (exists (select 1 from goals where goals.id = goal_id and goals.user_id = auth.uid()));

-- goal_achievementsのポリシー
create policy "Users can view achievements of their own goals"
  on goal_achievements for select
  using (exists (select 1 from goals where goals.id = goal_id and goals.user_id = auth.uid()));

create policy "Users can insert achievements for their own goals"
  on goal_achievements for insert
  with check (exists (select 1 from goals where goals.id = goal_id and goals.user_id = auth.uid()));

-- goal_likesのポリシー
create policy "Users can view all likes"
  on goal_likes for select
  using (true);

create policy "Users can insert their own likes"
  on goal_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on goal_likes for delete
  using (auth.uid() = user_id); 