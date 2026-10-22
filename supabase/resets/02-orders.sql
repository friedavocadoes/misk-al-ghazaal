-- Deletes ALL orders, including recycle-bin orders, items/history/redemptions/prompts.
-- Does not restock products or samples and does not delete invoice Storage files.
begin;
delete from public.orders;
update public.coupons c set used_count=(select count(*) from public.coupon_redemptions r where r.coupon_id=c.id);
update public.products set sales_count=0;
-- Referral records no longer backed by an order should not retain test rewards.
delete from public.referrals where order_id is null;
-- Refresh derived demand after this owner-run reset, when installed.
do $$ begin
 if to_regprocedure('public.refresh_product_demand(boolean)') is not null then
  perform public.refresh_product_demand(true);
 end if;
end $$;

commit;
