-- Apply after migration_orders_workspace.sql and analytics migrations.
create index if not exists orders_customer_workspace on public.orders(user_id,created_at desc) where deleted_at is null;
-- Only staff server actions call these RPCs; never grant browser roles access.
create or replace function public.admin_customer_summary(p_actor uuid, p_user uuid, p_before timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_role text; target_role text; result jsonb;
begin
 select role into actor_role from profiles where id=p_actor;
 select role into target_role from profiles where id=p_user;
 if actor_role is null or actor_role not in ('super_admin','orders') or target_role is null
    or (actor_role='orders' and target_role<>'customer') then raise exception 'Not authorized'; end if;
 select jsonb_build_object('orders',count(*),'previous_orders',count(*) filter(where created_at<p_before),
   'paid_total',coalesce(sum(total) filter(where payment_status='paid' and status not in ('cancelled','returned')),0),
   'first_order',min(created_at),'latest_order',max(created_at)) into result
 from orders where user_id=p_user and deleted_at is null;
 return result;
end $$;

create or replace function public.admin_customer_directory(p_actor uuid,p_query text default '',p_role text default '',p_page int default 1)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='super_admin') then raise exception 'Not authorized'; end if;
 with matched as (
   select p.id,p.email,p.full_name,p.phone,p.role,p.created_at,a.banned_until,a.last_sign_in_at
   from profiles p left join auth.users a on a.id=p.id
   where (p_role='' or p.role=p_role) and (p_query='' or p.email ilike '%'||p_query||'%'
      or p.full_name ilike '%'||p_query||'%' or p.phone ilike '%'||p_query||'%')
 ), page as (select * from matched order by created_at desc,id limit 50 offset (greatest(1,least(p_page,100000))-1)*50),
 totals as (select o.user_id,count(*) as orders,coalesce(sum(o.total) filter(where o.payment_status='paid' and o.status not in ('cancelled','returned')),0) as paid_total
   from orders o join page p on p.id=o.user_id where o.deleted_at is null group by o.user_id)
 select jsonb_build_object('total',(select count(*) from matched),
 'customers',(select count(*) from profiles where role='customer'),
 'staff',(select count(*) from profiles where role<>'customer'),
 'rows',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('orders',coalesce(t.orders,0),'paid_total',coalesce(t.paid_total,0)) order by p.created_at desc,p.id)
 from page p left join totals t on t.user_id=p.id),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_customer_summary(uuid,uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_customer_directory(uuid,text,text,int) from public,anon,authenticated;
grant execute on function public.admin_customer_summary(uuid,uuid,timestamptz) to service_role;
grant execute on function public.admin_customer_directory(uuid,text,text,int) to service_role;
