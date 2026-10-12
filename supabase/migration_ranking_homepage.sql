-- ============================================================================
-- Migration: product ranking (manual weight + automatic sales lift) and
-- homepage CMS sections.
-- Run once in Supabase Dashboard → SQL Editor.
--
-- RANKING (effective order = score ASC, created_at DESC):
--   score = sort - (is_best_seller ? 5000 : 0) - sales_count
--   * sort defaults 0 → ties break by created_at DESC, so the LAST ADDED
--     product surfaces at the top of every listing automatically.
--   * Admin sets sort low (even negative) to pin to the top, high (9999)
--     to weigh something down to the bottom — see product editor.
--   * sales_count increments on every paid line (checkout route) — the
--     light best-seller algo: each sale quietly pulls the product upward.
--
-- HOMEPAGE CMS: homepage_sections drives the entire home screen order +
-- content (admin enables/reorders/disables rows, no deploys).
-- ============================================================================

alter table public.products add column if not exists sort int not null default 0;
alter table public.products add column if not exists sales_count int not null default 0;
create index if not exists products_rank_idx on public.products (sort, created_at desc);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'products_carousel', 'product_tabs', 'collections_grid', 'brand_split',
    'parallax_cta', 'story', 'dual_feature', 'testimonials', 'blog_grid',
    'instagram', 'image_banner'
  )),
  title text default '',
  title_ar text,
  eyebrow text default '',
  eyebrow_ar text,
  config jsonb not null default '{}',
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.homepage_sections enable row level security;

-- Public storefront reads active sections; writes are super_admin only
-- (service_role bypasses anyway for seeds).
create policy "public read homepage sections" on public.homepage_sections
  for select using (active = true);
create policy "super_admin all homepage sections" on public.homepage_sections
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed: mirrors the current homepage composition (order + content), so the
-- migration changes nothing visible until the admin starts editing.
-- product_carousel config: {mode, collection, slugs[], limit}
-- image_banner config: {src, href, title, cta}
-- ---------------------------------------------------------------------------
insert into public.homepage_sections (kind, title, title_ar, eyebrow, config, sort, active) values
  ('products_carousel', 'Best Sellers', 'الأكثر مبيعاً', 'The Icons',
   '{"mode":"collection","collection":"best-sellers","limit":8}', 10, true),
  ('brand_split', '', '', '', '{}', 20, true),
  ('products_carousel', 'New Arrivals', 'وصل حديثاً', 'Just Landed',
   '{"mode":"collection","collection":"new-arrivals","limit":8}', 30, true),
  ('parallax_cta', '', '', '', '{}', 40, true),
  ('collections_grid', 'Shop by Ritual', 'تسوّق حسب الطقوس', 'The Library',
   '{"limit":6}', 50, true),
  ('product_tabs', 'Trending Now', 'الرائج الآن', '', '{}', 60, true),
  ('story', '', '', '', '{}', 70, true),
  ('dual_feature', '', '', '', '{}', 80, true),
  ('testimonials', '', '', '', '{}', 90, true),
  ('blog_grid', 'Notes on Scent', 'خواطر عن العطر', 'Journal', '{"limit":3}', 100, true),
  ('instagram', 'Follow the Ritual', 'تابع الطقوس', '@misk.al.ghazaal', '{}', 110, true);
