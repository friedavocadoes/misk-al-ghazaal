-- ============================================================================
-- Migration: Luxury Revamp (Scent Alchemist homepage section + Hero align)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run (idempotent).
-- ============================================================================

-- 1. Allow 'scent_alchemist' in homepage_sections.kind so it can be reordered,
--    toggled, and configured directly inside /admin/homepage.
alter table public.homepage_sections
  drop constraint if exists homepage_sections_kind_check;

alter table public.homepage_sections
  add constraint homepage_sections_kind_check check (kind in (
    'scent_alchemist',
    'products_carousel',
    'product_tabs',
    'collections_grid',
    'brand_split',
    'parallax_cta',
    'story',
    'dual_feature',
    'testimonials',
    'blog_grid',
    'instagram',
    'image_banner'
  ));

-- 2. Seed the 'scent_alchemist' row at the top of homepage_sections if not present.
insert into public.homepage_sections (kind, title, title_ar, eyebrow, eyebrow_ar, config, sort, active)
select
  'scent_alchemist',
  'The Art of High Perfumery',
  'فن العطور الراقية',
  'Interactive Scent Alchemist',
  'خيميائي العطور التفاعلي',
  '{"mode":"collection","prompt":"Tap up to 3 accords to compose your aura","promptAr":"اختر حتى 3 نوتات لتركيب هالتك العطرية"}'::jsonb,
  5,
  true
where not exists (
  select 1 from public.homepage_sections where kind = 'scent_alchemist'
);
