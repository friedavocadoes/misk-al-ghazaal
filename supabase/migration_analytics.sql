-- First-party analytics. Run in Supabase SQL editor after existing migrations.
-- All writes and aggregation RPCs are service-role only. No public PII access.
begin;
create table if not exists public.analytics_sessions (
 id uuid primary key, visitor_id text not null, user_id uuid references auth.users(id) on delete set null,
 is_bot boolean not null default false, bot_reason text,
 first_touch_utm jsonb not null default '{}', last_touch_utm jsonb not null default '{}',
 referrer_domain text, device_type text not null default 'desktop' check(device_type in ('mobile','tablet','desktop')),
 country text, created_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 last_active_at timestamptz not null default now(), active_seconds integer not null default 0 check(active_seconds>=0)
);
alter table public.analytics_sessions add column if not exists last_active_at timestamptz not null default now();
create index if not exists analytics_sessions_visitor on public.analytics_sessions(visitor_id);
create index if not exists analytics_sessions_user on public.analytics_sessions(user_id);
create index if not exists analytics_sessions_created on public.analytics_sessions(created_at);
create index if not exists analytics_sessions_seen on public.analytics_sessions(last_seen_at);
create table if not exists public.analytics_events (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.analytics_sessions(id) on delete cascade,
 visitor_id text not null, event_type text not null check(event_type in ('page_view','product_view','add_to_cart','remove_from_cart','checkout_started','purchase')),
 page_path text not null, product_id text, product_name text, product_price numeric, quantity integer not null default 1,
 order_id text, revenue numeric, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists analytics_events_session_time on public.analytics_events(session_id,created_at);
create index if not exists analytics_events_created on public.analytics_events(created_at);
create index if not exists analytics_events_type on public.analytics_events(event_type,created_at);
create index if not exists analytics_events_visitor on public.analytics_events(visitor_id);
create index if not exists analytics_events_product on public.analytics_events(product_id);
create unique index if not exists analytics_purchase_once on public.analytics_events(order_id) where event_type='purchase';
create table if not exists public.analytics_abandonment_surveys (
 id uuid primary key default gen_random_uuid(), session_id uuid not null unique references public.analytics_sessions(id) on delete cascade,
 reason text not null check(reason in ('shipping_cost','just_browsing','price_too_high','payment_issue','delivery_time','other')),
 custom_comment text check(length(custom_comment)<=500), cart_items jsonb not null default '[]', cart_total numeric not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists analytics_surveys_created on public.analytics_abandonment_surveys(created_at);
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_abandonment_surveys enable row level security;
revoke all on public.analytics_sessions, public.analytics_events, public.analytics_abandonment_surveys from anon,authenticated;
grant all on public.analytics_sessions, public.analytics_events, public.analytics_abandonment_surveys to service_role;

-- One transaction: upsert parent BEFORE event insert. Bot classification only escalates.
-- p_event=NULL is a foreground heartbeat: updates presence, without fake page views.
create or replace function public.ingest_analytics_event(p_session jsonb,p_event jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
declare sid uuid := (p_session->>'id')::uuid; v text := p_session->>'visitor_id'; seen timestamptz; begin
 insert into analytics_sessions(id,visitor_id,user_id,is_bot,bot_reason,first_touch_utm,last_touch_utm,referrer_domain,device_type,country)
 values(sid,v,(p_session->>'user_id')::uuid,coalesce((p_session->>'is_bot')::boolean,false),p_session->>'bot_reason',coalesce(p_session->'first_touch_utm','{}'),coalesce(p_session->'last_touch_utm','{}'),p_session->>'referrer_domain',coalesce(p_session->>'device_type','desktop'),p_session->>'country')
 on conflict(id) do update set
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

-- A single indexed SQL aggregation produces all dashboard datasets; no raw event
-- download or Node-side metric math. Ranges are half-open and days use Dubai time.
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
 'comments',coalesce((select jsonb_agg(b) from (select reason,custom_comment,cart_items,cart_total,created_at from surveys where nullif(custom_comment,'') is not null order by created_at desc limit 30) b),'[]')
);
$$;
create or replace function public.analytics_dashboard(start_date timestamptz,end_date timestamptz,include_bots boolean default false,bots_only boolean default false,attribution text default 'last',compare boolean default true)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('current',analytics_report(start_date,end_date,include_bots,bots_only,attribution),'previous',case when compare then analytics_report(start_date-(end_date-start_date),start_date,include_bots,bots_only,attribution) else null end);
$$;
create or replace function public.analytics_live()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('live',(select count(distinct visitor_id) from analytics_sessions where not is_bot and last_seen_at>now()-interval '90 seconds'),
'visitors',(select count(distinct visitor_id) from analytics_sessions where not is_bot),
'orders',(select count(*) from orders where deleted_at is null),
'conversion',(select coalesce(round(100.0*count(distinct e.session_id) filter(where e.event_type='purchase')/nullif(count(distinct s.id),0),2),0) from analytics_sessions s left join analytics_events e on e.session_id=s.id and e.created_at>=date_trunc('month',now() at time zone 'Asia/Dubai') at time zone 'Asia/Dubai' where not s.is_bot and s.last_seen_at>=date_trunc('month',now() at time zone 'Asia/Dubai') at time zone 'Asia/Dubai'));
$$;
-- Restricted account directory: no raw auth metadata or credentials exported.
create or replace function public.analytics_customers(start_date timestamptz,end_date timestamptz,search_text text default '',page_offset integer default 0,page_size integer default 100,promo_filter text default 'all')
returns jsonb language sql stable security definer set search_path=public as $$
with a as (select user_id,count(*) as sessions,sum(active_seconds) as active_seconds,min(created_at) as first_seen,max(last_seen_at) as last_seen from analytics_sessions where user_id is not null and not is_bot and created_at>=start_date and created_at<end_date group by user_id),
o as (select user_id,count(*) as orders,sum(total) as spent from orders where deleted_at is null and status not in ('cancelled','returned') and created_at>=start_date and created_at<end_date group by user_id),
people as (select p.id,u.email,p.full_name,p.phone,p.default_address,p.promo_opt_in,p.order_updates_opt_in,coalesce(a.sessions,0) as sessions,coalesce(a.active_seconds,0) as active_seconds,a.first_seen,a.last_seen,coalesce(o.orders,0) as orders,coalesce(o.spent,0) as spent from profiles p join auth.users u on u.id=p.id left join a on a.user_id=p.id left join o on o.user_id=p.id where p.role='customer' and (search_text='' or u.email ilike '%'||search_text||'%' or p.full_name ilike '%'||search_text||'%' or p.phone ilike '%'||search_text||'%') and (promo_filter='all' or p.promo_opt_in=(promo_filter='yes')))
select jsonb_build_object('total',(select count(*) from people),'rows',coalesce((select jsonb_agg(r) from (select * from people order by id offset greatest(0,page_offset) limit least(500,greatest(1,page_size))) r),'[]'));
$$;
revoke all on function public.ingest_analytics_event(jsonb,jsonb),public.analytics_report(timestamptz,timestamptz,boolean,boolean,text),public.analytics_dashboard(timestamptz,timestamptz,boolean,boolean,text,boolean),public.analytics_live(),public.analytics_customers(timestamptz,timestamptz,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.ingest_analytics_event(jsonb,jsonb),public.analytics_report(timestamptz,timestamptz,boolean,boolean,text),public.analytics_dashboard(timestamptz,timestamptz,boolean,boolean,text,boolean),public.analytics_live(),public.analytics_customers(timestamptz,timestamptz,text,integer,integer,text) to service_role;
commit;
