-- Apply AFTER migration_orders_workspace.sql, analytics locations and existing survey migrations.
-- Financial aggregates follow current fully-paid order state; raw behavior events stay historical.
begin;
create or replace function public.admin_orders_report(
 search_text text default '',filter_status text default '',filter_payment text default '',filter_method text default '',
 start_date timestamptz default null,end_date timestamptz default null,
 page_offset integer default 0,page_size integer default 50,sort_order text default 'newest',selected_ids uuid[] default null
) returns jsonb language sql stable security definer set search_path=public as $$
with filtered as (
 select o.* from orders o where deleted_at is null
 and (selected_ids is null or id=any(selected_ids))
 and (filter_status='' or status=filter_status) and(filter_payment='' or payment_status=filter_payment)
 and(filter_method='' or payment_method=filter_method)
 and(start_date is null or created_at>=start_date) and(end_date is null or created_at<end_date)
 and(search_text='' or order_no ilike '%'||search_text||'%' or customer_name ilike '%'||search_text||'%'
  or email ilike '%'||search_text||'%' or phone ilike '%'||search_text||'%' or tracking_no ilike '%'||search_text||'%')
), page as (
 select id,order_no,created_at,customer_name,email,phone,total,status,payment_method,payment_status,tracking_no
 from filtered order by
 case when sort_order='oldest' then created_at end asc,
 case when sort_order='total_high' then total end desc,
 case when sort_order='total_low' then total end asc,
 case when sort_order not in ('oldest','total_high','total_low') then created_at end desc,id
 offset greatest(0,page_offset) limit least(500,greatest(1,page_size))
)
select jsonb_build_object(
 'total',(select count(*) from filtered),
 'summary',(select jsonb_build_object('orders',count(*),'value',coalesce(sum(total) filter(where payment_status='paid' and status not in ('cancelled','returned')),0),
 'unpaid',count(*) filter(where payment_status in ('pending','partially_paid') and status not in ('cancelled','returned')),
 'dispatched',count(*) filter(where status in ('dispatched','out_for_delivery')),'delivered',count(*) filter(where status='delivered'),
 'items',coalesce((select sum(i.qty) from order_items i join filtered f on f.id=i.order_id),0)) from filtered),
 'rows',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('order_items',coalesce((select jsonb_agg(jsonb_build_object('title',i.title,'qty',i.qty) order by i.created_at,i.id) from order_items i where i.order_id=p.id),'[]'::jsonb))) from page p),'[]'::jsonb)
);
$$;
create or replace function public.analytics_report(start_date timestamptz,end_date timestamptz,include_bots boolean default false,bots_only boolean default false,attribution text default 'last')
returns jsonb language sql stable security definer set search_path=public as $$
with all_s as (
 select s.* from analytics_sessions s where s.created_at<end_date and
 (s.created_at>=start_date or exists(select 1 from analytics_events e where e.session_id=s.id and e.created_at>=start_date and e.created_at<end_date))
), s as (select * from all_s where case when bots_only then is_bot when include_bots then true else not is_bot end),
e as (select e.id,e.session_id,e.visitor_id,e.event_type,e.page_path,e.product_id,e.product_name,e.product_price,e.quantity,e.order_id,
 case when e.event_type='purchase' then coalesce(o.total,0) else e.revenue end as revenue,
 (o.id is not null) as paid_order,e.metadata,e.created_at
 from analytics_events e join s on s.id=e.session_id
 left join orders o on o.id::text=e.order_id and o.payment_status='paid' and o.deleted_at is null and o.status not in ('cancelled','returned')
 where e.created_at>=start_date and e.created_at<end_date),
