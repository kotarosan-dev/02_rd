-- Add conversation_id to messages if it doesn't exist
alter table public.messages
add column if not exists conversation_id uuid default gen_random_uuid();

-- Add sender_id to messages if it doesn't exist
alter table public.messages
add column if not exists sender_id text;

-- Create index for conversation_id
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

-- Update RLS policies for messages
drop policy if exists "Enable message access for customers and admins" on public.messages;

create policy "Enable message access for all authenticated users"
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