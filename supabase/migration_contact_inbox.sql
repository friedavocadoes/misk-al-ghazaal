create table if not exists public.contact_messages (
 id uuid primary key default gen_random_uuid(), reference text not null unique default 'MG-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 topic text not null check(topic in ('meeting','review','complaint')), email text not null,
 sender_key uuid not null, data jsonb not null, created_at timestamptz not null default now()
);
create index if not exists contact_messages_email_time on public.contact_messages(email,created_at desc);
create index if not exists contact_messages_sender_time on public.contact_messages(sender_key,created_at desc);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon,authenticated;
grant all on public.contact_messages to service_role;
create or replace function public.submit_contact_message(p_sender uuid,p_data jsonb) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare result text; address text:=lower(trim(p_data->>'email'));
begin
 perform pg_advisory_xact_lock(hashtextextended('contact:'||coalesce(address,''),0));
 perform pg_advisory_xact_lock(hashtextextended('contact-sender:'||p_sender::text,0));
 if address is null or address='' or length(address)>254 or length(p_data->>'message') not between 1 and 5000 then raise exception 'Invalid enquiry';end if;
 if (select count(*) from contact_messages where email=address and created_at>now()-interval '1 hour')>=3 then raise exception 'Please wait before sending another message';end if;
 if (select count(*) from contact_messages where sender_key=p_sender and created_at>now()-interval '1 hour')>=5 then raise exception 'Please wait before sending another message';end if;
 insert into contact_messages(topic,email,sender_key,data) values(p_data->>'topic',address,p_sender,p_data) returning reference into result;
 return result;
end $$;
revoke all on function public.submit_contact_message(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_contact_message(uuid,jsonb) to service_role;
