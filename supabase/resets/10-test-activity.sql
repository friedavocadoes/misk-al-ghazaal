-- Combined pre-launch reset: ALL analytics, orders, customer accounts, reviews,
-- ratings, coupons, referrals and saved customer bags/wishlists.
-- Preserves staff accounts, catalog, content, tiers/settings and uploaded files.
-- Does NOT reset product/sample inventory or delete invoices/avatars from Storage.
begin;
delete from public.analytics_sessions;
delete from public.orders;
delete from public.reviews;
delete from public.product_ratings;
delete from public.referrals;
delete from public.coupons;
update public.products set rating=0,review_count=0,sales_count=0;
update public.profiles set cart='[]'::jsonb,wishlist='[]'::jsonb,referral_uses=0,referred_by=null where role='customer';
delete from auth.users u using public.profiles p where u.id=p.id and p.role='customer';
-- Refresh derived demand after this owner-run reset, when installed.
do $$ begin
 if to_regprocedure('public.refresh_product_demand(boolean)') is not null then
  perform public.refresh_product_demand(true);
 end if;
end $$;

commit;
