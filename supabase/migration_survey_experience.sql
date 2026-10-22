-- Apply AFTER migration_analytics.sql. Existing feedback is preserved.
begin;
alter table public.analytics_abandonment_surveys
 add column if not exists survey_type text not null default 'cart',
 add column if not exists trigger text not null default 'unknown',
 add column if not exists product_id text,
 add column if not exists product_name text;
alter table public.analytics_abandonment_surveys drop constraint if exists analytics_abandonment_surveys_reason_check;
alter table public.analytics_abandonment_surveys add constraint analytics_abandonment_surveys_reason_check check(reason in ('shipping_cost','just_browsing','price_too_high','payment_issue','delivery_time','other','scent_unsure','need_more_details','stock_issue','not_ready'));
alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events add constraint analytics_events_event_type_check check(event_type in ('page_view','product_view','add_to_cart','remove_from_cart','checkout_started','purchase','survey_opportunity','survey_shown','survey_dismissed'));
create or replace function public.analytics_report(start_date timestamptz,end_date timestamptz,include_bots boolean default false,bots_only boolean default false,attribution text default 'last')
returns jsonb language sql stable security definer set search_path=public as $$
with all_s as (
 select s.* from analytics_sessions s where s.created_at<end_date and
 (s.created_at>=start_date or exists(select 1 from analytics_events e where e.session_id=s.id and e.created_at>=start_date and e.created_at<end_date))
), s as (select * from all_s where case when bots_only then is_bot when include_bots then true else not is_bot end),
e as (select e.* from analytics_events e join s on s.id=e.session_id where e.created_at>=start_date and e.created_at<end_date),
flags as (select s.id,s.visitor_id,s.user_id,bool_or(e.event_type='product_view') as viewed,bool_or(e.event_type='add_to_cart') as added,count(e.id) filter(where e.event_type='add_to_cart') as cart_adds,bool_or(e.event_type='checkout_started') as checkout,bool_or(e.event_type='purchase') as bought,exists(select 1 from analytics_events purchase where purchase.session_id=s.id and purchase.event_type='purchase') as ever_bought,coalesce(sum(e.revenue) filter(where e.event_type='purchase'),0) as revenue from s left join e on e.session_id=s.id group by s.id,s.visitor_id,s.user_id),
daily as (select (d at time zone 'Asia/Dubai')::date as day from generate_series(date_trunc('day',start_date at time zone 'Asia/Dubai') at time zone 'Asia/Dubai',end_date-interval '1 microsecond',interval '1 day') d),
traffic as (select (ae.created_at at time zone 'Asia/Dubai')::date as day,count(distinct ae.visitor_id) filter(where not ss.is_bot) as real,count(distinct ae.visitor_id) filter(where ss.is_bot) as bots from analytics_events ae join all_s ss on ss.id=ae.session_id where ae.created_at>=start_date and ae.created_at<end_date group by 1),
sales as (select (created_at at time zone 'Asia/Dubai')::date as day,sum(revenue) as revenue from e where event_type='purchase' group by 1),
pv as (select product_id,max(product_name) as name,count(*) filter(where event_type='product_view') as views,count(*) filter(where event_type='add_to_cart') as cart_adds,count(distinct session_id) filter(where event_type='add_to_cart' and not exists(select 1 from analytics_events buy where buy.session_id=e.session_id and buy.event_type='purchase')) as dropoffs from e where product_id is not null group by product_id),
pi as (select item->>'product_id' as product_id,max(item->>'product_name') as name,sum((item->>'quantity')::int) as units,sum((item->>'price')::numeric*(item->>'quantity')::int) as revenue,count(distinct session_id) as customers from e cross join lateral jsonb_array_elements(coalesce(e.metadata->'items','[]')) item where event_type='purchase' group by 1),
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

revoke all on function public.analytics_report(timestamptz,timestamptz,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.analytics_report(timestamptz,timestamptz,boolean,boolean,text) to service_role;
commit;
