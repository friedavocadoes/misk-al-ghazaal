-- Apply after migration_product_options.sql. Blank stock is unlimited.
-- Existing explicit quantities, including zero, are preserved.
begin;
alter table public.variants alter column stock drop not null;
alter table public.variants alter column stock set default null;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='variants_stock_nonnegative') then
  alter table public.variants add constraint variants_stock_nonnegative check(stock is null or stock>=0);
 end if;
end $$;
create or replace function public.decrement_stock(p_variant_id uuid,p_qty int)
returns void language plpgsql security definer set search_path=public as $$
declare cur int;
begin
 if p_qty is null or p_qty<=0 then raise exception 'invalid stock quantity'; end if;
 select stock into cur from public.variants where id=p_variant_id for update;
 if not found then raise exception 'variant % not found',p_variant_id; end if;
 if cur is null then return; end if;
 if cur<p_qty then raise exception 'insufficient stock for %',p_variant_id; end if;
 update public.variants set stock=stock-p_qty where id=p_variant_id;
end $$;
revoke all on function public.decrement_stock(uuid,int) from public,anon,authenticated;
grant execute on function public.decrement_stock(uuid,int) to service_role;
commit;
