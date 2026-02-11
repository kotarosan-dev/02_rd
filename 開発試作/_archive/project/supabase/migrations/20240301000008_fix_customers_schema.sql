-- Add missing email column to customers table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'customers' 
    and column_name = 'email') then
    
    alter table public.customers 
    add column email text;
  end if;
end $$;