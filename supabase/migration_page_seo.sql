-- Migration: page SEO — invisible SEO layer for every storefront surface.
--
-- One row per page (page_type + slug, upserted from the admin console):
-- H1 / meta / canonical / robots / OpenGraph overrides plus free-form
-- JSON-LD merged with the auto-generated schemas. All fields optional —
-- empty rows fall back to the page's natural content. Rendered into <head>
-- + JSON-LD script tags + the single H1: never visible as page content.
--
-- page_type: product | collection | collections | home | info | blog |
--   article | search | private-label | locate-us
-- slug: product/collection/article/info slug, '' for singletons.
--
-- Safe to re-run.

create table if not exists public.page_seo (
  id uuid primary key default gen_random_uuid(),
  page_type text not null,
  slug text not null default '',
  h1 text,
  h1_ar text,
  meta_title text,
  meta_title_ar text,
  meta_description text,
  meta_description_ar text,
  canonical text,
  robots text,
  og_title text,
  og_description text,
  og_image text,
  schema_json jsonb not null default '{}',
  updated_at timestamptz default now(),
  unique (page_type, slug)
);

create index if not exists page_seo_lookup_idx
  on public.page_seo (page_type, slug);

alter table public.page_seo enable row level security;

drop policy if exists "public read page_seo" on public.page_seo;
create policy "public read page_seo" on public.page_seo
  for select using (true);

drop policy if exists "super_admin write page_seo" on public.page_seo;
create policy "super_admin write page_seo" on public.page_seo
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));
