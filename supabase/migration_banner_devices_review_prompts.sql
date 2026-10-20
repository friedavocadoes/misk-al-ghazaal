begin;
alter table public.banners add column if not exists mobile_src text not null default '';
alter table public.banners add column if not exists mobile_fallback text not null default '';
create table if not exists public.order_review_prompts(order_id uuid primary key references public.orders(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,claimed_at timestamptz not null default now(),state text not null default 'shown' check(state in ('shown','dismissed','opened')));
alter table public.order_review_prompts enable row level security;
-- Server claims prompts with the service client after validating the signed-in owner.
create index if not exists review_prompt_user_idx on public.order_review_prompts(user_id,claimed_at desc);
create or replace function public.claim_order_review_prompt(p_order uuid,p_user uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if not exists(select 1 from orders where id=p_order and user_id=p_user and status='delivered' and deleted_at is null) then return false; end if;
 if exists(select 1 from order_review_prompts where user_id=p_user and claimed_at>now()-interval '7 days') then return false; end if;
 insert into order_review_prompts(order_id,user_id) values(p_order,p_user) on conflict do nothing;
 get diagnostics n=row_count; return n=1;
end $$;
revoke all on function public.claim_order_review_prompt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_order_review_prompt(uuid,uuid) to service_role;
commit;
