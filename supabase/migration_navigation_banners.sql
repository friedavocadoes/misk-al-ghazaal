-- Optional campaigns reuse banner uploads, translations, ordering and recycle bin.
alter table public.banners drop constraint if exists banners_slot_check;
alter table public.banners add constraint banners_slot_check check (slot in ('hero', 'brand', 'navigation'));
