-- After navigation banners, mobile banner artwork and soft-delete migrations.
alter table public.banners add column if not exists is_active boolean not null default true;
with ranked as (
  select id,row_number() over(partition by slot order by sort,id)::integer as position
  from public.banners where deleted_at is null
)
update public.banners b set sort=r.position from ranked r where b.id=r.id and b.sort is distinct from r.position;
create index if not exists banners_live_slot_order on public.banners(slot,sort,id)
  where is_active and deleted_at is null;

-- Disabled/bin rows must not be returned to public clients, even via a direct table request.
-- The existing super_admin-write FOR ALL policy retains administrative visibility.
drop policy if exists "public read banners" on public.banners;
create policy "public read banners" on public.banners for select
  using (is_active and deleted_at is null);

-- Exact full-placement reorder. Reject stale screens instead of dropping concurrent changes.
create or replace function public.reorder_banners(p_slot text, p_ids uuid[], p_expected uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare current_ids uuid[];
begin
  if not public.is_super_admin(auth.uid()) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_slot not in ('hero','brand','navigation') or p_slot is null then raise exception 'Invalid banner placement'; end if;
  if p_ids is null or p_expected is null or cardinality(p_ids)>1000 then raise exception 'Invalid banner order'; end if;
  -- Small editorial table: this short lock also serializes inserts, deletion and slot changes.
  lock table public.banners in share row exclusive mode;
  select coalesce(array_agg(id order by sort,id),array[]::uuid[]) into current_ids
    from public.banners where slot=p_slot and deleted_at is null;
  if current_ids is distinct from p_expected then
    raise exception 'Banners changed in another window. Refresh and try again.' using errcode='40001';
  end if;
  if cardinality(p_ids)<>cardinality(current_ids)
    or cardinality(p_ids)<>(select count(distinct v) from unnest(p_ids) v)
    or exists(select 1 from unnest(p_ids) v where v is null or not(v=any(current_ids))) then
    raise exception 'Order must contain every banner in this placement exactly once';
  end if;
  update public.banners b set sort=o.position::integer
    from unnest(p_ids) with ordinality o(id,position) where b.id=o.id;
end $$;
revoke all on function public.reorder_banners(text,uuid[],uuid[]) from public,anon;
grant execute on function public.reorder_banners(text,uuid[],uuid[]) to authenticated;
