-- Apply after contact inbox, orders workspace and review migrations.
create table if not exists public.admin_attention_reads (
 staff_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('order','contact','review')),
 entity_id uuid not null, read_at timestamptz not null default now(),
 primary key(staff_id,kind,entity_id)
);
alter table public.admin_attention_reads enable row level security;
revoke all on public.admin_attention_reads from anon,authenticated;
grant all on public.admin_attention_reads to service_role;
create index if not exists contact_inbox_created on public.contact_messages(created_at desc,id);
create index if not exists attention_new_orders on public.orders(created_at desc,id) where deleted_at is null and status='new';
create index if not exists attention_pending_reviews on public.reviews(created_at desc,id) where approved=false;

create or replace function public.admin_attention_feed(p_actor uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_role text; result jsonb;
begin
 select role into actor_role from profiles where id=p_actor;
 if actor_role is null or actor_role not in ('super_admin','orders') then raise exception 'Not authorized'; end if;
 with candidates as (
  select 'order'::text as kind,o.id,o.created_at,'New order '||o.order_no as title,
    coalesce(o.customer_name,'Customer')||' · AED '||to_char(o.total,'FM999999990.00') as detail,
    '/admin/orders/'||o.id::text as href
  from orders o where o.status='new' and o.deleted_at is null
  union all
  select 'contact',m.id,m.created_at,coalesce(nullif(m.data->>'name',''),'Customer')||' · '||case m.topic when 'meeting' then 'Private label' when 'review' then 'Feedback' else 'Client care' end,
    left(m.data->>'message',130),'/admin/inbox/'||m.id::text from contact_messages m
  union all
  select 'review',r.id,r.created_at,'New '||r.rating||'-star review',coalesce(p.title,'Product')||' · '||left(coalesce(r.body,r.title,''),100),'/admin/reviews/'||r.id::text
  from reviews r left join products p on p.id=r.product_id where not r.approved and actor_role='super_admin'
 ), unread as (
  select c.* from candidates c where not exists(select 1 from admin_attention_reads r where r.staff_id=p_actor and r.kind=c.kind and r.entity_id=c.id)
 ) select jsonb_build_object('counts',jsonb_build_object('order',(select count(*) from unread where kind='order'),'contact',(select count(*) from unread where kind='contact'),'review',(select count(*) from unread where kind='review'),'total',(select count(*) from unread)),
 'items',coalesce((select jsonb_agg(to_jsonb(s) order by created_at desc,id) from(select * from unread order by created_at desc,id limit 20)s),'[]'::jsonb)) into result;
 return result;
end $$;

create or replace function public.admin_attention_mark(p_actor uuid,p_kind text,p_id uuid,p_read boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_role text; available boolean:=false;
begin
 select role into actor_role from profiles where id=p_actor;
 if actor_role is null or actor_role not in ('super_admin','orders') then raise exception 'Not authorized';end if;
 if p_kind='order' then select exists(select 1 from orders where id=p_id and deleted_at is null) into available;
 elsif p_kind='contact' then select exists(select 1 from contact_messages where id=p_id) into available;
 elsif p_kind='review' and actor_role='super_admin' then select exists(select 1 from reviews where id=p_id) into available;
 end if;
 if not available then raise exception 'Item unavailable';end if;
 if p_read then insert into admin_attention_reads(staff_id,kind,entity_id) values(p_actor,p_kind,p_id) on conflict(staff_id,kind,entity_id) do update set read_at=now();
 else delete from admin_attention_reads where staff_id=p_actor and kind=p_kind and entity_id=p_id;end if;
end $$;

create or replace function public.admin_contact_inbox(p_actor uuid,p_topic text default '',p_state text default 'all',p_query text default '',p_page int default 1) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role in ('super_admin','orders')) then raise exception 'Not authorized';end if;
 if p_topic not in ('','meeting','review','complaint') or p_state not in ('all','unread','read') then raise exception 'Invalid inbox filter';end if;
 with messages as (
 select m.*,exists(select 1 from admin_attention_reads r where r.staff_id=p_actor and r.kind='contact' and r.entity_id=m.id) as is_read from contact_messages m
 ), matched as (
 select * from messages where (p_topic='' or topic=p_topic) and (p_state='all' or is_read=(p_state='read'))
 and (p_query='' or email ilike '%'||p_query||'%' or reference ilike '%'||p_query||'%' or data->>'name' ilike '%'||p_query||'%' or data->>'message' ilike '%'||p_query||'%')
 ), page as (
 select id,reference,topic,email,data->>'name' as name,left(data->>'message',170) as preview,created_at,is_read from matched order by created_at desc,id limit 30 offset (greatest(1,least(p_page,100000))-1)*30
 ) select jsonb_build_object('total',(select count(*) from matched),'all_count',(select count(*) from messages),'unread',(select count(*) from messages where not is_read),
 'topic_counts',jsonb_build_object('meeting',(select count(*) from messages where topic='meeting'),'review',(select count(*) from messages where topic='review'),'complaint',(select count(*) from messages where topic='complaint')),
 'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from page p),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_attention_feed(uuid) from public,anon,authenticated;
revoke all on function public.admin_attention_mark(uuid,text,uuid,boolean) from public,anon,authenticated;
revoke all on function public.admin_contact_inbox(uuid,text,text,text,int) from public,anon,authenticated;
grant execute on function public.admin_attention_feed(uuid) to service_role;
grant execute on function public.admin_attention_mark(uuid,text,uuid,boolean) to service_role;
grant execute on function public.admin_contact_inbox(uuid,text,text,text,int) to service_role;
