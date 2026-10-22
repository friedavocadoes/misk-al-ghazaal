-- Deletes ALL coupon codes, redemptions and referral records. Settings stay intact.
begin;
delete from public.referrals;
delete from public.coupons;
update public.profiles set referral_uses=0,referred_by=null;
commit;
