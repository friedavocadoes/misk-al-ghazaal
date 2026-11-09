-- Run after migration_checkout_address_book.sql.
-- Keep the address-book delete and the legacy fallback in one transaction.
create or replace function public.delete_shopper_address(p_address_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  shopper_id uuid := auth.uid();
  next_address jsonb;
begin
  if shopper_id is null then return false; end if;

  perform 1 from public.profiles where id = shopper_id for update;
  if not found then return false; end if;

  if p_address_id is null then
    -- The legacy entry is only shown when the address book is empty.
    if exists (select 1 from public.shopper_addresses where user_id = shopper_id) then
      return false;
    end if;
  else
    delete from public.shopper_addresses where id = p_address_id and user_id = shopper_id;
    if not found then return false; end if;
  end if;

  select address into next_address
  from public.shopper_addresses
  where user_id = shopper_id
  order by last_used_at desc nulls last, created_at desc, id
  limit 1;

  -- An explicit empty-book marker prevents a prior order from recreating
  -- the deleted address. A new checkout replaces it with the new address.
  update public.profiles
  set default_address = coalesce(next_address, '{"address_book_cleared":true}'::jsonb)
  where id = shopper_id;
  return true;
end;
$$;

revoke all on function public.delete_shopper_address(uuid) from public, anon;
grant execute on function public.delete_shopper_address(uuid) to authenticated;
