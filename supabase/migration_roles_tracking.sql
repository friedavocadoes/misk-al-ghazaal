-- ============================================================================
-- Migration: shopper/staff role split + courier tracking link.
-- Run once in Supabase Dashboard → SQL Editor.
--
-- WHY: profiles.role defaulted to 'orders', so EVERY shopper signup became
-- staff (shoppers could open /admin/orders and read all orders). After this:
--   customer    = shoppers (default; zero admin access)
--   orders      = staff, order operations only
--   super_admin = everything
-- NOTE: all existing 'orders' rows become 'customer' — re-promote real
-- staff afterwards:
--   update public.profiles set role = 'orders' where email = 'staff@company.com';
--   update public.profiles set role = 'super_admin' where email = 'you@company.com';
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('super_admin', 'orders', 'customer'));
alter table public.profiles alter column role set default 'customer';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end $$;

-- Demote everyone who only has the role via the old default. Genuine staff
-- are re-promoted with the SQL above (super_admin rows are untouched).
update public.profiles set role = 'customer' where role = 'orders';

-- Courier tracking link (admin pastes the courier URL; shoppers get a
-- "Track parcel" button. Blank = show the tracking code only).
alter table public.orders add column if not exists tracking_url text default '';
