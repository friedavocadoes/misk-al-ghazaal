-- ============================================================================
-- Migration: product availability (hide without deleting).
-- Run once in Supabase Dashboard → SQL Editor.
-- is_active=false hides the product from every storefront query (the admin
-- still lists + edits it). Bulk activate/deactivate lives on /admin/products.
-- ============================================================================

alter table public.products add column if not exists is_active boolean not null default true;
create index if not exists products_active_idx on public.products (is_active);
