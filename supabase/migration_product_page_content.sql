-- Optional, localized editorial headings. Existing product content is retained.
alter table public.products
  add column if not exists pdp_content jsonb not null default '{}'::jsonb;
comment on column public.products.pdp_content is
  'PDP heading overrides: story, composition, reviews, recommendations and matching _ar keys.';
