-- Apply after existing order, product-options, samples and optional-stock migrations.
begin;
alter table public.orders
 add column if not exists payment_status text not null default 'pending',
 add column if not exists order_source text not null default 'storefront',
 add column if not exists created_by uuid references public.profiles(id),
 add column if not exists admin_request_id uuid;
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check(payment_method in ('cod','card','wallet','tabby','tamara'));
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check(status in ('new','confirmed','packed','dispatched','out_for_delivery','delivered','cancelled','returned'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check(payment_status in ('pending','authorized','paid','partially_paid','refunded','partially_refunded','voided','failed'));
create unique index if not exists orders_admin_request_once on public.orders(admin_request_id) where admin_request_id is not null;
create index if not exists orders_workspace_date on public.orders(created_at desc,id) where deleted_at is null;
create index if not exists orders_workspace_payment on public.orders(payment_method,payment_status) where deleted_at is null;
alter table public.orders alter column tracking_url set default 'https://maxexuae.com/tracking/';

-- Never reuse a number after deletion, and avoid count()+1 races across checkouts.
create sequence if not exists public.order_number_seq;
revoke all on sequence public.order_number_seq from public,anon,authenticated;
grant usage,select on sequence public.order_number_seq to service_role;
select setval('public.order_number_seq',greatest(
 coalesce((select max(substring(order_no from 4)::bigint)+1 from public.orders where order_no ~ '^MG-[0-9]+$'),1),
 nextval('public.order_number_seq')),false);
create or replace function public.assign_order_no() returns trigger language plpgsql set search_path=public as $$
declare n bigint; begin
 if new.order_no is null or new.order_no='' then
  n:=nextval('public.order_number_seq');new.order_no:='MG-'||lpad(n::text,greatest(4,length(n::text)),'0');
 end if;
 new.updated_at:=now();return new;
end $$;

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

-- Staff actions are atomic, with row locks and a history row only on status changes.
create or replace function public.admin_bulk_orders(p_actor uuid,p_ids uuid[],p_status text default null,p_payment text default null,p_bin boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; changes jsonb:='[]'; begin
 if not exists(select 1 from profiles where id=p_actor and role in ('super_admin','orders')) then raise exception 'Forbidden';end if;
 if p_ids is null or cardinality(p_ids)<1 or cardinality(p_ids)>200 or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) x) then raise exception 'Select 1–200 distinct orders';end if;
 if p_status is not null and p_status not in ('new','confirmed','dispatched','out_for_delivery','delivered','cancelled','returned') then raise exception 'Invalid status';end if;
 if p_payment is not null and p_payment not in ('pending','authorized','paid','partially_paid','refunded','partially_refunded','voided','failed') then raise exception 'Invalid payment status';end if;
 if p_status is null and p_payment is null and not p_bin then raise exception 'Choose an action';end if;
 perform id from orders where id=any(p_ids) and deleted_at is null order by id for update;
 if (select count(*) from orders where id=any(p_ids) and deleted_at is null)<>cardinality(p_ids) then raise exception 'An order was removed. Refresh and try again.';end if;
 for o in select * from orders where id=any(p_ids) order by id loop
  if not p_bin and p_status in ('dispatched','out_for_delivery') and nullif(btrim(o.tracking_no),'') is null then raise exception 'Add a tracking number to % before dispatching',o.order_no;end if;
  update orders set status=coalesce(p_status,status),payment_status=coalesce(p_payment,payment_status),
   tracking_url=case when p_status in ('dispatched','out_for_delivery') then coalesce(nullif(tracking_url,''),'https://maxexuae.com/tracking/') else tracking_url end,
   deleted_at=case when p_bin then now() else deleted_at end where id=o.id;
  if p_bin or (p_status is not null and p_status<>o.status) then
   insert into order_status_history(order_id,from_status,to_status,changed_by,note)
   values(o.id,o.status,case when p_bin then 'binned' else p_status end,p_actor,'Admin bulk update');
  end if;
  changes:=changes||jsonb_build_array(jsonb_build_object('id',o.id,'order_no',o.order_no,'from_status',o.status,'to_status',coalesce(p_status,o.status),'from_payment',o.payment_status,'to_payment',coalesce(p_payment,o.payment_status),'binned',p_bin));
 end loop;
 return changes;
end $$;

-- Manual orders: server catalog pricing, inventory locks and all writes in one transaction.
create or replace function public.admin_create_order(p_actor uuid,p_request uuid,p_customer jsonb,p_lines jsonb,p_shipping numeric default 0,p_method text default 'cod',p_payment text default 'pending')
returns jsonb language plpgsql security definer set search_path=public as $$
declare existing orders%rowtype;line jsonb;p products%rowtype;v variants%rowtype;unit numeric;subtotal numeric:=0;
 lines jsonb:='[]';oid uuid;ono text;qty integer;vid uuid;title text; begin
 if not exists(select 1 from profiles where id=p_actor and role in ('super_admin','orders')) then raise exception 'Forbidden';end if;
 if p_request is null then raise exception 'Missing request reference';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from orders where admin_request_id=p_request;
 if found then
  if existing.created_by is distinct from p_actor then raise exception 'Request belongs to another administrator';end if;
  return jsonb_build_object('id',existing.id,'order_no',existing.order_no,'existing',true);
 end if;
 if p_method not in ('cod','card','wallet','tabby','tamara') or p_payment not in ('pending','paid') then raise exception 'Invalid payment details';end if;
 if p_shipping is null or p_shipping<0 or p_shipping>100000 then raise exception 'Invalid shipping amount';end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Add 1–50 products';end if;
 if jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>50 then raise exception 'Add 1–50 products';end if;
 if nullif(btrim(p_customer->>'name'),'') is null or nullif(btrim(p_customer->>'phone'),'') is null or nullif(btrim(p_customer->>'address'),'') is null then raise exception 'Name, phone and address are required';end if;
 -- Stable global lock order prevents overselling and cross-order deadlocks.
 perform id from products where slug in (select value->>'slug' from jsonb_array_elements(p_lines)) order by id for share;
 perform id from variants where id in (select nullif(value->>'variant_id','')::uuid from jsonb_array_elements(p_lines)) order by id for update;
 for line in select value from jsonb_array_elements(p_lines) loop
  qty:=(line->>'qty')::int;vid:=nullif(line->>'variant_id','')::uuid;
  if qty is null or qty<1 or qty>20 then raise exception 'Invalid quantity';end if;
  select * into p from products where slug=line->>'slug' and deleted_at is null;
  if not found or not coalesce(p.is_active,true) or coalesce(p.out_of_stock,false) then raise exception 'Product is unavailable';end if;
  unit:=p.price;title:=p.title;
  if vid is not null then
   select * into v from variants where id=vid and product_id=p.id;
   if not found or not coalesce(v.is_active,true) then raise exception 'Option is unavailable';end if;
   if v.stock is not null and v.stock<qty then raise exception 'Insufficient stock for %',p.title;end if;
   unit:=v.price;title:=coalesce(nullif(v.name_override,''),p.title)||' — '||v.title;
   if v.stock is not null then update variants set stock=stock-qty where id=vid;end if;
  elsif exists(select 1 from variants where product_id=p.id) then raise exception 'Choose a product option';
  end if;
  subtotal:=subtotal+unit*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('slug',p.slug,'variant_id',vid,'title',title,'qty',qty,'unit',unit));
 end loop;
 insert into orders(order_no,customer_name,phone,email,address,city,emirate,country_code,state_name,postcode,notes,subtotal,shipping,discount,total,payment_method,payment_status,status,order_source,created_by,admin_request_id)
 values('',left(btrim(p_customer->>'name'),200),left(btrim(p_customer->>'phone'),40),nullif(left(btrim(p_customer->>'email'),250),''),left(p_customer->>'address',1000),left(p_customer->>'city',120),left(p_customer->>'state',120),coalesce(p_customer->>'country','AE'),left(p_customer->>'state',120),left(p_customer->>'postcode',30),left(p_customer->>'notes',2000),round(subtotal,2),round(p_shipping,2),0,round(subtotal+p_shipping,2),p_method,p_payment,'new','admin',p_actor,p_request)
 returning id,order_no into oid,ono;
 insert into order_items(order_id,product_slug,variant_id,title,qty,unit_price)
 select oid,value->>'slug',nullif(value->>'variant_id','')::uuid,value->>'title',(value->>'qty')::int,(value->>'unit')::numeric from jsonb_array_elements(lines);
 insert into order_status_history(order_id,to_status,changed_by,note) values(oid,'new',p_actor,'Order created by staff');
 return jsonb_build_object('id',oid,'order_no',ono,'existing',false);
