-- Migration: coupons v2 — max discount cap + once-per-account.
--
--   max_discount   : caps the dirhams a single coupon can take off
--                    (e.g. 20% off orders, never more than AED 150).
--                    NULL = uncapped (previous behaviour).
--   once_per_account : one redemption per shopper account, enforced in
--                    lib/pricing.ts via coupon_redemptions (guests must log
--                    in to use such codes).
--
-- Run after migration_product_experience.sql. Safe to re-run.

alter table public.coupons
  add column if not exists max_discount numeric(10,2);

alter table public.coupons
  add column if not exists once_per_account boolean not null default false;

create index if not exists coupon_redemptions_user_idx
  on public.coupon_redemptions (user_id);
