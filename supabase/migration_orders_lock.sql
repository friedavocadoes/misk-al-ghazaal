-- ============================================================================
-- Migration: lock orders to accounts + shopper contact profile + ETA.
-- Run once in Supabase Dashboard → SQL Editor.
--
-- 1. orders.expected_delivery_date (date, nullable) — set by staff in
--    /admin/orders/[id], shown on /account/orders + the order detail page.
-- 2. profiles.full_name / phone / default_address — checkout autofill +
--    "save my number" + account profile editor. Claimed from the last
--    order when the shopper never filled them.
-- 3. RLS: shoppers read ONLY their own user_id-bound orders/items.
--    Guest orders are adopted at login (POST /api/auth/ensure + OAuth
--    callback claim user_id IS NULL rows matching the verified auth
--    email), so nothing visible is lost — but one account can never
--    read another's orders again, even with a matching typed email.
-- ============================================================================

alter table public.orders
  add column if not exists expected_delivery_date date;

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists default_address jsonb;

-- Strict replacement for migration_shopper_reads.sql (email fallback
-- removed — claiming happens server-side on verified login instead).
drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
      and auth.uid() = o.user_id
    )
  );
