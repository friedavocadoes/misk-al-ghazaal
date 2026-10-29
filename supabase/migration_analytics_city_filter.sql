-- Apply after migration_paid_feedback.sql. Preserves paid-only revenue.
create or replace function public.analytics_locations_city(
 start_date timestamptz,end_date timestamptz,include_bots boolean default false,
 bots_only boolean default false,filter_country text default '',filter_emirate text default '',filter_city text default ''
)
returns jsonb language sql stable security definer set search_path=public as $$
with s as (
 select s.* from analytics_sessions s
 where s.created_at<end_date
 and (s.created_at>=start_date or exists(select 1 from analytics_events e where e.session_id=s.id and e.created_at>=start_date and e.created_at<end_date))
 and case when bots_only then s.is_bot when include_bots then true else not s.is_bot end
), e as (
 select e.id,e.session_id,e.visitor_id,e.event_type,e.page_path,e.created_at,e.order_id,
 case when e.event_type='purchase' then coalesce(o.total,0) else e.revenue end as revenue
 from analytics_events e join s on s.id=e.session_id
 left join orders o on o.id::text=e.order_id and o.payment_status='paid' and o.deleted_at is null and o.status not in ('cancelled','returned')
 where e.created_at>=start_date and e.created_at<end_date
), metrics as (
 select s.id,s.visitor_id,coalesce(s.user_id::text,s.visitor_id) as buyer_id,
 s.country,s.region,s.city,s.emirate,
 count(e.id) filter(where e.event_type='page_view') as views,
 count(e.id) filter(where e.event_type='purchase') as orders,
 coalesce(sum(e.revenue) filter(where e.event_type='purchase'),0) as revenue
 from s left join e on e.session_id=s.id group by s.id,s.visitor_id,s.user_id,s.country,s.region,s.city,s.emirate
), chosen as (
 select * from metrics where (filter_country='' or country=filter_country) and (filter_city='' or city=filter_city)
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
 'city_options',(select coalesce(jsonb_agg(x order by x.city),'[]') from (select distinct city,country from s where city is not null and (filter_country='' or country=filter_country)) x),
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
revoke all on function public.analytics_locations_city(timestamptz,timestamptz,boolean,boolean,text,text,text) from public,anon,authenticated;
grant execute on function public.analytics_locations_city(timestamptz,timestamptz,boolean,boolean,text,text,text) to service_role;