end $$;

create or replace function public.admin_update_order(p_actor uuid,p_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_status text;target_status text; begin
 if not exists(select 1 from profiles where id=p_actor and role in ('super_admin','orders')) then raise exception 'Forbidden';end if;
 select status into current_status from orders where id=p_id and deleted_at is null for update;
 if not found then raise exception 'Order not found';end if;
 target_status:=p_patch->>'status';
 if target_status='packed' and current_status='packed' then target_status:=null;end if;
 if nullif(p_patch->>'tracking_url','') is not null and p_patch->>'tracking_url' !~ '^https?://' then raise exception 'Invalid courier URL';end if;
 update orders set tracking_no=nullif(btrim(p_patch->>'tracking_no'),''),
 tracking_url=coalesce(nullif(p_patch->>'tracking_url',''),'https://maxexuae.com/tracking/'),
 internal_note=nullif(p_patch->>'internal_note',''),expected_delivery_date=nullif(p_patch->>'expected_delivery_date','')::date,
 invoice_source=case when p_patch->>'invoice_source'='upload' then 'upload' else 'auto' end where id=p_id;
 return admin_bulk_orders(p_actor,array[p_id],target_status,coalesce(p_patch->>'payment_status','pending'),false);
end $$;

revoke all on function public.admin_update_order(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_update_order(uuid,uuid,jsonb) to service_role;
revoke all on function public.admin_orders_report(text,text,text,text,timestamptz,timestamptz,integer,integer,text,uuid[]),public.admin_bulk_orders(uuid,uuid[],text,text,boolean),public.admin_create_order(uuid,uuid,jsonb,jsonb,numeric,text,text) from public,anon,authenticated;
grant execute on function public.admin_orders_report(text,text,text,text,timestamptz,timestamptz,integer,integer,text,uuid[]),public.admin_bulk_orders(uuid,uuid[],text,text,boolean),public.admin_create_order(uuid,uuid,jsonb,jsonb,numeric,text,text) to service_role;
commit;
