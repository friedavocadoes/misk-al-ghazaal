-- Run before deploying the product options update. Safe to repeat.
begin;
alter table public.products add column if not exists out_of_stock boolean not null default false;
alter table public.variants add column if not exists concentration text;
alter table public.variants add column if not exists capacity_ml numeric;
alter table public.variants add column if not exists name_override text;
alter table public.variants add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.variants add column if not exists use_product_images boolean not null default true;
alter table public.variants add column if not exists is_active boolean not null default true;
-- Preserve IDs, stock, prices and historical labels. Never treat grams as ml.
update public.variants set capacity_ml = (regexp_match(title, '(?i)([0-9]+(?:\.[0-9]+)?)\s*ml'))[1]::numeric
where capacity_ml is null and title ~* '[0-9]+\s*ml';
-- Recognize only explicitly named concentrations, never assume perfume strength.
update public.variants v set concentration=case
 when v.title||' '||p.title ~* '(extrait de parfum|\mextrait\M)' then 'Extrait de Parfum'
 when v.title||' '||p.title ~* '(eau de parfum|\mEDP\M)' then 'Eau de Parfum'
 when v.title||' '||p.title ~* '(eau de toilette|\mEDT\M)' then 'Eau de Toilette'
 when v.title||' '||p.title ~* '(eau de cologne|\mEDC\M)' then 'Eau de Cologne'
 when v.title||' '||p.title ~* 'eau fra[iî]che' then 'Eau Fraîche'
 else null end
from public.products p where p.id=v.product_id and v.concentration is null and v.capacity_ml is not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='variant_capacity_positive') then
    alter table public.variants add constraint variant_capacity_positive check (capacity_ml is null or capacity_ml > 0);
    alter table public.variants add constraint variant_concentration_valid check (concentration is null or concentration in ('Eau Fraîche','Eau de Cologne','Eau de Toilette','Eau de Parfum','Extrait de Parfum'));
    alter table public.variants add constraint variant_gallery_array check (jsonb_typeof(images) = 'array');
  end if;
end $$;
-- Existing duplicate legacy rows remain untouched; new structured combinations are unique.
create unique index if not exists variant_option_combination on public.variants(product_id, coalesce(concentration,''), capacity_ml)
where is_active and concentration is not null and capacity_ml is not null;
commit;
