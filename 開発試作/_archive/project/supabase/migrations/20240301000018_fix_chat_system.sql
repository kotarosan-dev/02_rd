-- Drop existing tables if they exist
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;

-- Create conversations table
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) not null,
  channel text check (channel in ('web', 'line', 'instagram')) not null,
  last_message text,
  last_message_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) not null,
  customer_id uuid references public.customers(id) not null,
  sender_type text check (sender_type in ('customer', 'admin', 'ai')) not null,
  content text not null,
  channel text check (channel in ('web', 'line', 'instagram')) not null,
  is_ai_response boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index conversations_customer_id_idx on public.conversations(customer_id);
create index conversations_channel_idx on public.conversations(channel);
create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_customer_id_idx on public.messages(customer_id);
create index messages_channel_idx on public.messages(channel);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Create RLS policies
create policy "Enable conversation access for customers and admins"
  on public.conversations
  as permissive
  for all
  using (
    auth.uid() in (
      select user_id from public.customers where id = customer_id
    ) or 
    auth.uid() in (
      select user_id from public.admin_users
    )
  )
  with check (
    auth.uid() in (
      select user_id from public.customers where id = customer_id
    ) or 
    auth.uid() in (
      select user_id from public.admin_users
    )
  );

create policy "Enable message access for customers and admins"
  on public.messages
  as permissive
  for all
  using (
    auth.uid() in (
      select user_id from public.customers where id = customer_id
    ) or 
    auth.uid() in (
      select user_id from public.admin_users
    )
  )
  with check (
    auth.uid() in (
      select user_id from public.customers where id = customer_id
    ) or 
    auth.uid() in (
      select user_id from public.admin_users
    )
  );

-- Create function to update conversation last message
create or replace function public.update_conversation_last_message()
returns trigger as $$
begin
  update public.conversations
  set 
    last_message = new.content,
    last_message_time = new.created_at,
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for updating conversation last message
create trigger on_message_inserted
  after insert on public.messages
  for each row
  execute function public.update_conversation_last_message();