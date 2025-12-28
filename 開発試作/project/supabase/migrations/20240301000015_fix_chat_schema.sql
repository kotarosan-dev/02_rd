-- Add missing columns to conversations table
alter table public.conversations 
add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Add trigger for updated_at
create trigger handle_updated_at_conversations
  before update on public.conversations
  for each row
  execute function public.handle_updated_at();

-- Add missing columns to messages table if they don't exist
alter table public.messages
add column if not exists customer_id uuid references public.customers(id),
add column if not exists source text check (source in ('web', 'line', 'instagram')) default 'web',
add column if not exists is_ai_response boolean default false;

-- Create index for better query performance
create index if not exists messages_customer_id_idx on public.messages(customer_id);
create index if not exists messages_source_idx on public.messages(source);

-- Update messages RLS policies
drop policy if exists "Users can view messages in their conversations" on public.messages;

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