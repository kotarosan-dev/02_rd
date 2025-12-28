-- goal_commentsテーブルの作成
create table goal_comments (
  id bigint primary key generated always as identity,
  goal_id bigint references goals(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- goal_commentsのRLSポリシー
alter table goal_comments enable row level security;

create policy "Users can view their own goal comments"
  on goal_comments for select
  using (user_id = auth.uid());

create policy "Users can insert their own goal comments"
  on goal_comments for insert
  with check (user_id = auth.uid());

create policy "Users can update their own goal comments"
  on goal_comments for update
  using (user_id = auth.uid());

-- goal_progressテーブルの作成
create table goal_progress (
  id bigint primary key generated always as identity,
  goal_id bigint references goals(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  value integer not null,
  recorded_at timestamptz default now(),
  note text,
  created_at timestamptz default now()
);

-- goal_progressのRLSポリシー
alter table goal_progress enable row level security;

create policy "Users can view their own goal progress"
  on goal_progress for select
  using (user_id = auth.uid());

create policy "Users can insert their own goal progress"
  on goal_progress for insert
  with check (user_id = auth.uid()); 