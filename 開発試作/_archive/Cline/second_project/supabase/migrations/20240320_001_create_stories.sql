-- ストーリーテーブルの作成
create table if not exists stories (
  id bigint primary key generated always as identity,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  premise text not null,
  current_chapter integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ストーリーの章テーブルの作成
create table if not exists story_chapters (
  id bigint primary key generated always as identity,
  story_id bigint references stories(id) on delete cascade,
  chapter_number integer not null,
  title text not null,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint story_chapters_story_id_chapter_number_key unique (story_id, chapter_number)
);

-- ストーリーのキャラクターテーブルの作成
create table if not exists story_characters (
  id bigint primary key generated always as identity,
  chapter_id bigint references story_chapters(id) on delete cascade,
  role text not null,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 目標とストーリーの章を関連付けるテーブル
create table if not exists story_chapter_goals (
  id bigint primary key generated always as identity,
  chapter_id bigint references story_chapters(id) on delete cascade,
  goal_id bigint references goals(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint story_chapter_goals_chapter_id_goal_id_key unique (chapter_id, goal_id)
);

-- RLSの有効化
alter table stories enable row level security;
alter table story_chapters enable row level security;
alter table story_characters enable row level security;
alter table story_chapter_goals enable row level security;

-- ストーリーのポリシー
create policy "Users can view their own stories"
  on stories for select
  using (auth.uid() = user_id);

create policy "Users can insert their own stories"
  on stories for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own stories"
  on stories for update
  using (auth.uid() = user_id);

-- ストーリーの章のポリシー
create policy "Users can view chapters of their stories"
  on story_chapters for select
  using (
    exists (
      select 1 from stories
      where stories.id = story_chapters.story_id
      and stories.user_id = auth.uid()
    )
  );

create policy "Users can insert chapters to their stories"
  on story_chapters for insert
  with check (
    exists (
      select 1 from stories
      where stories.id = story_chapters.story_id
      and stories.user_id = auth.uid()
    )
  );

create policy "Users can update chapters of their stories"
  on story_chapters for update
  using (
    exists (
      select 1 from stories
      where stories.id = story_chapters.story_id
      and stories.user_id = auth.uid()
    )
  );

-- キャラクターのポリシー
create policy "Users can view characters of their stories"
  on story_characters for select
  using (
    exists (
      select 1 from story_chapters
      join stories on stories.id = story_chapters.story_id
      where story_chapters.id = story_characters.chapter_id
      and stories.user_id = auth.uid()
    )
  );

create policy "Users can insert characters to their stories"
  on story_characters for insert
  with check (
    exists (
      select 1 from story_chapters
      join stories on stories.id = story_chapters.story_id
      where story_chapters.id = story_characters.chapter_id
      and stories.user_id = auth.uid()
    )
  );

-- 目標とストーリーの関連付けのポリシー
create policy "Users can view their story chapter goals"
  on story_chapter_goals for select
  using (
    exists (
      select 1 from story_chapters
      join stories on stories.id = story_chapters.story_id
      where story_chapters.id = story_chapter_goals.chapter_id
      and stories.user_id = auth.uid()
    )
  );

create policy "Users can insert their story chapter goals"
  on story_chapter_goals for insert
  with check (
    exists (
      select 1 from story_chapters
      join stories on stories.id = story_chapters.story_id
      where story_chapters.id = story_chapter_goals.chapter_id
      and stories.user_id = auth.uid()
    )
  );

-- インデックスの作成
create index stories_user_id_idx on stories(user_id);
create index story_chapters_story_id_idx on story_chapters(story_id);
create index story_characters_chapter_id_idx on story_characters(chapter_id);
create index story_chapter_goals_chapter_id_idx on story_chapter_goals(chapter_id);
create index story_chapter_goals_goal_id_idx on story_chapter_goals(goal_id);

-- updated_atを自動更新するトリガー
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_stories_updated_at
  before update on stories
  for each row
  execute function update_updated_at_column();

create trigger update_story_chapters_updated_at
  before update on story_chapters
  for each row
  execute function update_updated_at_column(); 