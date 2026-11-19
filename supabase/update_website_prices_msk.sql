-- Source: WEBSITE NEW PRICE MSK.xlsx, Enabled products, NEW WEB PRICE (AED).
-- Run the complete statement in Supabase SQL Editor. Blank prices are omitted.
-- Checkout reads variant prices, so sync the sole active variant when present.
-- Multiple active variants require a variant-specific price list and are reported below.
with new_prices(slug, new_price) as (
  values
    ('abukhalid', 176.00),
    ('al-aqeedha-from-misk-al-ghazal-best-bakhoor', 176.00),
    ('al-ghazaal-natural-perfume', 136.00),
    ('amber-oud-100ml-unisex', 68.00),
    ('amber-wood', 152.00),
    ('anfasic-al-ward', 176.00),
    ('be-musky-100ml-unisex', 68.00),
    ('classic-oud', 68.00),
    ('diwaan-natural-perfume-for-men-and-women-success', 68.00),
    ('dukhoon-eshq', 176.00),
    ('dukhoon-misk-al-ghazaal', 176.00),
    ('dukhoonak-big-boss', 176.00),
    ('floral-garden-eau-de-parfum-100ml-for-women', 68.00),
    ('gazaal-chancellor-edp-100ml', 68.00),
    ('gazaal-my-wish-edp-100ml', 72.00),
    ('golden-musk-100ml-unisex', 68.00),
    ('hob-al-banaat', 128.00),
    ('m05', 208.00),
    ('misk-al-barari', 136.00),
    ('misk-al-ghazaal-abukhalid-50ml', 176.00),
    ('misk-al-hob', 128.00),
    ('misk-al-khaleej', 160.00),
    ('muattar-abu-khalifa', 144.00),
    ('mubakhar-fayha', 240.00),
    ('mubakhar-misk-al-khaleej', 240.00),
    ('naajih-eau-de-parfum-100ml-unisex', 68.00),
    ('no-7-zabeel-eau-de-parfum-100ml', 80.00),
    ('noorjes-imagine', 144.00),
    ('noorjes-luxury-le-don-ea-de-parfum-100ml', 96.00),
    ('noorjes-maya-eau-de-parfum-100ml', 96.00),
    ('noorjes-star-times-all-over-spray-100ml', 96.00),
    ('noorjes-luxury-star-times-edp-100ml', 96.00),
    ('opulence', 128.00),
    ('petals', 128.00),
    ('pink-bouquet', 160.00),
    ('sugar-wood', 88.00),
    ('sulthan-variamkunnan-1921', 68.00),
    ('the-legend-eau-de-parfum-100ml-unisex', 68.00),
    ('white-mood-eau-de-parfum-100ml-unisex', 68.00)
),
targets as materialized (
  select n.slug, n.new_price, p.id as product_id, p.price as old_price,
         options.variant_count, options.variant_id
  from new_prices n
  left join public.products p on p.slug = n.slug and p.deleted_at is null
  cross join lateral (
    select count(*) as variant_count, (array_agg(v.id))[1] as variant_id
    from public.variants v
    where v.product_id = p.id and v.is_active is not false
  ) options
),
updated_products as (
  update public.products p
  set price = t.new_price
  from targets t
  where p.id = t.product_id and t.variant_count <= 1
    and p.price is distinct from t.new_price
  returning p.id
),
updated_variants as (
  update public.variants v
  set price = t.new_price
  from targets t
  where t.variant_count = 1 and v.id = t.variant_id
    and v.price is distinct from t.new_price
  returning v.id
)
select t.slug, t.old_price, t.new_price,
       case
         when t.product_id is null then 'Skipped: product missing or deleted'
         when t.variant_count > 1 then 'Skipped: multiple active variants'
         when p.id is not null or v.id is not null then 'Updated'
         else 'Already at new price'
       end as result
from targets t
left join updated_products p on p.id = t.product_id
left join updated_variants v on v.id = t.variant_id
order by t.slug;
