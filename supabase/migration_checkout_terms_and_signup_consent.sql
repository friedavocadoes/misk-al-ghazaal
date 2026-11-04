-- Run after shopper roles and email preferences, before deploying checkout.
alter table public.orders add column if not exists checkout_terms_version text;
alter table public.profiles alter column promo_opt_in set default false;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, promo_opt_in)
  values (
    new.id, new.email, 'customer',
    coalesce(new.raw_app_meta_data->>'provider' = 'email'
      and new.raw_user_meta_data->'signup_promo_opt_in' = 'true'::jsonb, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;
