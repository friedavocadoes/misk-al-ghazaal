-- ============================================================================
-- Migration: shopper email preferences (order updates opt-out).
-- Run once in Supabase Dashboard → SQL Editor.
-- promo_opt_in already exists (migration_emails_promo.sql); this adds the
-- order-mail twin. Both default ON — mail code treats a missing/false-safe
-- read as opted-in, so pre-migration rows keep receiving everything.
-- ============================================================================

alter table public.profiles
  add column if not exists order_updates_opt_in boolean not null default true;
