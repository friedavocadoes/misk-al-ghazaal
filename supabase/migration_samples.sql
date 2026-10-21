begin;
create table if not exists sample_categories(id uuid primary key default gen_random_uuid(),name text not null);
create table if not exists samples(id uuid primary key default gen_random_uuid(),category_id uuid references sample_categories(id),name text not null,description text not null default '',notes text not null default '',image text not null default '',stock integer not null default 0 check(stock>=0),active boolean not null default true);
create table if not exists sample_tiers(id uuid primary key default gen_random_uuid(),min_subtotal numeric unique not null check(min_subtotal>=0),allowance integer not null check(allowance>0));
alter table sample_categories enable row level security;alter table samples enable row level security;alter table sample_tiers enable row level security;
drop policy if exists "public categories" on sample_categories;
create policy "public categories" on sample_categories for select using(true);
drop policy if exists "public samples" on samples;
create policy "public samples" on samples for select using(active);
drop policy if exists "public tiers" on sample_tiers;
create policy "public tiers" on sample_tiers for select using(true);
drop policy if exists "manage categories" on sample_categories;
create policy "manage categories" on sample_categories for all to authenticated using(public.is_super_admin(auth.uid())) with check(public.is_super_admin(auth.uid()));
drop policy if exists "manage samples" on samples;
create policy "manage samples" on samples for all to authenticated using(public.is_super_admin(auth.uid())) with check(public.is_super_admin(auth.uid()));
drop policy if exists "manage tiers" on sample_tiers;
create policy "manage tiers" on sample_tiers for all to authenticated using(public.is_super_admin(auth.uid())) with check(public.is_super_admin(auth.uid()));
alter table orders add column if not exists sample_ids uuid[] not null default '{}';
create or replace function reserve_order_samples() returns trigger language plpgsql security definer set search_path=public as $$
declare allowed integer; sid uuid; item samples%rowtype;
begin
 if cardinality(new.sample_ids)=0 then return new; end if;
 select coalesce(max(allowance),0) into allowed from sample_tiers where min_subtotal<=new.subtotal;
 if cardinality(new.sample_ids)>allowed or cardinality(new.sample_ids)<>(select count(distinct x) from unnest(new.sample_ids) x) then raise exception 'Invalid sample allowance. Please review your selections.'; end if;
 for sid in select unnest(new.sample_ids) order by 1 loop
 update samples set stock=stock-1 where id=sid and active and stock>0 returning * into item;
 if not found then raise exception 'A selected sample is unavailable. Please choose another.'; end if;
 insert into order_items(order_id,product_slug,title,qty,unit_price) values(new.id,'sample', 'Sample — '||item.name,1,0);
 end loop;return new;
end $$;
drop trigger if exists order_samples on orders;
create trigger order_samples after insert on orders for each row execute function reserve_order_samples();
commit;
