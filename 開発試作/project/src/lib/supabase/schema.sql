-- Enable RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  role text check (role in ('admin', 'customer', 'staff')) default 'customer',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can view their conversations"
  on public.conversations for select
  using (auth.uid() = profile_id);

create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their conversations"
  on public.conversations for update
  using (auth.uid() = profile_id);

create policy "Users can delete their conversations"
  on public.conversations for delete
  using (auth.uid() = profile_id);

create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    auth.uid() in (
      select profile_id from public.conversations
      where id = conversation_id
    )
  );

create policy "Users can insert messages in their conversations"
  on public.messages for insert
  with check (
    auth.uid() in (
      select profile_id from public.conversations
      where id = conversation_id
    )
  );

-- Create functions
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Create triggers
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create indexes
create index conversations_profile_id_idx on public.conversations(profile_id);
create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_profile_id_idx on public.messages(profile_id);