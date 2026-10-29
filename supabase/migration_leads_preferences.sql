begin;
alter table public.whatsapp_contacts add column if not exists preference_token text not null default(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''));
alter table public.whatsapp_contacts add column if not exists orders_opt_out_at timestamptz;
alter table public.whatsapp_contacts add column if not exists marketing_opt_out_at timestamptz;
create unique index if not exists whatsapp_preferences_token on public.whatsapp_contacts(preference_token);
create or replace function public.whatsapp_consent(p_phone text,p_orders boolean,p_marketing boolean,p_source text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into whatsapp_contacts(phone,orders_opt_in,marketing_opt_in,consent_source,orders_opt_out_at,marketing_opt_out_at)
 values(p_phone,p_orders,p_marketing,p_source,case when not p_orders then now() end,case when not p_marketing then now() end)
 on conflict(phone) do update set orders_opt_in=p_orders,marketing_opt_in=p_marketing,consent_source=p_source,consent_at=now(),stopped_at=null,
 orders_opt_out_at=case when not p_orders then now() end,marketing_opt_out_at=case when not p_marketing then now() end;
end $$;
create or replace function public.preserve_whatsapp_opt_out() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.consent_source='checkout' and old.orders_opt_out_at is not null then new.orders_opt_in=false;new.orders_opt_out_at=old.orders_opt_out_at;end if;
 return new;
end $$;
drop trigger if exists preserve_whatsapp_opt_out on public.whatsapp_contacts;
create trigger preserve_whatsapp_opt_out before update on public.whatsapp_contacts for each row execute function public.preserve_whatsapp_opt_out();
revoke all on function public.preserve_whatsapp_opt_out() from public,anon,authenticated;
create table if not exists public.customer_leads (
 id uuid primary key default gen_random_uuid(),email text unique not null check(email=lower(trim(email))),
 name text not null default '',phone text not null default '',location text not null default '',
 sources text[] not null default '{}',marketing_email boolean not null default false,unsubscribed_at timestamptz,
 preference_token text unique not null default(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.customer_leads enable row level security;
revoke all on public.customer_leads from anon,authenticated;
grant all on public.customer_leads to service_role;
create index if not exists leads_sources on public.customer_leads using gin(sources);
create table if not exists public.newsletter_requests(sender text not null,email text not null,created_at timestamptz not null default now());
create index if not exists newsletter_sender on public.newsletter_requests(sender,created_at);
alter table public.newsletter_requests enable row level security;
revoke all on public.newsletter_requests from anon,authenticated;
grant all on public.newsletter_requests to service_role;

create or replace function public.capture_lead(p_email text,p_source text,p_name text default '',p_phone text default '',p_location text default '',p_consent boolean default false) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare lead_id uuid;e text=lower(trim(p_email));
begin
 if e is null or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return null;end if;
 if p_source not in ('account','guest_order','newsletter','manual') then raise exception 'Invalid lead source';end if;
 insert into customer_leads(email,name,phone,location,sources,marketing_email)
 values(e,left(coalesce(p_name,''),150),left(coalesce(p_phone,''),40),left(coalesce(p_location,''),200),array[p_source],p_consent)
 on conflict(email) do update set sources=array(select distinct unnest(customer_leads.sources||excluded.sources)),
 name=case when customer_leads.name='' then excluded.name else customer_leads.name end,
 phone=case when customer_leads.phone='' then excluded.phone else customer_leads.phone end,
 location=case when customer_leads.location='' then excluded.location else customer_leads.location end,
 marketing_email=case when customer_leads.unsubscribed_at is null then customer_leads.marketing_email or excluded.marketing_email else false end,updated_at=now()
 returning id into lead_id;return lead_id;
end $$;
create or replace function public.lead_profile_sync() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.role='customer' then
 perform capture_lead(new.email,'account',new.full_name,new.phone,'',coalesce(new.promo_opt_in,false));
 if TG_OP='INSERT' then
  if not coalesce(new.promo_opt_in,false) then update customer_leads set marketing_email=false,unsubscribed_at=now() where email=lower(trim(new.email));
  elsif exists(select 1 from customer_leads where email=lower(trim(new.email)) and not marketing_email) then
   update profiles set promo_opt_in=false where id=new.id and promo_opt_in is distinct from false;
  end if;
 end if;
 if TG_OP='UPDATE' and new.promo_opt_in is distinct from old.promo_opt_in then
 update customer_leads set marketing_email=new.promo_opt_in,unsubscribed_at=case when new.promo_opt_in then null else now() end,updated_at=now() where email=lower(trim(new.email));
 end if;
 elsif TG_OP='UPDATE' and old.role='customer' then update customer_leads set marketing_email=false,unsubscribed_at=now() where email=lower(trim(new.email));end if;
 return new;
end $$;
drop trigger if exists lead_profile_sync on public.profiles;
create trigger lead_profile_sync after insert or update of email,full_name,phone,promo_opt_in,role on public.profiles for each row execute function public.lead_profile_sync();
create or replace function public.lead_profile_deleted() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.role='customer' then update customer_leads set marketing_email=false,unsubscribed_at=now(),updated_at=now() where email=lower(trim(old.email));end if;
 return old;
end $$;
drop trigger if exists lead_profile_deleted on public.profiles;
create trigger lead_profile_deleted after delete on public.profiles for each row execute function public.lead_profile_deleted();
revoke all on function public.lead_profile_deleted() from public,anon,authenticated;
create or replace function public.lead_guest_order() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform capture_lead(new.email,case when new.user_id is null then 'guest_order' else 'account' end,new.customer_name,new.phone,concat_ws(', ',new.city,new.country_code),false);
 return new;
end $$;
drop trigger if exists lead_guest_order on public.orders;
create trigger lead_guest_order after insert on public.orders for each row execute function public.lead_guest_order();
select capture_lead(email,'account',full_name,phone,'',coalesce(promo_opt_in,false)) from profiles where role='customer';
update customer_leads l set marketing_email=false,unsubscribed_at=coalesce(l.unsubscribed_at,now()) from profiles p where p.role='customer' and p.promo_opt_in=false and lower(trim(p.email))=l.email;
select capture_lead(email,'guest_order',customer_name,phone,concat_ws(', ',city,country_code),false) from orders where user_id is null and deleted_at is null;

create or replace function public.newsletter_signup(p_sender text,p_email text,p_name text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare e text=lower(trim(p_email));
begin
 perform pg_advisory_xact_lock(hashtextextended(p_sender,0));perform pg_advisory_xact_lock(hashtextextended(e,1));
 if (select count(*) from newsletter_requests where sender=p_sender and created_at>now()-interval '1 hour')>=5 or
 (select count(*) from newsletter_requests where email=e and created_at>now()-interval '1 hour')>=3 then raise exception 'Please wait before subscribing again';end if;
 if length(trim(p_name))<1 or length(p_name)>150 or length(e)>254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter your email and name';end if;
 perform capture_lead(e,'newsletter',trim(p_name),'','',true);
 update profiles p set promo_opt_in=l.marketing_email from customer_leads l where lower(trim(p.email))=e and l.email=e and p.role='customer' and p.promo_opt_in is distinct from l.marketing_email;
 insert into newsletter_requests(sender,email) values(p_sender,e);
 delete from newsletter_requests where created_at<now()-interval '2 days';
end $$;
create or replace function public.save_communication_preferences(p_token text,p_email_promo boolean,p_wa_orders boolean,p_wa_promo boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare l customer_leads%rowtype;n text;
begin
 select * into l from customer_leads where preference_token=p_token for update;
 if not found then
 select phone into n from whatsapp_contacts where preference_token=p_token for update;
 if n is null then raise exception 'Invalid preference link';end if;
 perform whatsapp_consent(n,p_wa_orders,p_wa_promo,'preferences_link');return;
 end if;
 update customer_leads set marketing_email=p_email_promo,unsubscribed_at=case when p_email_promo then null else now() end,updated_at=now() where id=l.id;
 update profiles set promo_opt_in=p_email_promo,order_updates_opt_in=true where lower(trim(email))=l.email and role='customer' and (promo_opt_in is distinct from p_email_promo or order_updates_opt_in is distinct from true);
 select a.phone into n from whatsapp_accounts a join profiles p on p.id=a.user_id where lower(trim(p.email))=l.email and p.role='customer' limit 1;
 n=coalesce(n,whatsapp_order_phone(l.phone,'AE'));
 if n is not null then perform whatsapp_consent(n,p_wa_orders,p_wa_promo,'preferences_link');end if;
end $$;
revoke all on function public.capture_lead(text,text,text,text,text,boolean),public.lead_profile_sync(),public.lead_guest_order(),public.newsletter_signup(text,text,text),public.save_communication_preferences(text,boolean,boolean,boolean) from public,anon,authenticated;
grant execute on function public.capture_lead(text,text,text,text,text,boolean),public.newsletter_signup(text,text,text),public.save_communication_preferences(text,boolean,boolean,boolean) to service_role;
create or replace function public.order_whatsapp_preference(p_id uuid) returns text language sql security definer set search_path=public,pg_temp as $$
 select c.preference_token from orders o join whatsapp_contacts c on c.phone=whatsapp_order_phone(o.phone,o.country_code) where o.id=p_id and o.deleted_at is null;
$$;
revoke all on function public.order_whatsapp_preference(uuid) from public,anon,authenticated;grant execute on function public.order_whatsapp_preference(uuid) to service_role;
create or replace function public.import_customer_leads(p_actor uuid,p_rows jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='super_admin') then raise exception 'Forbidden';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>1000 then raise exception 'Invalid CSV rows';end if;
 for r in select value from jsonb_array_elements(p_rows) loop
 if length(r->>'email')>254 or length(r->>'name')>150 or length(r->>'phone')>40 or length(r->>'location')>200 or r->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid lead';end if;
 perform capture_lead(r->>'email','manual',r->>'name',r->>'phone',r->>'location',coalesce((r->>'consent')::boolean,false));
 update customer_leads set name=coalesce(nullif(r->>'name',''),name),phone=coalesce(nullif(r->>'phone',''),phone),location=coalesce(nullif(r->>'location',''),location) where email=lower(trim(r->>'email'));
 update profiles p set promo_opt_in=l.marketing_email from customer_leads l where lower(trim(p.email))=l.email and l.email=lower(trim(r->>'email')) and p.role='customer' and p.promo_opt_in is distinct from l.marketing_email;
 end loop;
end $$;
revoke all on function public.import_customer_leads(uuid,jsonb) from public,anon,authenticated;grant execute on function public.import_customer_leads(uuid,jsonb) to service_role;
alter table public.promo_campaigns add column if not exists audience_source text not null default 'account';
alter table public.promo_campaigns add column if not exists queued_at timestamptz;
create or replace view public.marketing_lead_audience with(security_invoker=true) as
 select l.id,l.email,l.created_at,l.sources,exists(select 1 from profiles p where p.role='customer' and lower(trim(p.email))=l.email) as has_account
 from customer_leads l where l.marketing_email and l.unsubscribed_at is null;
revoke all on public.marketing_lead_audience from anon,authenticated;grant select on public.marketing_lead_audience to service_role;
create table if not exists public.promo_deliveries (
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.promo_campaigns(id) on delete cascade,
 lead_id uuid not null references public.customer_leads(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','sending','sent','skipped','failed','unknown')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(campaign_id,lead_id)
);
alter table public.promo_deliveries enable row level security;
revoke all on public.promo_deliveries from anon,authenticated;grant all on public.promo_deliveries to service_role;
create index if not exists promo_pending_deliveries on public.promo_deliveries(created_at) where state='pending';
create or replace function public.queue_email_campaign(p_actor uuid,p_id uuid) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c promo_campaigns%rowtype;n integer;
begin
 if not exists(select 1 from profiles where id=p_actor and role='super_admin') then raise exception 'Forbidden';end if;
 select * into c from promo_campaigns where id=p_id for update;
 if not found then raise exception 'Campaign not found';end if;
 if c.queued_at is not null or c.status<>'draft' then raise exception 'Campaign already queued or sent';end if;
 if c.audience_source not in ('all','account','guest_order','newsletter','manual') then raise exception 'Invalid audience';end if;
 insert into promo_deliveries(campaign_id,lead_id) select p_id,id from marketing_lead_audience where (c.audience_source='all' or c.audience_source=any(sources)) and (c.audience_source<>'guest_order' or not has_account) and (c.audience_source<>'account' or has_account) on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then raise exception 'No subscribed contacts in this audience';end if;
 update promo_campaigns set queued_at=now() where id=p_id;return n;
end $$;
create or replace function public.claim_email_deliveries() returns setof public.promo_deliveries language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update promo_deliveries set state='unknown',updated_at=now() where state='sending' and updated_at<now()-interval '2 minutes';
 update promo_campaigns c set status='sent',sent_at=coalesce(c.sent_at,now()),recipient_count=(select count(*) from promo_deliveries d where d.campaign_id=c.id and d.state='sent')
 where c.queued_at is not null and c.status='draft' and not exists(select 1 from promo_deliveries d where d.campaign_id=c.id and d.state in ('pending','sending'));
 return query update promo_deliveries d set state='sending',updated_at=now() where id in(select id from promo_deliveries where state='pending' order by created_at for update skip locked limit 3) returning d.*;
end $$;
create or replace function public.finish_email_campaign(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update promo_campaigns set recipient_count=(select count(*) from promo_deliveries where campaign_id=p_id and state='sent') where id=p_id;
 if not exists(select 1 from promo_deliveries where campaign_id=p_id and state in ('pending','sending')) then
 update promo_campaigns set status='sent',sent_at=now() where id=p_id and queued_at is not null;
 end if;
end $$;
revoke all on function public.queue_email_campaign(uuid,uuid),public.claim_email_deliveries(),public.finish_email_campaign(uuid) from public,anon,authenticated;
grant execute on function public.queue_email_campaign(uuid,uuid),public.claim_email_deliveries(),public.finish_email_campaign(uuid) to service_role;
create or replace function public.email_campaign_progress(p_id uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_object_agg(state,n),'{}') from (select state,count(*) as n from promo_deliveries where campaign_id=p_id group by state) s;
$$;
revoke all on function public.email_campaign_progress(uuid) from public,anon,authenticated;grant execute on function public.email_campaign_progress(uuid) to service_role;
create or replace view public.admin_lead_channels with(security_invoker=true) as
 select l.id,l.email,l.name,l.phone,l.location,l.sources,l.marketing_email,l.unsubscribed_at,l.preference_token,l.created_at,l.updated_at,
 coalesce(a.phone,whatsapp_order_phone(l.phone,'AE')) as wa_phone,
 coalesce(c.orders_opt_in and c.stopped_at is null,false) as wa_orders,
 coalesce(c.marketing_opt_in and c.stopped_at is null,false) as wa_promotions
 from customer_leads l left join lateral(select w.phone from whatsapp_accounts w join profiles p on p.id=w.user_id where lower(trim(p.email))=l.email and p.role='customer' limit 1) a on true
 left join whatsapp_contacts c on c.phone=coalesce(a.phone,whatsapp_order_phone(l.phone,'AE'));
revoke all on public.admin_lead_channels from anon,authenticated;grant select on public.admin_lead_channels to service_role;
create or replace function public.unsubscribe_lead_email(p_token text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e text;
begin
 update customer_leads set marketing_email=false,unsubscribed_at=now(),updated_at=now() where preference_token=p_token returning email into e;
 if e is null then raise exception 'Invalid preference link';end if;
 update profiles set promo_opt_in=false where lower(trim(email))=e and role='customer' and promo_opt_in is distinct from false;
end $$;
revoke all on function public.unsubscribe_lead_email(text) from public,anon,authenticated;grant execute on function public.unsubscribe_lead_email(text) to service_role;

create table if not exists public.analytics_geo_cache(ip_hash text primary key,location jsonb,expires_at timestamptz not null);
create table if not exists public.analytics_geo_budget(day date primary key,used integer not null default 0);
alter table public.analytics_geo_cache enable row level security;alter table public.analytics_geo_budget enable row level security;
revoke all on public.analytics_geo_cache,public.analytics_geo_budget from anon,authenticated;
grant all on public.analytics_geo_cache,public.analytics_geo_budget to service_role;
create or replace function public.geo_lookup_slot(p_hash text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into analytics_geo_budget(day,used) values(current_date,0) on conflict do nothing;
 update analytics_geo_budget set used=used+1 where day=current_date and used<950;if not found then return false;end if;
 insert into analytics_geo_cache(ip_hash,expires_at) values(p_hash,now()+interval '2 minutes') on conflict(ip_hash) do update set expires_at=excluded.expires_at,location=null where analytics_geo_cache.expires_at<now();
 if not found then return false;end if;
 delete from analytics_geo_cache where expires_at<now()-interval '2 days';delete from analytics_geo_budget where day<current_date-7;
 return true;
end $$;
revoke all on function public.geo_lookup_slot(text) from public,anon,authenticated;grant execute on function public.geo_lookup_slot(text) to service_role;
commit;
