-- Apply after guest order links. All WhatsApp data is server-only.
begin;
alter table public.orders add column if not exists whatsapp_opt_in boolean not null default false;
alter table public.orders add column if not exists whatsapp_revision integer not null default 0;
create table if not exists public.whatsapp_accounts (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 phone text not null
);
create table if not exists public.whatsapp_contacts (
 phone text primary key check(phone ~ '^[1-9][0-9]{7,14}$'),
 orders_opt_in boolean not null default false, marketing_opt_in boolean not null default false,
 consent_source text not null, consent_at timestamptz not null default now(),
 stopped_at timestamptz
);
create table if not exists public.whatsapp_opt_out_events (
 provider_id text primary key, received_at timestamptz not null default now()
);
create table if not exists public.whatsapp_campaigns (
 id uuid primary key default gen_random_uuid(), name text not null, template text not null,
 language text not null default 'en', parameters jsonb not null default '[]',
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), queued_at timestamptz
);
create table if not exists public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(), dedupe_key text unique not null,
 order_id uuid references public.orders(id) on delete cascade,
 campaign_id uuid references public.whatsapp_campaigns(id) on delete cascade,
 phone text not null, kind text not null check(kind in ('order','marketing')),
 order_status text, revision integer, state text not null default 'pending'
 check(state in ('pending','sending','accepted','sent','delivered','read','failed','skipped','unknown')),
 attempts integer not null default 0, available_at timestamptz not null default now(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 provider_id text unique, error_code text
);
create index if not exists whatsapp_pending on public.whatsapp_messages(available_at,created_at) where state='pending';
create index if not exists whatsapp_order_messages on public.whatsapp_messages(order_id,created_at desc);
create index if not exists whatsapp_recent_messages on public.whatsapp_messages(created_at desc);
create index if not exists whatsapp_marketing_audience on public.whatsapp_contacts(phone) where marketing_opt_in and stopped_at is null;
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_opt_out_events enable row level security;
alter table public.whatsapp_campaigns enable row level security;
alter table public.whatsapp_messages enable row level security;
revoke all on public.whatsapp_contacts,public.whatsapp_accounts,public.whatsapp_opt_out_events,public.whatsapp_campaigns,public.whatsapp_messages from anon,authenticated;
grant all on public.whatsapp_contacts,public.whatsapp_accounts,public.whatsapp_opt_out_events,public.whatsapp_campaigns,public.whatsapp_messages to service_role;

