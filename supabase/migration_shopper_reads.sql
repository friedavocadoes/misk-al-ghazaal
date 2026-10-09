-- ============================================================================
-- Migration: shoppers read their own orders (+ items) for /account/orders.
-- Run once in Supabase Dashboard → SQL Editor.
-- Email match covers guest checkouts later claimed by the same address;
-- user_id covers everything placed while signed in.
-- ============================================================================

create policy "users read own orders" on public.orders for select using (
  auth.uid() = user_id
  or (
    email is not null
    and email <> ''
    and lower(email) = lower(auth.jwt() ->> 'email')
  )
);

create policy "users read own order items" on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
    and (
      auth.uid() = o.user_id
      or (
        o.email is not null
        and o.email <> ''
        and lower(o.email) = lower(auth.jwt() ->> 'email')
      )
    )
  )
);
