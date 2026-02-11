create table if not exists public.site_settings (
  id uuid default gen_random_uuid() primary key,
  key text not null unique,
  value text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLSポリシーの設定
alter table public.site_settings enable row level security;

-- 管理者のみが設定を変更可能
create policy "管理者のみが設定を変更可能" on public.site_settings
  for all
  to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

-- 誰でも設定を閲覧可能
create policy "誰でも設定を閲覧可能" on public.site_settings
  for select
  to public
  using (true); 