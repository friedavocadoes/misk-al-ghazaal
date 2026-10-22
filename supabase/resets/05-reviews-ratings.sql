-- Deletes reviews and ratings from BOTH guests and accounts. Does not delete orders.
begin;
delete from public.reviews;
delete from public.product_ratings;
update public.products set rating=0,review_count=0;
commit;
