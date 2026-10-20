-- Ratings publish immediately; review text retains its separate moderation gate.
create table public.product_ratings (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 user_id uuid references public.profiles(id) on delete cascade,
 guest_id uuid,
 browser_id uuid,
 rating integer not null check (rating between 1 and 5),
 created_at timestamptz not null default now(),
 check ((user_id is null) <> (guest_id is null)),
 unique(product_id,user_id), unique(product_id,guest_id)
);
alter table public.product_ratings enable row level security;
create policy own_rating_read on public.product_ratings for select to authenticated using(user_id=auth.uid());
insert into public.product_ratings(product_id,user_id,rating) select product_id,user_id,rating from public.reviews on conflict do nothing;
create function public.refresh_product_rating() returns trigger language plpgsql set search_path=public as $$
declare pid uuid := coalesce(new.product_id,old.product_id);
begin
 perform id from products where id=pid for update;
 update products set rating=coalesce((select round(avg(rating),2) from product_ratings where product_id=pid),0),review_count=(select count(*) from product_ratings where product_id=pid) where id=pid;
 return coalesce(new,old);
end $$;
create trigger rating_totals after insert or update or delete on public.product_ratings for each row execute function public.refresh_product_rating();
update products p set rating=coalesce((select round(avg(r.rating),2) from product_ratings r where r.product_id=p.id),0), review_count=(select count(*) from product_ratings r where r.product_id=p.id);
-- Merge all browser ratings on login; the account's existing vote always wins.
create function public.claim_browser_ratings(gid uuid, uid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtext(gid::text));
 insert into product_ratings(product_id,user_id,browser_id,rating,created_at) select product_id,uid,gid,rating,created_at from product_ratings where guest_id=gid on conflict(product_id,user_id) do nothing;
 update product_ratings set browser_id=gid where user_id=uid and product_id in(select product_id from product_ratings where guest_id=gid);
 delete from product_ratings where guest_id=gid;
end $$;
revoke all on function public.claim_browser_ratings(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_browser_ratings(uuid,uuid) to service_role;
