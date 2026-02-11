-- Enable extensions
create extension if not exists "uuid-ossp";

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Create profiles table first (as other tables depend on it)
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  display_name text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Create conversations table
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  role text check (role in ('user', 'assistant', 'system')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can view their conversations"
  on public.conversations for select
  using (auth.uid() in (
    select user_id from public.profiles where id = profile_id
  ));

create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() in (
    select user_id from public.profiles where id = profile_id
  ));

create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    auth.uid() in (
      select p.user_id from public.profiles p
      inner join public.conversations c on c.profile_id = p.id
      where c.id = conversation_id
    )
  );

-- Create functions
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers
create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at_conversations
  before update on public.conversations
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index profiles_user_id_idx on public.profiles(user_id);
create index conversations_profile_id_idx on public.conversations(profile_id);
create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_profile_id_idx on public.messages(profile_id);