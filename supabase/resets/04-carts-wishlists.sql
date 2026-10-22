-- Clears server-saved CUSTOMER bags and wishlists, not browser localStorage.
begin;
update public.profiles set cart='[]'::jsonb,wishlist='[]'::jsonb where role='customer';
commit;
