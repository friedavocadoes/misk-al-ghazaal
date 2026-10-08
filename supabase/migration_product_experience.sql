-- ============================================================================
-- Migration: product experience (notes, lineups, rituals, coupons,
-- referrals, reviews, short copy, checkout links)
-- Run once in Supabase Dashboard → SQL Editor AFTER schema.sql +
-- migration_soft_delete.sql. All statements are IF NOT EXISTS-safe.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Lineups: classify perfumes into named lines (admin-managed).
-- PDP "More from the lineup" shows siblings from the same lineup.
-- --------------------------------------------------------------------------
create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_ar text,
  description text default '',
  sort int default 0,
  created_at timestamptz default now()
);

alter table public.products add column if not exists lineup_id uuid references public.lineups(id) on delete set null;
create index if not exists products_lineup_idx on public.products (lineup_id);

-- --------------------------------------------------------------------------
-- Notes library: fragrance notes with a brand color dot. Assigned per
-- product as top / heart / base with an explicit order.
-- --------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_ar text,
  color text not null default '#8a6d2f',
  description text default '',
  description_ar text,
  created_at timestamptz default now()
);

create table if not exists public.product_notes (
  product_id uuid not null references public.products(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  kind text not null default 'heart' check (kind in ('top','heart','base')),
  position int not null default 0,
  primary key (product_id, note_id)
);
create index if not exists product_notes_product_idx on public.product_notes (product_id);

-- --------------------------------------------------------------------------
-- Rituals library: reusable "how to use" guides (one video/photo reused
-- across many products via dropdown — never re-uploaded).
-- --------------------------------------------------------------------------
create table if not exists public.rituals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_ar text,
  body_html text default '',
  body_ar text default '',
  image text default '',
  video_url text default '',
  created_at timestamptz default now()
);

alter table public.products add column if not exists ritual_id uuid references public.rituals(id) on delete set null;

-- --------------------------------------------------------------------------
-- PDP short + detailed copy owned per product.
-- --------------------------------------------------------------------------
alter table public.products add column if not exists short_desc text default '';
alter table public.products add column if not exists short_desc_ar text;
alter table public.products add column if not exists notes_image_desktop text default '';
alter table public.products add column if not exists notes_image_mobile text default '';

-- --------------------------------------------------------------------------
-- Coupons: admin-defined promo codes. kinds:
--   percent      → amount = 0-100 (% off subtotal)
--   fixed        → amount = AED off subtotal
--   free_shipping→ shipping = 0 (ignores thresholds)
--   gift         → gift_title added as a complimentary order line
-- Validation (server-side, lib/coupons.ts mirrors it):
--   active, date window, usage_limit, min_subtotal, first_order_only
--   (no prior non-cancelled order for the email), owner_id (personal
--   referral rewards — only that user, never listed publicly).
-- --------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  kind text not null default 'percent' check (kind in ('percent','fixed','free_shipping','gift')),
  amount numeric(10,2) not null default 0,
  min_subtotal numeric(10,2) not null default 0,
  first_order_only boolean not null default false,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  icon text not null default 'tag',
  gift_title text default '',
  gift_title_ar text,
  is_public boolean not null default true,
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists coupons_code_idx on public.coupons (code);
create index if not exists coupons_owner_idx on public.coupons (owner_id);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  unique (coupon_id, order_id)
);

-- --------------------------------------------------------------------------
-- Referrals: signup stores referred_by; checkout may carry a referral_code
-- for the reward. Reward % lives in referral_settings (admin-tunable
-- 20-30). Both sides get the discount: the newcomer on their first order,
-- the referrer as a personal single-use coupon (coupons.owner_id).
-- --------------------------------------------------------------------------
create table if not exists public.referral_settings (
  id int primary key check (id = 1),
  percent numeric(5,2) not null default 25,
  active boolean not null default true
);
insert into public.referral_settings (id, percent, active)
  values (1, 25, true) on conflict (id) do nothing;

alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists referral_uses int not null default 0;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_email text not null,
  referee_user_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  reward_coupon_id uuid references public.coupons(id) on delete set null,
  status text not null default 'rewarded' check (status in ('pending','rewarded')),
  created_at timestamptz default now()
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

-- --------------------------------------------------------------------------
-- Reviews: logged-in users only; visible on PDP after admin approval.
-- product.rating / review_count are maintained by the approval action.
-- --------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text default '',
  body text default '',
  approved boolean not null default false,
  created_at timestamptz default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on public.reviews (product_id);

-- --------------------------------------------------------------------------
-- Orders: link checkout to accounts, coupons and referrals.
-- --------------------------------------------------------------------------
alter table public.orders add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.orders add column if not exists coupon_code text default '';
alter table public.orders add column if not exists discount numeric(10,2) not null default 0;
alter table public.orders add column if not exists referral_code text default '';

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.lineups enable row level security;
alter table public.notes enable row level security;
alter table public.product_notes enable row level security;
alter table public.rituals enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.referral_settings enable row level security;
alter table public.referrals enable row level security;
alter table public.reviews enable row level security;

-- Public catalog reads (anon storefront).
create policy "public read lineups" on public.lineups for select using (true);
create policy "public read notes" on public.notes for select using (true);
create policy "public read product_notes" on public.product_notes for select using (true);
create policy "public read rituals" on public.rituals for select using (true);
-- Public may only see active, public, ownerless coupons inside their window
-- (codes for promos the maison advertises; personal/referral codes stay hidden).
create policy "public read promo coupons" on public.coupons for select using (
  is_public and active and owner_id is null
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);
create policy "public read referral settings" on public.referral_settings for select using (true);
-- Only approved reviews are public.
create policy "public read approved reviews" on public.reviews for select using (approved = true);
-- Logged-in users can file (and edit) their own review; one row per product
-- is enforced by the unique constraint.
create policy "users insert own review" on public.reviews for insert
  with check (auth.uid() = user_id);
create policy "users update own review" on public.reviews for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Users can read their own referral rows + personal coupons.
create policy "users read own referrals" on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referee_user_id);
create policy "users read own coupons" on public.coupons for select
  using (auth.uid() = owner_id);

-- Catalog + promo writes: super_admin only (service_role bypasses anyway).
create policy "super_admin all lineups" on public.lineups for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all notes" on public.notes for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all product_notes" on public.product_notes for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all rituals" on public.rituals for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all coupons" on public.coupons for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all redemptions" on public.coupon_redemptions for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all referral settings" on public.referral_settings for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all referrals" on public.referrals for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin all reviews" on public.reviews for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- Staff (orders role) can read redemptions + referrals for support.
create policy "staff read redemptions" on public.coupon_redemptions for select
  using (public.is_staff(auth.uid()));
create policy "staff read referrals" on public.referrals for select
  using (public.is_staff(auth.uid()));

-- Atomic coupon usage bump (called at order placement).
create or replace function public.increment_coupon_use(p_coupon_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.coupons set used_count = used_count + 1 where id = p_coupon_id;
end $$;

-- Starter aggregates are honest zeros: real rating/count are maintained
-- by the review-approval action, never seeded.
update public.products set rating = 0, review_count = 0;

-- ============================================================================
-- Seed: starter notes library (admin can extend; colors are the PDP dots).
-- ============================================================================
insert into public.notes (slug, name, name_ar, color) values
  ('oud', 'Hindi Oud', 'عود هندي', '#4a2f1d'),
  ('musk', 'White Musk', 'مسك أبيض', '#e8e0d0'),
  ('rose', 'Taif Rose', 'ورد طائفي', '#b64a5a'),
  ('amber', 'Grey Amber', 'عنبر', '#c98a2d'),
  ('saffron', 'Saffron', 'زعفران', '#d64533'),
  ('sandalwood', 'Sandalwood', 'صندل', '#a0714f'),
  ('bakhoor-smoke', 'Bakhoor Smoke', 'دخان البخور', '#6b6560'),
  ('citrus', 'Citrus Peel', 'قشر الحمضيات', '#d9a92e')
on conflict (slug) do nothing;
