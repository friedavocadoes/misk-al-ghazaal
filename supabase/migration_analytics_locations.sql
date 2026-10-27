-- Apply after migration_analytics.sql (and existing survey upgrade).
-- Coarse edge-derived location; no raw IP, GPS or inferred historical cities.
begin;
alter table public.analytics_sessions
 add column if not exists region text,
 add column if not exists city text,
 add column if not exists emirate text,
 add column if not exists location_source text;
create index if not exists analytics_sessions_location on public.analytics_sessions(country,emirate,created_at);

-- Preserve the first available location per session; missing details may fill in
-- later only from the same country. Do not relabel a session after a VPN move.
create or replace function public.ingest_analytics_event(p_session jsonb,p_event jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
declare sid uuid := (p_session->>'id')::uuid; v text := p_session->>'visitor_id'; seen timestamptz; begin
 insert into analytics_sessions(id,visitor_id,user_id,is_bot,bot_reason,first_touch_utm,last_touch_utm,referrer_domain,device_type,country,region,city,emirate,location_source)
 values(sid,v,(p_session->>'user_id')::uuid,coalesce((p_session->>'is_bot')::boolean,false),p_session->>'bot_reason',coalesce(p_session->'first_touch_utm','{}'),coalesce(p_session->'last_touch_utm','{}'),p_session->>'referrer_domain',coalesce(p_session->>'device_type','desktop'),p_session->>'country',left(p_session->>'region',120),left(p_session->>'city',120),case when p_session->>'country'='AE' and p_session->>'emirate' in ('AZ','DU','SH','AJ','UQ','RK','FU') then p_session->>'emirate' end,left(p_session->>'location_source',20))
 on conflict(id) do update set
 country=coalesce(analytics_sessions.country,excluded.country),
 region=case when analytics_sessions.country is null or analytics_sessions.country=excluded.country then coalesce(analytics_sessions.region,excluded.region) else analytics_sessions.region end,
 city=case when analytics_sessions.country is null or analytics_sessions.country=excluded.country then coalesce(analytics_sessions.city,excluded.city) else analytics_sessions.city end,
 emirate=case when analytics_sessions.country is null or analytics_sessions.country=excluded.country then coalesce(analytics_sessions.emirate,excluded.emirate) else analytics_sessions.emirate end,
 location_source=coalesce(analytics_sessions.location_source,excluded.location_source),
 last_seen_at=now(), is_bot=analytics_sessions.is_bot OR excluded.is_bot,
 bot_reason=coalesce(analytics_sessions.bot_reason,excluded.bot_reason),
 user_id=coalesce(excluded.user_id,analytics_sessions.user_id),
 last_touch_utm=case when excluded.last_touch_utm <> '{}'::jsonb then excluded.last_touch_utm else analytics_sessions.last_touch_utm end,
 last_active_at=case when coalesce((p_session->>'active_seconds')::int,0)>0 then now() else analytics_sessions.last_active_at end,
 active_seconds=analytics_sessions.active_seconds + least(60,greatest(0,coalesce((p_session->>'active_seconds')::int,0)),greatest(0,extract(epoch from now()-analytics_sessions.last_active_at)::int));
 -- Bound spam per session. Server-verified purchases are never discarded here.
 if p_event is null then return; end if;
 if p_event->>'event_type'<>'purchase' and (select count(*) from analytics_events where session_id=sid and created_at>now()-interval '1 minute')>=120 then return; end if;
 insert into analytics_events(id,session_id,visitor_id,event_type,page_path,product_id,product_name,product_price,quantity,order_id,revenue,metadata)
 values(coalesce((p_event->>'id')::uuid,gen_random_uuid()),sid,v,p_event->>'event_type',left(coalesce(p_event->>'page_path','/'),500),p_event->>'product_id',left(p_event->>'product_name',200),(p_event->>'product_price')::numeric,coalesce((p_event->>'quantity')::int,1),p_event->>'order_id',(p_event->>'revenue')::numeric,coalesce(p_event->'metadata','{}'))
 on conflict do nothing;
end $$;

create or replace function public.analytics_locations(
 start_date timestamptz,end_date timestamptz,include_bots boolean default false,
 bots_only boolean default false,filter_country text default '',filter_emirate text default ''
)
returns jsonb language sql stable security definer set search_path=public as $$
with s as (
 select s.* from analytics_sessions s
 where s.created_at<end_date
 and (s.created_at>=start_date or exists(select 1 from analytics_events e where e.session_id=s.id and e.created_at>=start_date and e.created_at<end_date))
 and case when bots_only then s.is_bot when include_bots then true else not s.is_bot end
), e as (
 select e.* from analytics_events e join s on s.id=e.session_id
 where e.created_at>=start_date and e.created_at<end_date
), metrics as (
 select s.id,s.visitor_id,coalesce(s.user_id::text,s.visitor_id) as buyer_id,
 s.country,s.region,s.city,s.emirate,
 count(e.id) filter(where e.event_type='page_view') as views,
 count(e.id) filter(where e.event_type='purchase') as orders,
 coalesce(sum(e.revenue) filter(where e.event_type='purchase'),0) as revenue
 from s left join e on e.session_id=s.id group by s.id,s.visitor_id,s.user_id,s.country,s.region,s.city,s.emirate
), chosen as (
 select * from metrics where (filter_country='' or country=filter_country)
 and (filter_emirate='' or (country='AE' and emirate=filter_emirate))
), country_rows as (
 select country,count(distinct visitor_id) as visitors,count(*) as sessions,sum(views) as views,
 count(distinct buyer_id) filter(where orders>0) as buyers,sum(orders) as orders,sum(revenue) as revenue,
 coalesce(round(100.0*count(*) filter(where orders>0)/nullif(count(*),0),2),0) as conversion_rate
 from metrics group by country
), emirate_rows as (
 select emirate,count(distinct visitor_id) as visitors,count(*) as sessions,sum(views) as views,
 count(distinct buyer_id) filter(where orders>0) as buyers,sum(orders) as orders,sum(revenue) as revenue,
 coalesce(round(100.0*count(*) filter(where orders>0)/nullif(count(*),0),2),0) as conversion_rate
 from metrics where country='AE' group by emirate
), city_rows as (
 select country,region,emirate,city,count(distinct visitor_id) as visitors,count(*) as sessions,sum(views) as views,
 count(distinct buyer_id) filter(where orders>0) as buyers,sum(orders) as orders,sum(revenue) as revenue,
 coalesce(round(100.0*count(*) filter(where orders>0)/nullif(count(*),0),2),0) as conversion_rate
 from chosen group by country,region,emirate,city
), page_sessions as (
 select e.page_path,e.session_id,min(e.created_at) as first_view,count(*) as views
 from e join chosen c on c.id=e.session_id where e.event_type='page_view' group by e.page_path,e.session_id
), page_metrics as (
 select p.*,c.visitor_id,c.buyer_id,coalesce(b.orders,0) as orders,coalesce(b.revenue,0) as revenue
 from page_sessions p join chosen c on c.id=p.session_id
 cross join lateral (
  select count(*) as orders,coalesce(sum(b.revenue),0) as revenue from e b
  where b.session_id=p.session_id and b.event_type='purchase' and b.created_at>=p.first_view
 ) b
), pages as (
 select page_path,sum(views) as views,count(distinct visitor_id) as visitors,count(*) as sessions,
 count(distinct buyer_id) filter(where orders>0) as buyers,sum(orders) as orders,sum(revenue) as revenue,
 coalesce(round(100.0*count(*) filter(where orders>0)/nullif(count(*),0),2),0) as conversion_rate
 from page_metrics group by page_path
)
select jsonb_build_object(
 'summary',(select jsonb_build_object(
  'visitors',count(distinct visitor_id),'sessions',count(*),'views',coalesce(sum(views),0),
  'buyers',count(distinct buyer_id) filter(where orders>0),'orders',coalesce(sum(orders),0),'revenue',coalesce(sum(revenue),0),
  'conversion_rate',coalesce(round(100.0*count(*) filter(where orders>0)/nullif(count(*),0),2),0),
  'located_sessions',count(*) filter(where country is not null),
  'uae_sessions',count(*) filter(where country='AE'),
  'emirate_sessions',count(*) filter(where country='AE' and emirate is not null)
 ) from chosen),
 'countries',coalesce((select jsonb_agg(r) from (select * from country_rows order by visitors desc,country nulls last limit 250) r),'[]'::jsonb),
 'emirates',coalesce((select jsonb_agg(r) from (select * from emirate_rows order by visitors desc,emirate nulls last) r),'[]'::jsonb),
 'cities',coalesce((select jsonb_agg(r) from (select * from city_rows order by visitors desc,country,city nulls last limit 200) r),'[]'::jsonb),
 'pages',coalesce((select jsonb_agg(r) from (select * from pages order by views desc,page_path limit 200) r),'[]'::jsonb),
 'visits',coalesce((select jsonb_agg(r) from (
  select c.id as session_id,c.visitor_id,c.country,c.region,c.emirate,c.city,c.views,c.orders,
   s.created_at,s.last_seen_at,s.location_source
  from chosen c join s on s.id=c.id order by s.last_seen_at desc,c.id limit 100
 ) r),'[]'::jsonb)
);
$$;
revoke all on function public.ingest_analytics_event(jsonb,jsonb),public.analytics_locations(timestamptz,timestamptz,boolean,boolean,text,text) from public,anon,authenticated;
grant execute on function public.ingest_analytics_event(jsonb,jsonb),public.analytics_locations(timestamptz,timestamptz,boolean,boolean,text,text) to service_role;
commit;
