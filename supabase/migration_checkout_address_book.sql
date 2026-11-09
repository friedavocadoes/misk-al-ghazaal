create table if not exists public.shopper_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  address_key text not null,
  address jsonb not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, address_key)
);

alter table public.shopper_addresses enable row level security;
grant select, insert, update on public.shopper_addresses to authenticated;
grant all on public.shopper_addresses to service_role;

drop policy if exists "Shoppers manage their addresses" on public.shopper_addresses;
create policy "Shoppers manage their addresses"
  on public.shopper_addresses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
