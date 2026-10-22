-- Requires migration_analytics.sql + migration_audit_log.sql.
-- Demand is refreshed at most once per five minutes, after analytics ingestion.
begin;
alter table public.products add column if not exists demand_score numeric not null default 0;
alter table public.products add column if not exists auto_best_seller boolean not null default false;
alter table public.products add column if not exists bestseller_mode text;
update public.products set bestseller_mode=case when is_best_seller then 'pinned' else 'auto' end where bestseller_mode is null;
alter table public.products alter column bestseller_mode set default 'auto';
alter table public.products alter column bestseller_mode set not null;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='products_bestseller_mode_check') then
  alter table public.products add constraint products_bestseller_mode_check check(bestseller_mode in ('auto','pinned','excluded'));
 end if;
end $$;
create table if not exists public.product_ranking_clock(id boolean primary key default true check(id), refreshed_at timestamptz not null default '-infinity');
insert into public.product_ranking_clock(id) values(true) on conflict do nothing;
alter table public.product_ranking_clock enable row level security;
revoke all on public.product_ranking_clock from anon,authenticated;
grant all on public.product_ranking_clock to service_role;

create or replace function public.refresh_product_demand(p_force boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare last_refresh timestamptz; changed text[]:='{}'; tags_changed int:=0; current_row record;
begin
 -- Serialize refreshes without blocking concurrent event writes or requests.
 if not pg_try_advisory_xact_lock(780221004) then return jsonb_build_object('refreshed',false); end if;
 select refreshed_at into last_refresh from product_ranking_clock where id=true for update;
 if not p_force and last_refresh > now()-interval '5 minutes' then return jsonb_build_object('refreshed',false); end if;
 update product_ranking_clock set refreshed_at=now() where id=true;
 for current_row in
 with human_events as not materialized (
  select e.* from analytics_events e join analytics_sessions s on s.id=e.session_id
  left join profiles a on a.id=s.user_id
  where not s.is_bot and (a.id is null or a.role='customer')
    and e.created_at>=now()-interval '30 days'
    and e.event_type in ('product_view','add_to_cart','remove_from_cart','checkout_started')
 ),
 -- Refresh spam contributes at most one signal per visitor/product/day.
 signals as (
  select product_id,visitor_id,(created_at at time zone 'Asia/Dubai')::date as day,
    bool_or(event_type='product_view') as viewed,
    bool_or(event_type='add_to_cart') as added,
    bool_or(event_type='add_to_cart' and exists(
      select 1 from human_events c where c.session_id=e.session_id and c.event_type='checkout_started' and c.created_at>=e.created_at
      and c.created_at<e.created_at+interval '1 day'
      and not exists(select 1 from human_events r where r.session_id=e.session_id and r.product_id=e.product_id and r.event_type='remove_from_cart' and r.created_at>e.created_at and r.created_at<=c.created_at)
    )) as checkout
  from human_events e where product_id is not null group by 1,2,3
 ),
 engagement as (
  select product_id,count(distinct visitor_id) as people,
    sum((case when viewed then 0.5 else 0 end + case when added then 1.5 else 0 end + case when checkout then 2 else 0 end)
      * power(0.5, greatest(0,(now() at time zone 'Asia/Dubai')::date-day)::numeric/7)) as score
  from signals group by 1
 ),
 -- Orders are authoritative, including orders placed with analytics blocked.
 -- Cap units per order; cancelled, returned and binned orders do not contribute.
 purchases as (
  select oi.product_slug, o.id, max(o.created_at) as bought_at, least(3,sum(oi.qty)) as units
  from order_items oi join orders o on o.id=oi.order_id
  left join profiles a on a.id=o.user_id
  where o.deleted_at is null and o.status not in ('cancelled','returned')
    and o.created_at>=now()-interval '30 days' and (a.id is null or a.role='customer')
  group by oi.product_slug,o.id
 ),
 sales as (
  select product_slug,count(*) as orders,
    sum(6*(1+0.25*(units-1))*power(0.5,extract(epoch from now()-bought_at)/604800)) as score
  from purchases group by 1
 ),
 scored as (
  select p.id,p.slug,p.title,p.is_best_seller,p.auto_best_seller,p.bestseller_mode,p.demand_score as old_score,
    round(coalesce(e.score,0)+coalesce(s.score,0),3) as score,
    coalesce(e.people,0) as people,coalesce(s.orders,0) as orders,
    (coalesce(p.is_active,true) and p.deleted_at is null) as eligible
  from products p left join engagement e on e.product_id=p.slug left join sales s on s.product_slug=p.slug
 ),
 candidates as (
  select *,row_number() over(order by score desc,orders desc,slug) as position
  from scored where eligible and score>=5 and (people>=3 or orders>=2) and bestseller_mode<>'excluded'
 ),
 limits as (
  select least(8,greatest(1,ceil(count(*)*0.15)))::int as slots from scored where eligible
 ),
 cutoff as (
  select min(score) as threshold from candidates,limits where position<=slots
 ),
 results as (
  select s.*,coalesce(c.position<=l.slots or (s.auto_best_seller and c.score>=k.threshold*0.8),false) as auto_tag
  from scored s left join candidates c on c.id=s.id cross join limits l cross join cutoff k
 )
 select *,case bestseller_mode when 'pinned' then true when 'excluded' then false else auto_tag end as new_tag
 from results
 loop
   if current_row.score is distinct from current_row.old_score or current_row.auto_tag is distinct from current_row.auto_best_seller or current_row.new_tag is distinct from current_row.is_best_seller then
   update products set demand_score=current_row.score,auto_best_seller=current_row.auto_tag,is_best_seller=current_row.new_tag where id=current_row.id;
   changed:=array_append(changed,current_row.slug);
   end if;
   if current_row.is_best_seller is distinct from current_row.new_tag then
     tags_changed:=tags_changed+1;
     insert into admin_audit_log(user_email,user_role,category,action,entity,entity_id,entity_label,summary,details)
     values('System','system','products','auto_rank','product',current_row.id::text,current_row.title,
       case when current_row.new_tag then 'Automatically tagged bestseller: ' else 'Automatically removed bestseller tag: ' end || current_row.title,
       jsonb_build_object('algorithm','demand-v1','score',current_row.score,'unique_visitors',current_row.people,'orders',current_row.orders,'mode',current_row.bestseller_mode,'previous',current_row.is_best_seller,'current',current_row.new_tag));
   end if;
 end loop;
 return jsonb_build_object('refreshed',true,'slugs',to_jsonb(changed),'tagChanges',tags_changed);
end $$;
revoke all on function public.refresh_product_demand(boolean) from public,anon,authenticated;
grant execute on function public.refresh_product_demand(boolean) to service_role;
commit;
-- Initial backfill uses actual existing activity and orders only.
select public.refresh_product_demand(true);
