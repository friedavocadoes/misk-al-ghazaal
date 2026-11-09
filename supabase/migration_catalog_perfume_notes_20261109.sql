-- GAZAAL catalog l.pdf, pages 2–13. Middle Notes = heart.
-- Paste the entire file in Supabase SQL Editor, clear any selection, and Run.
-- Run after the notes expansion migration. This file is one atomic statement.
-- Explicit storefront slugs target nine products. NULL means no confirmed
-- product match. Set a NULL slug only once the correct listing is confirmed.
-- Aliases: Apple -> existing Granny Smith Apple; Jasmine blossoms -> Jasmine;
-- Sicily lemon -> Lemon; Green grapefruit -> Grapefruit; White freesia -> Freesia.
-- Blackcurrant juice uses Blackcurrant. Woody/Gourmand/Oriental accord use
-- their existing library entries. Tonka beans and Coconut blossoms are singularized.
-- Distinct notes missing from the library are inserted with the default glyph.
do $catalog$
declare
  missing text;
  unresolved text;
  skipped text;
  product_count integer;
  assignment_count integer;
begin

create temporary table catalog_formulas (
  pdf_page integer primary key,
  perfume text not null,
  product_slug text unique,
  top_notes text[] not null,
  heart_notes text[] not null,
  base_notes text[] not null
) on commit drop;

insert into catalog_formulas values
  (2, 'Amber & Oud', 'amber-oud-100ml-unisex',
    '{blackcurrant,apple,pineapple,pear}', '{rose,jasmine,peach,lily-of-the-valley}', '{ambergris,oud,moss}'),
  (3, 'Be Musky', 'be-musky-100ml-unisex',
    '{rose,pineapple,bergamot}', '{apple,peach,freesia}', '{patchouli,tobacco,gourmand}'),
  (4, 'Chancellor', 'gazaal-chancellor-edp-100ml',
    '{blackcurrant,mandarin,pear}', '{rose,plum-blossom,jasmine}', '{white-musk,dry-amber,raspberry}'),
  (5, 'Classic Oud', 'classic-oud',
    '{lemon,apple,plum,green}', '{jasmine,rose,violet,cyclamen}', '{sandalwood,amber,peach,musk}'),
  (6, 'Floral Garden', 'floral-garden-eau-de-parfum-100ml-for-women',
    '{blackcurrant,pear,cut-grass}', '{ylang-ylang,jasmine}', '{sandalwood,musk,vanilla}'),
  (7, 'Golden Musk', 'golden-musk-100ml-unisex',
    '{woody,vanilla-wood,saffron}', '{rose,styrax,cashmere-wood}', '{oriental,guaiac-wood,dry-wood}'),
  (8, 'Hijrah', null,
    '{bergamot,pineapple,apple}', '{lavandin,geranium,patchouli}', '{dry-amber,oakmoss-accord,vetiver}'),
  (9, 'The Legend', 'the-legend-eau-de-parfum-100ml-unisex',
    '{nutmeg,cardamom,artemisia}', '{dry-amber,cedarwood,guaiac-wood}', '{patchouli,musk}'),
  (10, 'Naajih', 'naajih-eau-de-parfum-100ml-unisex',
    '{bergamot,lemon,apple,cinnamon}', '{dry-amber,pineapple,grapefruit}', '{dry-wood,vanilla,oakmoss-accord,tonka-bean}'),
  (11, 'Prestige', null,
    '{mandarin,pear,plum}', '{rose,heliotrope,orange-blossom}', '{patchouli,vanilla-wood,musk}'),
  (12, 'White Mood', 'white-mood-eau-de-parfum-100ml-unisex',
    '{incense,nutmeg}', '{dry-amber,vanilla,saffron}', '{dry-wood,animalic,guaiac-wood,moss}'),
  (13, 'White & White', null,
    '{orange,lemon,blackcurrant}', '{jasmine,freesia,coconut-blossom}', '{musk,sandalwood,gourmand}');

