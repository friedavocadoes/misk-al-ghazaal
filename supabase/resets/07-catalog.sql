-- Deletes ALL products (active AND recycle bin), variants, notes assignments,
-- collections, lineups, rituals, note library, samples, sample categories and tiers.
-- Product/order snapshots and uploaded Storage files are NOT erased by this script.
begin;
delete from public.products;
delete from public.samples;
delete from public.sample_categories;
delete from public.sample_tiers;
delete from public.collections;
delete from public.lineups;
delete from public.rituals;
delete from public.notes;
commit;
