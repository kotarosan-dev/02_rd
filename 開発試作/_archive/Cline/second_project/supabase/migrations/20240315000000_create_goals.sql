-- goalsテーブルの作成
create table if not exists goals (
    id bigint generated always as identity primary key,
    user_id uuid references profiles(id) on delete cascade,
    title text not null,
    description text,
    target_value numeric not null default 0,
    current_value numeric not null default 0,
    type text not null default 'daily',
    category text not null,
    status text not null default 'active',
    start_date timestamp with time zone default timezone('utc', now()),
    end_date timestamp with time zone not null,
    created_at timestamp with time zone not null default timezone('utc', now()),
    updated_at timestamp with time zone default timezone('utc', now()),
    is_public boolean not null default true,
    likes_count integer default 0,
    constraint goals_status_check check (
        status = any (array['active', 'completed', 'failed'])
    ),
    constraint goals_type_check check (
        type = any (array['daily', 'weekly', 'monthly'])
    )
);

-- goal_progressテーブルの作成
create table if not exists goal_progress (
    id bigint generated always as identity primary key,
    goal_id bigint references goals(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    progress integer not null,
    note text,
    recorded_at timestamp with time zone default timezone('utc', now())
);

-- goal_achievementsテーブルの作成
create table if not exists goal_achievements (
    id bigint generated always as identity primary key,
    goal_id bigint references goals(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    points integer not null default 0,
    achievement_date timestamp with time zone default timezone('utc', now())
);

-- goal_likesテーブルの作成
create table if not exists goal_likes (
    id bigint generated always as identity primary key,
    goal_id bigint references goals(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc', now()),
    constraint goal_likes_goal_id_user_id_key unique(goal_id, user_id)
);

-- RLSの有効化
alter table goals enable row level security;
alter table goal_progress enable row level security;
alter table goal_achievements enable row level security;
alter table goal_likes enable row level security;

-- ポリシーの作成
create policy "Public goals are viewable by everyone"
    on goals for select
    using (is_public = true);

create policy "Users can view their own goals"
    on goals for select
    using (auth.uid() = user_id);

create policy "Users can insert their own goals"
    on goals for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own goals"
    on goals for update
    using (auth.uid() = user_id);

create policy "Users can delete their own goals"
    on goals for delete
    using (auth.uid() = user_id);

-- goal_progressのポリシー
create policy "Users can view progress of their own goals"
    on goal_progress for select
    using (exists (
        select 1 from goals
        where goals.id = goal_id
        and (goals.is_public = true or goals.user_id = auth.uid())
    ));

create policy "Users can insert progress for their own goals"
    on goal_progress for insert
    with check (auth.uid() = user_id);

-- goal_achievementsのポリシー
create policy "Users can view achievements of their own goals"
    on goal_achievements for select
    using (exists (
        select 1 from goals
        where goals.id = goal_id
        and (goals.is_public = true or goals.user_id = auth.uid())
    ));

create policy "Users can insert achievements for their own goals"
    on goal_achievements for insert
    with check (auth.uid() = user_id);

-- goal_likesのポリシー
create policy "Users can view likes"
    on goal_likes for select
    using (exists (
        select 1 from goals
        where goals.id = goal_id
        and (goals.is_public = true or goals.user_id = auth.uid())
    ));

create policy "Users can insert likes"
    on goal_likes for insert
    with check (auth.uid() = user_id);

-- インデックスの作成
create index if not exists goals_user_id_idx on goals(user_id);
create index if not exists goals_status_idx on goals(status);
create index if not exists goals_type_idx on goals(type);
create index if not exists goals_category_idx on goals(category);
create index if not exists goal_progress_goal_id_idx on goal_progress(goal_id);
create index if not exists goal_achievements_goal_id_idx on goal_achievements(goal_id);
create index if not exists goal_likes_goal_id_idx on goal_likes(goal_id);

-- トリガー関数の作成
create or replace function update_goals_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

-- 既存のトリガーを削除
drop trigger if exists goals_updated_at on goals;

-- トリガーの作成
create trigger goals_updated_at
    before update on goals
    for each row
    execute function update_goals_updated_at(); 