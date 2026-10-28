-- Apply AFTER migration_whatsapp.sql. Final workflow: no customer messages at placement.
begin;
create table if not exists public.notification_settings (
 id integer primary key check(id=1), email_enabled boolean not null default true,
 email_rules jsonb not null default '{"welcome":true,"order_updates":true,"contact_alerts":true,"order_support":true,"promotions":true}',
 telegram_new_order boolean not null default true, updated_at timestamptz not null default now()
);
insert into public.notification_settings(id) values(1) on conflict do nothing;
alter table public.notification_settings enable row level security;
revoke all on public.notification_settings from anon,authenticated;
grant all on public.notification_settings to service_role;

create or replace function public.whatsapp_order_phone(p_phone text,p_country text) returns text
language plpgsql immutable set search_path=public,pg_temp as $$
declare n text;
begin
 n=regexp_replace(p_phone,'[[:space:]().-]','','g');
 if n like '00%' then n='+'||substring(n from 3);end if;
 if p_country='AE' and n ~ '^05[0-9]{8}$' then n='+971'||substring(n from 2);end if;
 if n !~ '^\+[1-9][0-9]{7,14}$' then return null;end if;
 return substring(n from 2);
end $$;

create or replace function public.whatsapp_order_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare n text;
begin
 if TG_OP='UPDATE' then
  if new.status is distinct from old.status or coalesce(new.tracking_no,'') is distinct from coalesce(old.tracking_no,'')
   or (coalesce(new.tracking_no,'')<>'' and coalesce(new.tracking_url,'') is distinct from coalesce(old.tracking_url,'')) then
   new.whatsapp_revision=old.whatsapp_revision+1;
  end if;
  return new;
 end if;
 if not new.whatsapp_opt_in then return new;end if;
 n=whatsapp_order_phone(new.phone,new.country_code);if n is null then return new;end if;
 insert into whatsapp_contacts(phone,orders_opt_in,consent_source) values(n,true,'checkout')
 on conflict(phone) do update set orders_opt_in=true,consent_source='checkout',consent_at=now() where whatsapp_contacts.stopped_at is null;
 -- Permission is recorded, but customers receive nothing until staff share an update.
 return new;
end $$;
drop trigger if exists whatsapp_revision on public.orders;
create trigger whatsapp_revision before update of status,tracking_no,tracking_url on public.orders for each row execute function public.whatsapp_order_event();
update public.whatsapp_messages set state='skipped',error_code='placement_messages_disabled',updated_at=now()
where kind='order' and revision=0 and state='pending';

create or replace function public.whatsapp_queue_order(p_id uuid) returns void
language sql security definer set search_path=public,pg_temp as $$
 insert into whatsapp_messages(dedupe_key,order_id,phone,kind,order_status,revision)
 select 'order:'||o.id||':'||o.whatsapp_revision,o.id,c.phone,'order',o.status,o.whatsapp_revision
 from orders o join whatsapp_contacts c on c.phone=whatsapp_order_phone(o.phone,o.country_code)
 where o.id=p_id and o.status<>'new' and o.whatsapp_opt_in and o.deleted_at is null and c.orders_opt_in and c.stopped_at is null
 on conflict do nothing;
$$;
revoke all on function public.whatsapp_order_phone(text,text) from public,anon,authenticated;
grant execute on function public.whatsapp_order_phone(text,text) to service_role;

create table if not exists public.telegram_order_alerts (
 id uuid primary key default gen_random_uuid(), order_id uuid unique not null references public.orders(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','sending','sent','failed','unknown','skipped')),
 attempts integer not null default 0, available_at timestamptz not null default now(),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),error_code text,provider_id text
);
alter table public.telegram_order_alerts enable row level security;
revoke all on public.telegram_order_alerts from anon,authenticated;
grant all on public.telegram_order_alerts to service_role;
create index if not exists telegram_pending_alerts on public.telegram_order_alerts(available_at,created_at) where state='pending';
create or replace function public.telegram_new_order() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin insert into telegram_order_alerts(order_id) values(new.id) on conflict do nothing;return new;end $$;
drop trigger if exists telegram_new_order on public.orders;
create trigger telegram_new_order after insert on public.orders for each row execute function public.telegram_new_order();
create or replace function public.telegram_claim(p_limit integer default 5) returns setof public.telegram_order_alerts
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update telegram_order_alerts set state='unknown',error_code='interrupted_attempt',updated_at=now() where state='sending' and updated_at<now()-interval '2 minutes';
 return query update telegram_order_alerts a set state='sending',attempts=a.attempts+1,updated_at=now()
 where a.id in(select id from telegram_order_alerts where state='pending' and available_at<=now() order by created_at for update skip locked limit greatest(1,least(p_limit,5))) returning a.*;
end $$;
revoke all on function public.telegram_new_order(),public.telegram_claim(integer) from public,anon,authenticated;
grant execute on function public.telegram_claim(integer) to service_role;
commit;
