-- Usage limits now belong to each account, never to the whole store.
-- Run before deploying the accompanying checkout code.
begin;
update public.coupons set usage_limit = 1 where once_per_account;
update public.coupons set once_per_account = false where once_per_account;
-- Retain the inert legacy column for rolling deployments; no UI/model uses it.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'coupons_account_limit_positive' and conrelid = 'public.coupons'::regclass) then
    alter table public.coupons add constraint coupons_account_limit_positive check (usage_limit is null or usage_limit >= 1) not valid;
  end if;
end $$;
create index if not exists coupon_redemptions_account_idx on public.coupon_redemptions(coupon_id,user_id);
create or replace function public.reserve_order_coupon()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.coupons%rowtype; uses bigint;
begin
  if new.coupon_code is null or btrim(new.coupon_code) = '' then return new; end if;
  select * into c from public.coupons where code = new.coupon_code for update;
  if not found then raise exception 'Coupon no longer available'; end if;
  if new.user_id is null then raise exception 'Sign in to redeem this coupon'; end if;
  if c.owner_id is not null and c.owner_id <> new.user_id then raise exception 'Coupon belongs to another account'; end if;
  if c.usage_limit is not null then
    select count(*) into uses from public.coupon_redemptions where coupon_id = c.id and user_id = new.user_id;
    if uses >= c.usage_limit then raise exception 'You have reached the usage limit for this coupon'; end if;
  end if;
  insert into public.coupon_redemptions(coupon_id,order_id,user_id) values(c.id,new.id,new.user_id);
  update public.coupons set used_count = used_count + 1 where id = c.id;
  return new;
end;
$$;
drop trigger if exists reserve_order_coupon on public.orders;
create trigger reserve_order_coupon after insert on public.orders for each row execute function public.reserve_order_coupon();
commit;