create temporary table catalog_assignments on commit drop as
select f.product_slug, stage.kind, entry.note_slug, stage.start_at + (entry.ordinality - 1)::int as position
from catalog_formulas f
cross join lateral (
  values
    ('top', f.top_notes, 0),
    ('heart', f.heart_notes, cardinality(f.top_notes)),
    ('base', f.base_notes, cardinality(f.top_notes) + cardinality(f.heart_notes))
) stage(kind, notes, start_at)
cross join lateral unnest(stage.notes) with ordinality entry(note_slug, ordinality)
where f.product_slug is not null;

  select string_agg(f.product_slug, ', ' order by f.pdf_page) into missing
  from catalog_formulas f
  where f.product_slug is not null
    and not exists (select 1 from public.products p where p.slug = f.product_slug and p.deleted_at is null);
  if missing is not null then
    raise exception 'Catalog migration stopped. Missing or deleted products: %', missing;
  end if;

  select string_agg(d.product_slug || '/' || d.note_slug, ', ') into missing
  from (
    select product_slug, note_slug
    from catalog_assignments
    group by product_slug, note_slug
    having count(*) > 1
  ) d;
  if missing is not null then
    raise exception 'Catalog migration stopped. The schema allows one stage per note per perfume: %', missing;
  end if;

with new_notes(slug, name, name_ar, color, description) as (
  values
    ('ambergris', 'Ambergris', 'عنبر بحري', '#a49072', 'A soft marine accord with salty, warm and musky facets.'),
    ('mandarin', 'Mandarin', 'يوسفي', '#bb773e', 'A sweet, bright citrus note with a softly aromatic peel.'),
    ('plum-blossom', 'Plum Blossom', 'زهر البرقوق', '#a66f82', 'A light floral note with a soft fruit nuance.'),
    ('white-musk', 'White Musk', 'مسك أبيض', '#aaa195', 'A clean, soft musk accord with a smooth, airy finish.'),
    ('dry-amber', 'Dry Amber', 'عنبر جاف', '#aa754a', 'A warm amber accord with a dry, woody finish.'),
    ('cut-grass', 'Cut Grass', 'عشب مقطوف', '#788452', 'A crisp green note reminiscent of freshly cut grass.'),
    ('vanilla-wood', 'Vanilla Wood', 'خشب الفانيليا', '#a68863', 'A woody accord with a soft vanilla warmth.'),
    ('dry-wood', 'Dry Wood', 'خشب جاف', '#8a735c', 'A dry woody accord with a clean, textured finish.'),
    ('oakmoss-accord', 'Oakmoss Accord', 'طحلب البلوط', '#666c46', 'An earthy, green moss accord with dry woodland facets.'),
    ('lavandin', 'Lavandin', 'لافاندين', '#847b9d', 'An aromatic lavender hybrid with a fresh, camphoraceous edge.'),
    ('orange-blossom', 'Orange Blossom', 'زهر البرتقال', '#bc9069', 'A bright white floral note with a soft citrus facet.')
)
insert into public.notes (slug, name, name_ar, color, description, glyph, is_active)
select n.slug, n.name, n.name_ar, n.color, n.description, '/notes/essence.svg', true
from new_notes n
where exists (select 1 from catalog_assignments a where a.note_slug = n.slug)
  and not exists (
    select 1 from public.notes existing
    where lower(btrim(existing.name)) = lower(n.name)
  )
on conflict (slug) do nothing;

  select string_agg(distinct a.note_slug, ', ' order by a.note_slug) into unresolved
  from catalog_assignments a
  left join public.notes n on n.slug = a.note_slug
  where n.id is null or n.is_active is not true;
  if unresolved is not null then
    raise exception 'Catalog migration stopped. Missing or disabled note slugs: %', unresolved;
  end if;

create temporary table catalog_resolved on commit drop as
select p.id as product_id, n.id as note_id, a.kind, a.position
from catalog_assignments a
join public.products p on p.slug = a.product_slug and p.deleted_at is null
join public.notes n on n.slug = a.note_slug;

insert into public.product_notes as existing (product_id, note_id, kind, position)
select product_id, note_id, kind, position
from catalog_resolved
on conflict (product_id, note_id) do update
set kind = excluded.kind, position = excluded.position
where (existing.kind, existing.position) is distinct from (excluded.kind, excluded.position);

delete from public.product_notes pn
using (select distinct product_id from catalog_resolved) target
where pn.product_id = target.product_id
  and not exists (
    select 1 from catalog_resolved r
    where r.product_id = pn.product_id and r.note_id = pn.note_id
  );

  select count(distinct product_id), count(*)
  into product_count, assignment_count
  from catalog_resolved;
  select string_agg(perfume, ', ' order by pdf_page) into skipped
  from catalog_formulas where product_slug is null;
  raise notice 'Applied % note assignments across % perfumes.', assignment_count, product_count;
  if skipped is not null then
    raise notice 'Skipped without a confirmed product: %', skipped;
  end if;
end;
$catalog$;
