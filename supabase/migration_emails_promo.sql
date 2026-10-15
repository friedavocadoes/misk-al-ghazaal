-- ============================================================================
-- Misk Al Ghazaal — emails + promo migration
-- Run once in Supabase Dashboard → SQL Editor.
-- Adds: profiles.promo_opt_in, hello_mail_settings (singleton),
-- promo_campaigns (newsletter drafts/sends), promo storage bucket.
-- ============================================================================

-- 1. Promo opt-in on profiles (default ON — checkbox ships checked).
alter table public.profiles
  add column if not exists promo_opt_in boolean not null default true;

-- 2. Hello (welcome) mail template — singleton row id = 1, edited at
-- /admin/emails/hello. product_slugs picks the 2–3 best sellers shown.
create table if not exists public.hello_mail_settings (
  id int primary key,
  subject text not null default 'Welcome to the Maison — Misk Al Ghazaal',
  heading text not null default 'Ahlan wa sahlan, {name}.',
  body_html text not null default '<p>Your maison account is ready. From here you can track every parcel, keep a wishlist, hold reward coupons — and invite friends: you both earn on their first order.</p><p>Start with the icons below — every order leaves with complimentary samples.</p>',
  product_slugs text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.hello_mail_settings (id, subject, heading, body_html, product_slugs)
values (1, 'Welcome to the Maison — Misk Al Ghazaal', 'Ahlan wa sahlan, {name}.',
  '<p>Your maison account is ready. From here you can track every parcel, keep a wishlist, hold reward coupons — and invite friends: you both earn on their first order.</p><p>Start with the icons below — every order leaves with complimentary samples.</p>',
  '{}')
on conflict (id) do nothing;

-- 3. Promo campaigns (newsletters / offers, promo@ sender).
create table if not exists public.promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null default '',
  preheader text not null default '',
  body_html text not null default '',
  status text not null default 'draft' check (status in ('draft','sent')),
  recipient_count int not null default 0,
  sent_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- 4. RLS
alter table public.hello_mail_settings enable row level security;
alter table public.promo_campaigns enable row level security;

drop policy if exists "public read hello settings" on public.hello_mail_settings;
create policy "public read hello settings" on public.hello_mail_settings
  for select using (true);

drop policy if exists "super_admin write hello settings" on public.hello_mail_settings;
create policy "super_admin write hello settings" on public.hello_mail_settings
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists "staff read promo campaigns" on public.promo_campaigns;
create policy "staff read promo campaigns" on public.promo_campaigns
  for select using (public.is_staff(auth.uid()));

drop policy if exists "super_admin write promo campaigns" on public.promo_campaigns;
create policy "super_admin write promo campaigns" on public.promo_campaigns
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- 5. Promo image bucket (newsletter artwork uploads).
insert into storage.buckets (id, name, public)
values ('promo', 'promo', true)
on conflict (id) do nothing;

drop policy if exists "public read promo bucket" on storage.objects;
create policy "public read promo bucket" on storage.objects
  for select using (bucket_id = 'promo');

drop policy if exists "super_admin write promo bucket" on storage.objects;
create policy "super_admin write promo bucket" on storage.objects
  for insert with check (
    bucket_id = 'promo' and public.is_super_admin(auth.uid())
  );

drop policy if exists "super_admin update promo bucket" on storage.objects;
create policy "super_admin update promo bucket" on storage.objects
  for update using (
    bucket_id = 'promo' and public.is_super_admin(auth.uid())
  );

drop policy if exists "super_admin delete promo bucket" on storage.objects;
create policy "super_admin delete promo bucket" on storage.objects
  for delete using (
    bucket_id = 'promo' and public.is_super_admin(auth.uid())
  );
