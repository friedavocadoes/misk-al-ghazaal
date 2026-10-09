-- ============================================================================
-- Migration: shopper wishlist (slug list on the profile).
-- Run once in Supabase Dashboard → SQL Editor.
-- Wishlist is account-bound (guests are sent to login); RLS self-update
-- already covers own-row writes, so no new policies are needed.
-- ============================================================================

alter table public.profiles add column if not exists wishlist jsonb not null default '[]';
