-- Central stockists. All-product stores include future products automatically.
begin;
create table if not exists public.retail_stores (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 180), name_ar text,
 location text not null default '', location_ar text,
 address text not null default '', address_ar text,
 maps_url text not null default '', phone text not null default '', hours text not null default '', hours_ar text,
 active boolean not null default true, all_products boolean not null default false,
 sort integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.product_retail_stores (
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 available boolean not null default true,
 primary key(store_id,product_id)
);
create index if not exists product_retail_stores_product on public.product_retail_stores(product_id);
alter table public.retail_stores enable row level security;
alter table public.product_retail_stores enable row level security;
grant select on public.retail_stores,public.product_retail_stores to anon,authenticated;
grant insert,update,delete on public.retail_stores,public.product_retail_stores to authenticated;
drop policy if exists "public active stockists" on public.retail_stores;
create policy "public active stockists" on public.retail_stores for select using(active or public.is_super_admin(auth.uid()));
drop policy if exists "admin manage stockists" on public.retail_stores;
create policy "admin manage stockists" on public.retail_stores for all to authenticated using(public.is_super_admin(auth.uid())) with check(public.is_super_admin(auth.uid()));
drop policy if exists "public stockist assignments" on public.product_retail_stores;
create policy "public stockist assignments" on public.product_retail_stores for select using(exists(select 1 from public.retail_stores s where s.id=store_id and s.active) or public.is_super_admin(auth.uid()));
drop policy if exists "admin manage stockist assignments" on public.product_retail_stores;
create policy "admin manage stockist assignments" on public.product_retail_stores for all to authenticated using(public.is_super_admin(auth.uid())) with check(public.is_super_admin(auth.uid()));

-- Add/remove selected products transactionally. For all-products stores, a false
-- assignment is an exception; for selected-products stores, true is an inclusion.
create or replace function public.assign_retail_store(p_store_id uuid,p_product_ids uuid[],p_available boolean)
returns integer language plpgsql security definer set search_path=public as $$
declare selected_ids uuid[]; affected integer;
begin
 if not public.is_super_admin(auth.uid()) then raise exception 'Administrator access required'; end if;
 perform 1 from retail_stores where id=p_store_id for update;
 if not found then raise exception 'Store not found'; end if;
 if p_available is null then raise exception 'Choose an assignment action'; end if;
 select array_agg(distinct id) into selected_ids from unnest(p_product_ids) id;
 if coalesce(cardinality(selected_ids),0)=0 or cardinality(selected_ids)>5000 then raise exception 'Select between 1 and 5000 products'; end if;
 if (select count(*) from products where id=any(selected_ids) and deleted_at is null)<>cardinality(selected_ids) then raise exception 'A selected product is no longer available'; end if;
 insert into product_retail_stores(store_id,product_id,available)
 select p_store_id,id,p_available from unnest(selected_ids) id
 on conflict(store_id,product_id) do update set available=excluded.available;
 get diagnostics affected=row_count;
 return affected;
end $$;
revoke all on function public.assign_retail_store(uuid,uuid[],boolean) from public,anon;
grant execute on function public.assign_retail_store(uuid,uuid[],boolean) to authenticated;

-- Stable ID + DO NOTHING preserves edits when the migration is repeated.
insert into public.retail_stores(id,name,location,address,all_products,sort)
values('c4000000-0000-4000-8000-000000000001','Misk Al Ghazaal — Mamzar Centre','Dubai','Shop 08, Mamzar Center, Dubai, UAE',true,0)
on conflict(id) do nothing;
commit;
