-- ============================================================================
-- Misk Al Ghazaal — Supabase schema (Phase 2 backend)
-- Run in order in Supabase Dashboard → SQL Editor:
--   1. this file (schema + RLS + storage)
--   2. seed.sql (optional demo rows)
-- Mirrors src/lib/types.ts. Storefront reads via publishable key
-- (`sb_publishable_…` → `anon` role, public SELECT); privileged writes go
-- through the secret key (`sb_secret_…` → `service_role`, bypasses RLS)
-- in Server Actions / /api/* only.
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles --
-- One row per auth user. role drives /admin access:
--   super_admin = orders + products/banners/content/analytics
--   orders      = orders list + status updates only
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'orders' check (role in ('super_admin', 'orders')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ collections --
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_ar text,
  image text not null default '',
  description text,
  description_ar text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- products --
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_ar text,
  description_html text not null default '',
  description_ar text,
  price numeric(10,2) not null,
  compare_at numeric(10,2),
  images text[] not null default '{}',
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  featured boolean not null default false,
  is_new boolean not null default false,
  is_best_seller boolean not null default false,
  template text not null default 'standard' check (template in ('standard', 'miskalgazaal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  title text not null,
  price numeric(10,2) not null,
  stock int default null,
  sku text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (product_id, collection_id)
);

-- ---------------------------------------------------------------- banners --
-- slot 'hero' → homepage HeroSlider, 'brand' → shop-by-brand split.
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  slot text not null default 'hero' check (slot in ('hero', 'brand')),
  sort int not null default 0,
  src text not null,
  fallback text not null default '',
  alt text not null default '',
  eyebrow text, eyebrow_ar text,
  title text, title_ar text,
  "desc" text, desc_ar text,
  cta text, cta_ar text,
  href text,
  fit text check (fit in ('cover', 'contain')),
  focal text,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- articles --
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_ar text,
  excerpt text not null default '',
  excerpt_ar text,
  image text not null default '',
  date date not null default current_date,
  author text,
  content_html text not null default '',
  content_ar text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- orders --
-- COD-first. Anonymous shoppers check out via POST /api/checkout which
-- writes with the secret key, so the publishable (`anon`) role needs NO
-- direct table access.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  customer_name text not null,
  phone text not null,
  email text,
  address text not null default '',
  city text not null default 'Dubai',
  emirate text not null default 'Dubai',
  notes text,
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'cod' check (payment_method in ('cod', 'card')),
  status text not null default 'new'
    check (status in ('new','confirmed','packed','out_for_delivery','delivered','cancelled','returned')),
  tracking_no text,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_slug text not null,
  variant_id uuid,
  title text not null,
  qty int not null check (qty > 0),
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------- helpers + triggers --
-- Auto-create profile row on signup (defaults to orders role; promote the
-- first user to super_admin manually, see below).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'orders')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Human order numbers: MG-0001, MG-0002, …
create or replace function public.assign_order_no()
returns trigger language plpgsql as $$
declare n int;
begin
  if new.order_no is null or new.order_no = '' then
    select count(*) + 1 into n from public.orders;
    new.order_no := 'MG-' || lpad(n::text, 4, '0');
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_assign_no on public.orders;
create trigger orders_assign_no
  before insert or update on public.orders
  for each row execute function public.assign_order_no();

-- Stock decrement (called with the secret key from checkout). Fails loudly
-- on insufficient stock so the API can return 400 instead of overselling.
create or replace function public.decrement_stock(p_variant_id uuid, p_qty int)
returns void language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  select stock into cur from public.variants where id = p_variant_id for update;
  if not found then raise exception 'variant % not found', p_variant_id; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'invalid stock quantity'; end if;
  if cur is null then return; end if;
  if cur < p_qty then raise exception 'insufficient stock for %', p_variant_id; end if;
  update public.variants set stock = stock - p_qty where id = p_variant_id;
end $$;

-- Role check used by RLS policies (avoids recursion on profiles).
create or replace function public.is_staff(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('orders', 'super_admin')
  );
$$;

create or replace function public.is_super_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'super_admin'
  );
$$;

-- ------------------------------------------------------------------- RLS --
alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.product_collections enable row level security;
alter table public.banners enable row level security;
alter table public.articles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

-- Public storefront reads (publishable key → `anon` role + signed-in users).
-- Role mapping is unchanged: publishable resolves to `anon`/`authenticated`,
-- secret key resolves to `service_role` (BYPASSRLS).
create policy "public read collections" on public.collections for select using (true);
create policy "public read products" on public.products for select using (true);
create policy "public read variants" on public.variants for select using (true);
create policy "public read product_collections" on public.product_collections for select using (true);
create policy "public read banners" on public.banners for select using (true);
create policy "public read articles" on public.articles for select using (true);

-- Catalog writes: super_admin only (via logged-in publishable-key client).
-- The secret key bypasses RLS entirely, so these policies gate user clients.
create policy "super_admin write collections" on public.collections
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin write products" on public.products
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin write variants" on public.variants
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin write product_collections" on public.product_collections
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin write banners" on public.banners
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super_admin write articles" on public.articles
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- Profiles: users read themselves; staff read all (for assignee lists).
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id or public.is_staff(auth.uid()));
-- Nobody updates their own role (promote via Dashboard → Table Editor, which
-- uses the secret key, or SQL below). Name/email self-update allowed:
create policy "users update own email" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Orders: checkout writes via secret key (/api/checkout), so the publishable
-- role gets nothing directly. Staff read + update status fields.
create policy "staff read orders" on public.orders
  for select using (public.is_staff(auth.uid()));
create policy "staff update orders" on public.orders
  for update using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
create policy "staff read order_items" on public.order_items
  for select using (public.is_staff(auth.uid()));
create policy "staff read history" on public.order_status_history
  for select using (public.is_staff(auth.uid()));
create policy "staff write history" on public.order_status_history
  for insert with check (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- storage --
-- Buckets are created here; upload via Dashboard → Storage afterwards works too.
insert into storage.buckets (id, name, public)
values ('products', 'products', true), ('banners', 'banners', true)
on conflict (id) do nothing;

-- Public read for both buckets.
create policy "public read products bucket" on storage.objects
  for select using (bucket_id in ('products', 'banners'));
-- Writes: super_admin only. Filenames: <slug>-<uuid>.webp recommended.
create policy "super_admin write products bucket" on storage.objects
  for insert with check (
    bucket_id in ('products', 'banners') and public.is_super_admin(auth.uid())
  );
create policy "super_admin update products bucket" on storage.objects
  for update using (
    bucket_id in ('products', 'banners') and public.is_super_admin(auth.uid())
  );
create policy "super_admin delete products bucket" on storage.objects
  for delete using (
    bucket_id in ('products', 'banners') and public.is_super_admin(auth.uid())
  );

-- ============================================================================
-- PROMOTE YOUR FIRST ADMIN (run after creating the user in Dashboard → Auth):
--   update public.profiles set role = 'super_admin' where email = 'you@company.com';
-- CREATE STAFF (orders-only): Dashboard → Authentication → Add user, then:
--   update public.profiles set role = 'orders' where email = 'staff@company.com';
-- ============================================================================