flags as (select s.id,s.visitor_id,s.user_id,bool_or(e.event_type='product_view') as viewed,bool_or(e.event_type='add_to_cart') as added,count(e.id) filter(where e.event_type='add_to_cart') as cart_adds,bool_or(e.event_type='checkout_started') as checkout,bool_or(e.event_type='purchase') as bought,exists(select 1 from analytics_events purchase where purchase.session_id=s.id and purchase.event_type='purchase') as ever_bought,coalesce(sum(e.revenue) filter(where e.event_type='purchase'),0) as revenue from s left join e on e.session_id=s.id group by s.id,s.visitor_id,s.user_id),
daily as (select (d at time zone 'Asia/Dubai')::date as day from generate_series(date_trunc('day',start_date at time zone 'Asia/Dubai') at time zone 'Asia/Dubai',end_date-interval '1 microsecond',interval '1 day') d),
traffic as (select (ae.created_at at time zone 'Asia/Dubai')::date as day,count(distinct ae.visitor_id) filter(where not ss.is_bot) as real,count(distinct ae.visitor_id) filter(where ss.is_bot) as bots from analytics_events ae join all_s ss on ss.id=ae.session_id where ae.created_at>=start_date and ae.created_at<end_date group by 1),
sales as (select (created_at at time zone 'Asia/Dubai')::date as day,sum(revenue) as revenue from e where event_type='purchase' group by 1),
pv as (select product_id,max(product_name) as name,count(*) filter(where event_type='product_view') as views,count(*) filter(where event_type='add_to_cart') as cart_adds,count(distinct session_id) filter(where event_type='add_to_cart' and not exists(select 1 from analytics_events buy where buy.session_id=e.session_id and buy.event_type='purchase')) as dropoffs from e where product_id is not null group by product_id),
pi as (select item->>'product_id' as product_id,max(item->>'product_name') as name,sum((item->>'quantity')::int) as units,sum((item->>'price')::numeric*(item->>'quantity')::int) filter(where paid_order) as revenue,count(distinct session_id) as customers from e cross join lateral jsonb_array_elements(coalesce(e.metadata->'items','[]')) item where event_type='purchase' group by 1),
products as (select coalesce(pv.product_id,pi.product_id) as product_id,coalesce(pv.name,pi.name) as product_name,coalesce(views,0) as views,coalesce(cart_adds,0) as cart_adds,coalesce(dropoffs,0) as cart_no_buy_count,coalesce(units,0) as purchases,coalesce(round(100.0*pi.customers/nullif(views,0),2),0) as conversion_rate,coalesce(pi.revenue,0) as total_revenue from pv full join pi using(product_id)),
acq as (select coalesce(nullif(t->>'source',''),nullif(t->>'referrer',''),nullif(s.referrer_domain,'direct'),'direct') as source,coalesce(nullif(t->>'medium',''),'none') as medium,coalesce(t->>'campaign','') as campaign,coalesce(t->>'referrer',s.referrer_domain,'direct') as referrer_domain,count(distinct s.visitor_id) as visitors,sum(f.cart_adds) as cart_adds,count(distinct coalesce(s.user_id::text,s.visitor_id)) filter(where f.bought) as customers,coalesce(round(100.0*count(*) filter(where f.bought)/nullif(count(*),0),2),0) as conversion_rate,sum(f.revenue) as revenue from s join flags f on f.id=s.id cross join lateral (select case when attribution='first' then s.first_touch_utm else s.last_touch_utm end as t) touch group by 1,2,3,4),
surveys as (select a.* from analytics_abandonment_surveys a join s on s.id=a.session_id where a.created_at>=start_date and a.created_at<end_date)
select jsonb_build_object(
 'kpis',jsonb_build_object('viewers',(select count(distinct visitor_id) from s),'sessions',(select count(*) from s),'revenue',(select coalesce(sum(revenue),0) from flags),'conversion_rate',(select coalesce(round(100.0*count(*) filter(where bought)/nullif(count(*),0),2),0) from flags),'abandonment_rate',(select coalesce(round(100.0*count(*) filter(where added and not ever_bought)/nullif(count(*) filter(where added),0),2),0) from flags),'dropoffs',(select count(*) from flags where added and not ever_bought),'real_viewers',(select count(distinct visitor_id) from all_s where not is_bot),'bot_viewers',(select count(distinct visitor_id) from all_s where is_bot),'orders',(select count(*) from e where event_type='purchase')),
 'daily',coalesce((select jsonb_agg(jsonb_build_object('day',d.day,'real',coalesce(t.real,0),'bots',coalesce(t.bots,0),'revenue',coalesce(sales.revenue,0)) order by d.day) from daily d left join traffic t using(day) left join sales using(day)),'[]'),
 'products',coalesce((select jsonb_agg(p) from (select * from products order by views desc limit 500) p),'[]'),
 'acquisition',coalesce((select jsonb_agg(a) from (select * from acq order by customers desc,revenue desc limit 500) a),'[]'),
 'funnel',(select jsonb_build_array(jsonb_build_object('name','Viewers','value',count(*)),jsonb_build_object('name','Product viewers','value',count(*) filter(where viewed)),jsonb_build_object('name','Added to cart','value',count(*) filter(where added)),jsonb_build_object('name','Started checkout','value',count(*) filter(where checkout)),jsonb_build_object('name','Purchased','value',count(*) filter(where bought))) from flags),
 'bots',coalesce((select jsonb_agg(b) from (select coalesce(bot_reason,'unknown') as reason,count(*) as count from all_s where is_bot group by 1 order by count(*) desc) b),'[]'),
 'surveys',coalesce((select jsonb_agg(b) from (select reason,count(*) as count from surveys group by reason order by count(*) desc) b),'[]'),
 'survey_activity',jsonb_build_object('opportunities',(select count(*) from e where event_type='survey_opportunity'),'shown',(select count(*) from e where event_type='survey_shown'),'dismissed',(select count(*) from e where event_type='survey_dismissed'),'responses',(select count(*) from surveys),'responded_shown',(select count(*) from surveys where exists(select 1 from e shown where shown.session_id=surveys.session_id and shown.event_type='survey_shown'))),
 'survey_contexts',coalesce((select jsonb_agg(b) from (select survey_type,trigger,count(*) as count from surveys group by 1,2 order by count(*) desc) b),'[]'),
 'responses',coalesce((select jsonb_agg(b) from (select id,survey_type,trigger,product_id,product_name,reason,custom_comment,cart_items,cart_total,created_at from surveys order by created_at desc limit 100) b),'[]'),
 'comments',coalesce((select jsonb_agg(b) from (select reason,custom_comment,cart_items,cart_total,created_at from surveys where nullif(custom_comment,'') is not null order by created_at desc limit 30) b),'[]')
);
$$;
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
create or replace function public.analytics_customers(start_date timestamptz,end_date timestamptz,search_text text default '',page_offset integer default 0,page_size integer default 100,promo_filter text default 'all')
returns jsonb language sql stable security definer set search_path=public as $$
with a as (select user_id,count(*) as sessions,sum(active_seconds) as active_seconds,min(created_at) as first_seen,max(last_seen_at) as last_seen from analytics_sessions where user_id is not null and not is_bot and created_at>=start_date and created_at<end_date group by user_id),
o as (select user_id,count(*) as orders,sum(total) filter(where payment_status='paid') as spent from orders where deleted_at is null and status not in ('cancelled','returned') and created_at>=start_date and created_at<end_date group by user_id),
people as (select p.id,u.email,p.full_name,p.phone,p.default_address,p.promo_opt_in,p.order_updates_opt_in,coalesce(a.sessions,0) as sessions,coalesce(a.active_seconds,0) as active_seconds,a.first_seen,a.last_seen,coalesce(o.orders,0) as orders,coalesce(o.spent,0) as spent from profiles p join auth.users u on u.id=p.id left join a on a.user_id=p.id left join o on o.user_id=p.id where p.role='customer' and (search_text='' or u.email ilike '%'||search_text||'%' or p.full_name ilike '%'||search_text||'%' or p.phone ilike '%'||search_text||'%') and (promo_filter='all' or p.promo_opt_in=(promo_filter='yes')))
select jsonb_build_object('total',(select count(*) from people),'rows',coalesce((select jsonb_agg(r) from (select * from people order by id offset greatest(0,page_offset) limit least(500,greatest(1,page_size))) r),'[]'));
$$;