create or replace function public.whatsapp_stop(p_provider text,p_phone text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if length(p_provider)>256 or p_provider='' then raise exception 'Invalid event';end if;
 insert into whatsapp_opt_out_events(provider_id) values(p_provider) on conflict do nothing;
 if not found then return;end if;
 insert into whatsapp_contacts(phone,orders_opt_in,marketing_opt_in,consent_source,stopped_at)
 values(p_phone,false,false,'whatsapp_stop',now()) on conflict(phone) do update
 set orders_opt_in=false,marketing_opt_in=false,stopped_at=now();
end $$;

create or replace function public.whatsapp_consent(p_phone text,p_orders boolean,p_marketing boolean,p_source text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into whatsapp_contacts(phone,orders_opt_in,marketing_opt_in,consent_source)
 values(p_phone,p_orders,p_marketing,p_source)
 on conflict(phone) do update set orders_opt_in=excluded.orders_opt_in,
 marketing_opt_in=excluded.marketing_opt_in,consent_source=excluded.consent_source,consent_at=now(),stopped_at=null;
end $$;

create or replace function public.whatsapp_order_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare n text;
begin
 if TG_OP='UPDATE' then
  if new.status is distinct from old.status then new.whatsapp_revision=old.whatsapp_revision+1;end if;
  return new;
 end if;
 if not new.whatsapp_opt_in then return new;end if;
 n=regexp_replace(new.phone,'[[:space:]().-]','','g');
 if n like '00%' then n='+'||substring(n from 3);end if;
 if new.country_code='AE' and n ~ '^05[0-9]{8}$' then n='+971'||substring(n from 2);end if;
 if n !~ '^\+[1-9][0-9]{7,14}$' then return new;end if;
 n=substring(n from 2);
 -- Order consent never opts a shopper into marketing or reverses a STOP.
 insert into whatsapp_contacts(phone,orders_opt_in,consent_source) values(n,true,'checkout')
 on conflict(phone) do update set orders_opt_in=true,consent_source='checkout',consent_at=now()
 where whatsapp_contacts.stopped_at is null;
 insert into whatsapp_messages(dedupe_key,order_id,phone,kind,order_status,revision)
 values('order:'||new.id||':0',new.id,n,'order',new.status,0) on conflict do nothing;
 return new;
end $$;
create or replace function public.whatsapp_save_preferences(p_user uuid,p_phone text,p_orders boolean,p_marketing boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare previous text;
begin
 perform 1 from profiles where id=p_user and role='customer' for update;
 if not found then raise exception 'Forbidden';end if;
 select phone into previous from whatsapp_accounts where user_id=p_user;
 if previous is not null and previous<>p_phone then
 update whatsapp_contacts set orders_opt_in=false,marketing_opt_in=false,stopped_at=now() where phone=previous;
 end if;
 perform whatsapp_consent(p_phone,p_orders,p_marketing,'account');
 insert into whatsapp_accounts(user_id,phone) values(p_user,p_phone) on conflict(user_id) do update set phone=excluded.phone;
end $$;
create or replace function public.whatsapp_account_removed() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from whatsapp_accounts where phone=old.phone) then
  update whatsapp_contacts set orders_opt_in=false,marketing_opt_in=false,stopped_at=now() where phone=old.phone;
 end if;
 return old;
end $$;
drop trigger if exists whatsapp_account_removed on public.whatsapp_accounts;
create trigger whatsapp_account_removed after delete on public.whatsapp_accounts for each row execute function public.whatsapp_account_removed();
drop trigger if exists whatsapp_receipt on public.orders;
create trigger whatsapp_receipt after insert on public.orders for each row execute function public.whatsapp_order_event();
drop trigger if exists whatsapp_revision on public.orders;
create trigger whatsapp_revision before update of status on public.orders for each row execute function public.whatsapp_order_event();

create or replace function public.whatsapp_queue_order(p_id uuid) returns void
language sql security definer set search_path=public,pg_temp as $$
 insert into whatsapp_messages(dedupe_key,order_id,phone,kind,order_status,revision)
 select 'order:'||o.id||':'||o.whatsapp_revision,o.id,m.phone,'order',o.status,o.whatsapp_revision
 from orders o join whatsapp_messages m on m.order_id=o.id and m.revision=0
 where o.id=p_id and o.whatsapp_opt_in and o.deleted_at is null on conflict do nothing;
$$;

create or replace function public.whatsapp_queue_campaign(p_actor uuid,p_id uuid) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if not exists(select 1 from profiles where id=p_actor and role='super_admin') then raise exception 'Forbidden';end if;
 perform 1 from whatsapp_campaigns where id=p_id for update;
 if not found then raise exception 'Campaign not found';end if;
 if exists(select 1 from whatsapp_campaigns where id=p_id and queued_at is not null) then raise exception 'Campaign already queued';end if;
 insert into whatsapp_messages(dedupe_key,campaign_id,phone,kind)
 select 'campaign:'||p_id||':'||phone,p_id,phone,'marketing' from whatsapp_contacts where marketing_opt_in and stopped_at is null on conflict do nothing;
 get diagnostics n=row_count;
 update whatsapp_campaigns set queued_at=now() where id=p_id;return n;
end $$;

create or replace function public.whatsapp_claim(p_limit integer default 5) returns setof public.whatsapp_messages
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- A crash/timeout may have sent a message: never retry an ambiguous attempt automatically.
 update whatsapp_messages set state='unknown',error_code='interrupted_attempt',updated_at=now()
 where state='sending' and updated_at<now()-interval '2 minutes';
 return query update whatsapp_messages m set state='sending',attempts=m.attempts+1,updated_at=now()
 where m.id in(select id from whatsapp_messages where state='pending' and available_at<=now()
 order by case kind when 'order' then 0 else 1 end,created_at for update skip locked limit greatest(1,least(p_limit,10))) returning m.*;
end $$;

create or replace function public.whatsapp_receipt_status(p_id uuid,p_provider text,p_state text,p_error text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_state not in ('accepted','sent','delivered','read','failed') then return;end if;
 update whatsapp_messages set state=p_state,provider_id=coalesce(provider_id,p_provider),error_code=left(p_error,80),updated_at=now()
 where id=p_id and (provider_id is null or provider_id=p_provider)
 and ((p_state='failed' and state in ('pending','sending','unknown','accepted','sent')) or
 (p_state<>'failed' and case state when 'read' then 5 when 'delivered' then 4 when 'sent' then 3 when 'failed' then 3 when 'accepted' then 1 else 0 end
 < case p_state when 'read' then 5 when 'delivered' then 4 when 'sent' then 3 else 1 end));
end $$;
revoke all on function public.whatsapp_consent(text,boolean,boolean,text),public.whatsapp_order_event(),public.whatsapp_queue_order(uuid),public.whatsapp_queue_campaign(uuid,uuid),public.whatsapp_claim(integer),public.whatsapp_receipt_status(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.whatsapp_consent(text,boolean,boolean,text),public.whatsapp_queue_order(uuid),public.whatsapp_queue_campaign(uuid,uuid),public.whatsapp_claim(integer),public.whatsapp_receipt_status(uuid,text,text,text) to service_role;
revoke all on function public.whatsapp_save_preferences(uuid,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.whatsapp_save_preferences(uuid,text,boolean,boolean) to service_role;
revoke all on function public.whatsapp_stop(text,text) from public,anon,authenticated;
grant execute on function public.whatsapp_stop(text,text) to service_role;
revoke all on function public.whatsapp_account_removed() from public,anon,authenticated;
commit;
