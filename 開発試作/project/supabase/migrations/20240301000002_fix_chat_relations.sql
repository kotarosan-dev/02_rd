-- Drop existing foreign key if exists
alter table public.conversations drop column if exists customer_id;

-- Add necessary columns and relations
alter table public.conversations
add column if not exists customer_id uuid references public.customers(id),
add column if not exists stylist_id uuid references auth.users(id),
add column if not exists last_message text,
add column if not exists last_message_time timestamp with time zone,
add column if not exists unread boolean default true;

-- Add customer name to conversations view for easier access
create or replace view public.conversations_with_details as
select 
  c.*,
  cu.name as customer_name
from public.conversations c
left join public.customers cu on c.customer_id = cu.id;

-- Update RLS policies
create policy "Stylists can view their conversations"
  on public.conversations for select
  using (auth.uid() = stylist_id);

create policy "Customers can view their conversations"
  on public.conversations for select
  using (
    customer_id in (
      select id from public.customers
      where user_id = auth.uid()
    )
  );