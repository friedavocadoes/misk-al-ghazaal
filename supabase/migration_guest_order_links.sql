-- Apply after orders/auth/profile migrations. Links are private bearer capabilities.
create table if not exists public.order_access_links (
 order_id uuid primary key references public.orders(id) on delete cascade,
 token text not null unique default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') check(token ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
alter table public.order_access_links enable row level security;
revoke all on public.order_access_links from anon,authenticated;
grant all on public.order_access_links to service_role;
insert into public.order_access_links(order_id) select id from public.orders on conflict(order_id) do nothing;
create or replace function public.create_order_access_link() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin insert into order_access_links(order_id) values(new.id) on conflict(order_id) do nothing; return new;end $$;
drop trigger if exists order_access_link_created on public.orders;
create trigger order_access_link_created after insert on public.orders for each row execute function public.create_order_access_link();
revoke all on function public.create_order_access_link() from public,anon,authenticated;

-- Atomic ownership guards: another account's order can never be transferred.
create or replace function public.claim_browser_orders(p_user uuid,p_tokens text[]) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare claimed integer;
begin
 if not exists(select 1 from profiles p join auth.users u on u.id=p.id where p.id=p_user and p.role='customer' and u.email_confirmed_at is not null) then return 0;end if;
 update orders o set user_id=p_user where o.user_id is null and o.deleted_at is null
 and o.id in(select order_id from order_access_links where token=any(p_tokens[1:8]));
 get diagnostics claimed=row_count;return claimed;
end $$;
create or replace function public.claim_verified_email_orders(p_user uuid) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare verified_email text; claimed integer;
begin
 select lower(trim(u.email)) into verified_email from auth.users u join profiles p on p.id=u.id
 where u.id=p_user and u.email_confirmed_at is not null and p.role='customer';
 if verified_email is null or verified_email='' then return 0;end if;
 update orders set user_id=p_user where user_id is null and deleted_at is null and lower(trim(email))=verified_email;
 get diagnostics claimed=row_count;return claimed;
end $$;
revoke all on function public.claim_browser_orders(uuid,text[]) from public,anon,authenticated;
revoke all on function public.claim_verified_email_orders(uuid) from public,anon,authenticated;
grant execute on function public.claim_browser_orders(uuid,text[]) to service_role;
grant execute on function public.claim_verified_email_orders(uuid) to service_role;
