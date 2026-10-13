-- Migration: referrals v2 — split percents + caps per side.
--
--   referrer_percent / referrer_cap : what the inviter's personal coupon
--     carries (e.g. 25% off, capped at Dhs 50).
--   referee_percent / referee_cap   : what the newcomer saves on their
--     first order (e.g. 20% off, capped at Dhs 50).
--
-- Backfills both percents from the legacy single `percent` so live promo
-- economics never change silently on migrate — tune the four values at
-- /admin/referrals afterwards. Caps default to 50. Safe to re-run.

alter table public.referral_settings
  add column if not exists referrer_percent numeric(5,2) not null default 25;

alter table public.referral_settings
  add column if not exists referee_percent numeric(5,2) not null default 20;

alter table public.referral_settings
  add column if not exists referrer_cap numeric(10,2) not null default 50;

alter table public.referral_settings
  add column if not exists referee_cap numeric(10,2) not null default 50;

update public.referral_settings
set referrer_percent = percent,
    referee_percent = percent
where id = 1;
