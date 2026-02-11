-- Add unique constraint to customer names
alter table public.customers
add constraint customers_name_unique unique (name);

-- Update handle_new_user function to ensure unique display names
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  base_name text;
  counter integer := 1;
begin
  -- Get user's email prefix as base name
  base_name := split_part(new.email, '@', 1);
  
  -- Try to create a unique display name
  loop
    if counter = 1 then
      display_name := base_name;
    else
      display_name := base_name || counter::text;
    end if;
    
    -- Check if name exists
    if not exists (
      select 1 from public.customers where name = display_name
    ) then
      exit;
    end if;
    
    counter := counter + 1;
  end loop;

  -- Create profile
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, display_name);
  
  -- Create customer record
  insert into public.customers (user_id, email, name)
  values (new.id, new.email, display_name);
  
  return new;
end;
$$;