-- ============================================================================
-- Migration: GCC delivery (countries admin, map pins) + synced carts.
-- Run once in Supabase Dashboard → SQL Editor.
--   delivery_countries: admin-toggled GCC list with per-country states.
--     The map + checkout validate against THIS table (single source).
--   orders: structured delivery columns (pin for the courier included).
--   profiles.cart: cross-device bag (jsonb array of {slug,variantId?,qty}).
-- ============================================================================

create table if not exists public.delivery_countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_ar text,
  active boolean not null default true,
  states jsonb not null default '[]',
  sort int not null default 0
);

alter table public.orders add column if not exists country_code text default '';
alter table public.orders add column if not exists state_name text default '';
alter table public.orders add column if not exists postcode text default '';
alter table public.orders add column if not exists address_label text default '';
alter table public.orders add column if not exists delivery_lat numeric;
alter table public.orders add column if not exists delivery_lng numeric;

alter table public.profiles add column if not exists cart jsonb not null default '[]';

alter table public.delivery_countries enable row level security;

-- Shoppers see (and checkout validates against) active countries only.
create policy "public read active countries" on public.delivery_countries
  for select using (active = true);
create policy "super_admin all countries" on public.delivery_countries
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed: GCC with states (admin edits names/states/toggles in /admin/countries)
-- states jsonb: [{en, ar}]
-- ---------------------------------------------------------------------------
insert into public.delivery_countries (code, name_en, name_ar, active, states, sort) values
('AE', 'United Arab Emirates', 'الإمارات', true,
 '[{"en":"Abu Dhabi","ar":"أبوظبي"},{"en":"Dubai","ar":"دبي"},{"en":"Sharjah","ar":"الشارقة"},{"en":"Ajman","ar":"عجمان"},{"en":"Ras Al Khaimah","ar":"رأس الخيمة"},{"en":"Fujairah","ar":"الفجيرة"},{"en":"Umm Al Quwain","ar":"أم القيوين"}]', 0),
('SA', 'Saudi Arabia', 'السعودية', true,
 '[{"en":"Riyadh","ar":"الرياض"},{"en":"Makkah","ar":"مكة"},{"en":"Madinah","ar":"المدينة"},{"en":"Eastern Province","ar":"الشرقية"},{"en":"Asir","ar":"عسير"},{"en":"Jazan","ar":"جازان"},{"en":"Najran","ar":"نجران"},{"en":"Al Bahah","ar":"الباحة"},{"en":"Northern Borders","ar":"الحدود الشمالية"},{"en":"Al Jawf","ar":"الجوف"},{"en":"Hail","ar":"حائل"},{"en":"Qassim","ar":"القصيم"},{"en":"Tabuk","ar":"تبوك"}]', 1),
('QA', 'Qatar', 'قطر', true,
 '[{"en":"Doha","ar":"الدوحة"},{"en":"Al Rayyan","ar":"الريان"},{"en":"Al Wakrah","ar":"الوكرة"},{"en":"Umm Salal","ar":"أم صلال"},{"en":"Al Khor","ar":"الخور"},{"en":"Al Shamal","ar":"الشمال"},{"en":"Al Daayen","ar":"الضعاين"},{"en":"Al Shahaniya","ar":"الشيحانية"}]', 2),
('KW', 'Kuwait', 'الكويت', true,
 '[{"en":"Capital","ar":"العاصمة"},{"en":"Hawalli","ar":"حولي"},{"en":"Farwaniya","ar":"الفروانية"},{"en":"Ahmadi","ar":"الأحمدي"},{"en":"Jahra","ar":"الجهراء"},{"en":"Mubarak Al-Kabeer","ar":"مبارك الكبير"}]', 3),
('BH', 'Bahrain', 'البحرين', true,
 '[{"en":"Capital","ar":"العاصمة"},{"en":"Muharraq","ar":"المحرق"},{"en":"Northern","ar":"الشمالية"},{"en":"Southern","ar":"الجنوبية"}]', 4),
('OM', 'Oman', 'عُمان', true,
 '[{"en":"Muscat","ar":"مسقط"},{"en":"Dhofar","ar":"ظفار"},{"en":"Ad Dakhiliyah","ar":"الداخلية"},{"en":"Al Batinah North","ar":"الباطنة شمال"},{"en":"Al Batinah South","ar":"الباطنة جنوب"},{"en":"Ash Sharqiyah North","ar":"الشرقية شمال"},{"en":"Ash Sharqiyah South","ar":"الشرقية جنوب"},{"en":"Al Dhahirah","ar":"الظاهرة"},{"en":"Al Buraimi","ar":"البريمي"},{"en":"Al Wusta","ar":"الوسطى"},{"en":"Musandam","ar":"مسندم"}]', 5)
on conflict (code) do nothing;
