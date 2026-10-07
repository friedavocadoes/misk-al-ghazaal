-- ============================================================================
-- Migration: recycle bin (soft delete, 20-day auto-purge)
-- Run once in Supabase Dashboard → SQL Editor AFTER schema.sql.
-- Deleted products / banners / orders get deleted_at set (visible in
-- /admin/bin per category, restorable). Rows older than 20 days are purged
-- by purge_recycle_bin() — called lazily from the admin (zero extra
-- services). Optional: schedule it with pg_cron (see bottom).
-- ============================================================================

alter table public.products add column if not exists deleted_at timestamptz;
alter table public.banners add column if not exists deleted_at timestamptz;
alter table public.orders add column if not exists deleted_at timestamptz;
-- Same flag on collections/articles so every public query can filter one way
-- (no bin UI for these yet — delete buttons live on products/banners/orders).
alter table public.collections add column if not exists deleted_at timestamptz;
alter table public.articles add column if not exists deleted_at timestamptz;

create index if not exists products_deleted_at_idx on public.products (deleted_at);
create index if not exists banners_deleted_at_idx on public.banners (deleted_at);
create index if not exists orders_deleted_at_idx on public.orders (deleted_at);

-- Permanent purge: hard-deletes bin rows older than 20 days.
-- Order items + history go via ON DELETE CASCADE (bypasses RLS internally).
create or replace function public.purge_recycle_bin()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.products where deleted_at < now() - interval '20 days';
  delete from public.banners where deleted_at < now() - interval '20 days';
  delete from public.orders where deleted_at < now() - interval '20 days';
end $$;

-- Staff (orders role) may hard-delete / restore BINNED orders only.
-- (Super_admin already has FOR ALL on every table. Staff restore works via
-- the existing "staff update orders" policy.)
create policy "staff delete binned orders" on public.orders
  for delete using (
    public.is_staff(auth.uid()) and deleted_at is not null
  );
create policy "staff delete binned order_items" on public.order_items
  for delete using (
    public.is_staff(auth.uid()) and exists (
      select 1 from public.orders o
      where o.id = order_id and o.deleted_at is not null
    )
  );
create policy "staff delete binned history" on public.order_status_history
  for delete using (
    public.is_staff(auth.uid()) and exists (
      select 1 from public.orders o
      where o.id = order_id and o.deleted_at is not null
    )
  );

-- ---------------------------------------------------------------------------
-- OPTIONAL pg_cron automation (same 20-day rule, runs even if nobody opens
-- the admin; lazy purge in lib/trash.ts already covers it for free):
--   select cron.schedule('purge-recycle-bin', '0 3 * * *', 'select public.purge_recycle_bin()');
-- ---------------------------------------------------------------------------
