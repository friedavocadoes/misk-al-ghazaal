begin;

alter table public.orders add column if not exists tap_charge_id text unique;

create table if not exists public.tap_checkout_attempts (
  id uuid primary key,
  key_hash text not null,
  method text not null check (method in ('card','apple_pay','tabby','tamara')),
  merchant_id text not null,
  live_mode boolean not null,
  origin text not null,
  locale text not null check (locale in ('en','ar')),
  state text not null default 'pending' check (state in ('pending','paid','failed')),
  charge_id text unique,
  payment_url text,
  order_id uuid references public.orders(id) on delete set null,
  coupon_id uuid references public.coupons(id) on delete set null,
  order_data jsonb not null,
  lines jsonb not null,
  stock_holds jsonb not null default '[]',
  sample_lines jsonb not null default '[]',
  context jsonb not null,
  created_at timestamptz not null default now(),
  next_check_at timestamptz not null default now() + interval '1 minute'
);
alter table public.tap_checkout_attempts enable row level security;
revoke all on public.tap_checkout_attempts from public, anon, authenticated;
grant select on public.tap_checkout_attempts to service_role;
create index if not exists tap_checkout_due on public.tap_checkout_attempts(next_check_at) where state = 'pending';
create index if not exists tap_checkout_coupons on public.tap_checkout_attempts(coupon_id) where state = 'pending';

-- Stock is removed from availability while a charge is open. The same locks
-- cover COD so a shopper cannot buy stock held by another checkout.
create or replace function public.storefront_checkout_hold_stock(p_lines jsonb)
returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare
  line record;
  product products%rowtype;
  variant variants%rowtype;
  holds jsonb := '[]';
begin
  perform id from products where slug in (select x->>'slug' from jsonb_array_elements(p_lines) x) order by id for no key update;
  perform id from variants where id in (select (x->>'variantId')::uuid from jsonb_array_elements(p_lines) x) order by id for update;
  for line in select * from jsonb_to_recordset(p_lines) as x(slug text, "variantId" uuid, qty integer, unit numeric)
  loop
    if line.slug = 'gift' and line.unit = 0 then continue; end if;
    select * into product from products where slug = line.slug and deleted_at is null;
    if not found or product.is_active is false or product.out_of_stock is true then
      raise exception 'Out of stock. Please review your bag.';
    end if;
    if line."variantId" is null then
      if exists (select 1 from variants where product_id = product.id) then raise exception 'Invalid product option.'; end if;
      if product.price <> line.unit then raise exception 'checkout:price'; end if;
      continue;
    end if;
    select * into variant from variants where id = line."variantId" and product_id = product.id;
    if not found or variant.is_active is false or variant.stock < line.qty then
      raise exception 'Out of stock. Please review your bag.';
    end if;
    if variant.price <> line.unit then raise exception 'checkout:price'; end if;
    if variant.stock is not null then
      update variants set stock = stock - line.qty where id = variant.id;
      holds := holds || jsonb_build_array(jsonb_build_object('id', variant.id, 'qty', line.qty));
    end if;
  end loop;
  return holds;
end $$;

create or replace function public.storefront_checkout_coupon(p_code text, p_user uuid, p_charge text default null, p_order uuid default null)
returns uuid language plpgsql set search_path = public, pg_temp as $$
declare
  coupon coupons%rowtype;
  held_coupon uuid;
  uses bigint;
begin
  if coalesce(p_code, '') = '' then return null; end if;
  -- Honor the held amount even if the coupon was edited or deleted during payment.
  if p_charge is not null then
    select a.coupon_id into held_coupon from tap_checkout_attempts a
      where a.charge_id = p_charge and a.state = 'pending' and a.order_data->>'coupon_code' = p_code;
    if found then return held_coupon; end if;
  end if;
  if p_user is not null then perform pg_advisory_xact_lock(hashtextextended('checkout-coupon-user:' || p_user::text, 0)); end if;
  select * into coupon from coupons where code = p_code for update;
  if not found or p_user is null then raise exception 'coupon:invalid'; end if;
  if coupon.owner_id is not null and coupon.owner_id <> p_user then raise exception 'coupon:personal'; end if;
  if coupon.first_order_only and (
    exists (select 1 from orders where user_id = p_user and id is distinct from p_order)
    or exists (select 1 from tap_checkout_attempts a join coupons c on c.id = a.coupon_id
      where a.state = 'pending' and c.first_order_only and (a.order_data->>'user_id')::uuid = p_user)
  ) then raise exception 'coupon:repeat'; end if;
  if coupon.usage_limit is not null then
    select count(*) into uses from coupon_redemptions where coupon_id = coupon.id and user_id = p_user;
    uses := uses + (select count(*) from tap_checkout_attempts a where a.coupon_id = coupon.id and a.state = 'pending'
      and (a.order_data->>'user_id')::uuid = p_user);
    if uses >= coupon.usage_limit then raise exception 'coupon:exhausted'; end if;
  end if;
  return coupon.id;
end $$;

create or replace function public.reserve_order_coupon()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare cid uuid;
begin
  cid := storefront_checkout_coupon(new.coupon_code, new.user_id, new.tap_charge_id, new.id);
  if cid is not null then
    insert into coupon_redemptions(coupon_id, order_id, user_id) values(cid, new.id, new.user_id);
    update coupons set used_count = used_count + 1 where id = cid;
  end if;
  return new;
end $$;

create or replace function public.storefront_checkout_referral(p_order jsonb)
returns void language plpgsql set search_path = public, pg_temp as $$
declare
  buyer uuid := (p_order->>'user_id')::uuid;
  buyer_email text := lower(nullif(p_order->>'email',''));
begin
  if coalesce(p_order->>'referral_code','') = '' or buyer_email is null then return; end if;
  if buyer is not null then perform pg_advisory_xact_lock(hashtextextended('checkout-referral-user:' || buyer::text, 0)); end if;
  perform pg_advisory_xact_lock(hashtextextended('checkout-referral-email:' || buyer_email, 0));
  if exists (select 1 from orders where (buyer is not null and user_id = buyer)
       or (lower(email) = buyer_email and status not in ('cancelled','returned') and deleted_at is null))
     or exists (select 1 from tap_checkout_attempts a where a.state = 'pending' and a.order_data->>'referral_code' <> ''
       and ((buyer is not null and (a.order_data->>'user_id')::uuid = buyer) or lower(a.order_data->>'email') = buyer_email)) then
    raise exception 'referral:repeat';
  end if;
end $$;

create or replace function public.storefront_checkout_commit(p_order jsonb, p_lines jsonb, p_samples jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  draft orders := jsonb_populate_record(null::orders, p_order);
  oid uuid;
  ono text;
begin
  if p_samples is null then
    perform storefront_checkout_referral(p_order);
    perform storefront_checkout_hold_stock(p_lines);
  elsif draft.user_id is not null then
    perform id from profiles where id = draft.user_id for key share;
    if not found then draft.user_id := null; end if;
  end if;
  -- Serialize inventory and lifetime sales with the same lock order as reservations.
  perform id from products where slug in (select x->>'slug' from jsonb_array_elements(p_lines) x) order by id for no key update;
  insert into orders (
    order_no, customer_name, phone, email, address, city, emirate, notes, subtotal, shipping, discount, total,
    coupon_code, referral_code, user_id, country_code, state_name, postcode, address_label, delivery_lat, delivery_lng,
    whatsapp_opt_in, checkout_terms_version, payment_method, payment_status, tap_charge_id, sample_ids
  ) values (
    '', draft.customer_name, draft.phone, draft.email, draft.address, draft.city, draft.emirate, draft.notes,
    draft.subtotal, draft.shipping, draft.discount, draft.total, draft.coupon_code, draft.referral_code, draft.user_id,
    draft.country_code, draft.state_name, draft.postcode, draft.address_label, draft.delivery_lat, draft.delivery_lng,
    coalesce(draft.whatsapp_opt_in,false), draft.checkout_terms_version, draft.payment_method, coalesce(draft.payment_status,'pending'),
    draft.tap_charge_id, case when p_samples is null then coalesce(draft.sample_ids,'{}') else '{}' end
  ) returning id, order_no into oid, ono;

  if p_samples is not null then
    -- Samples were reserved before leaving for Tap. Record the snapshot without
    -- running the insert trigger a second time.
    update orders set sample_ids = coalesce(draft.sample_ids,'{}') where id = oid;
  end if;
  insert into order_items(order_id, product_slug, variant_id, title, qty, unit_price)
    select oid, slug, "variantId", title, qty, unit
    from jsonb_to_recordset(p_lines || coalesce(p_samples,'[]')) as x(slug text, "variantId" uuid, title text, qty integer, unit numeric);
  insert into order_status_history(order_id, to_status) values(oid, 'new');
  update products p set sales_count = coalesce(p.sales_count,0) + sold.qty
    from (select x->>'slug' as slug, sum((x->>'qty')::int) as qty from jsonb_array_elements(p_lines) x group by 1) sold
    where p.slug = sold.slug and sold.slug <> 'gift';
  return jsonb_build_object('id', oid, 'order_no', ono);
end $$;

create or replace function public.tap_checkout_begin(
  p_id uuid, p_key_hash text, p_method text, p_merchant text, p_live boolean, p_origin text, p_locale text,
  p_order jsonb, p_lines jsonb, p_context jsonb
) returns public.tap_checkout_attempts language plpgsql security definer set search_path = public, pg_temp as $$
declare
  attempt tap_checkout_attempts%rowtype;
  holds jsonb;
  sample_ids uuid[] := array(select jsonb_array_elements_text(coalesce(p_order->'sample_ids','[]'))::uuid);
  samples_snapshot jsonb := '[]';
  sample_id uuid;
  sample_name text;
  cid uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into attempt from tap_checkout_attempts where id = p_id;
  if found then
    if attempt.key_hash <> p_key_hash then raise exception 'Invalid payment attempt.'; end if;
    return attempt;
  end if;

  perform storefront_checkout_referral(p_order);
  holds := storefront_checkout_hold_stock(p_lines);
  cid := storefront_checkout_coupon(p_order->>'coupon_code', (p_order->>'user_id')::uuid);
  if cardinality(sample_ids) > 0 then
    if cardinality(sample_ids) > (select coalesce(max(allowance),0) from sample_tiers where min_subtotal <= (p_order->>'subtotal')::numeric)
       or cardinality(sample_ids) <> (select count(distinct s) from unnest(sample_ids) s) then
      raise exception 'Invalid sample allowance. Please review your selections.';
    end if;
    for sample_id in select unnest(sample_ids) order by 1 loop
      update samples set stock = stock - 1 where id = sample_id and active and stock > 0 returning name into sample_name;
      if not found then raise exception 'A selected sample is unavailable. Please choose another.'; end if;
      samples_snapshot := samples_snapshot || jsonb_build_array(jsonb_build_object('id', sample_id, 'slug', 'sample', 'title', 'Sample — ' || sample_name, 'qty', 1, 'unit', 0));
    end loop;
  end if;
  insert into tap_checkout_attempts(id,key_hash,method,merchant_id,live_mode,origin,locale,order_data,lines,stock_holds,sample_lines,coupon_id,context)
    values(p_id,p_key_hash,p_method,p_merchant,p_live,p_origin,p_locale,p_order,p_lines,holds,samples_snapshot,cid,p_context)
    returning * into attempt;
  return attempt;
end $$;

create or replace function public.tap_checkout_update(p_id uuid, p_charge text, p_state text, p_url text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  attempt tap_checkout_attempts%rowtype;
  saved jsonb;
  hold record;
begin
  select * into strict attempt from tap_checkout_attempts where id = p_id for update;
  if attempt.charge_id is not null and attempt.charge_id is distinct from p_charge then raise exception 'Tap charge mismatch'; end if;
  if attempt.state <> 'pending' then
    return jsonb_build_object('state', attempt.state, 'order_id', attempt.order_id, 'created', false);
  end if;

  if p_state = 'pending' then
    update tap_checkout_attempts set charge_id = p_charge, payment_url = coalesce(p_url, payment_url) where id = p_id;
    return jsonb_build_object('state', 'pending', 'created', false);
  end if;
  if p_state = 'paid' and p_charge is not null then
    update tap_checkout_attempts set charge_id = p_charge where id = p_id;
    saved := storefront_checkout_commit(attempt.order_data || jsonb_build_object('tap_charge_id', p_charge, 'payment_status', 'paid'), attempt.lines, attempt.sample_lines);
  elsif p_state = 'failed' then
    for hold in select id, sum(qty) as qty from jsonb_to_recordset(attempt.stock_holds) as x(id uuid, qty integer) group by id order by id loop
      update variants set stock = stock + hold.qty where id = hold.id and stock is not null;
    end loop;
    for hold in select id from jsonb_to_recordset(attempt.sample_lines) as x(id uuid) order by id loop
      update samples set stock = stock + 1 where id = hold.id;
    end loop;
  else
    raise exception 'Invalid Tap state';
  end if;

  update tap_checkout_attempts set state = p_state, charge_id = p_charge, order_id = (saved->>'id')::uuid,
    coupon_id = null, payment_url = null, order_data = '{}', lines = '[]', stock_holds = '[]', sample_lines = '[]', context = '{}'
    where id = p_id;
  return jsonb_build_object('state', p_state, 'order_id', saved->>'id', 'created', saved is not null);
end $$;

create or replace function public.tap_checkout_due(p_merchant text, p_live boolean, p_origin text)
returns setof public.tap_checkout_attempts language sql security definer set search_path = public, pg_temp as $$
  update tap_checkout_attempts set next_check_at = now() + interval '2 minutes'
  where id in (
    select id from tap_checkout_attempts where state = 'pending' and next_check_at <= now()
      and merchant_id = p_merchant and live_mode = p_live and origin = p_origin
      and (charge_id is not null or created_at > now() - interval '23 hours')
    order by next_check_at limit 5 for update skip locked
  ) returning *;
$$;

revoke all on function public.storefront_checkout_hold_stock(jsonb), public.storefront_checkout_coupon(text,uuid,text,uuid), public.storefront_checkout_referral(jsonb),
  public.storefront_checkout_commit(jsonb,jsonb,jsonb), public.tap_checkout_begin(uuid,text,text,text,boolean,text,text,jsonb,jsonb,jsonb),
  public.tap_checkout_update(uuid,text,text,text), public.tap_checkout_due(text,boolean,text) from public, anon, authenticated;
grant execute on function public.storefront_checkout_commit(jsonb,jsonb,jsonb),
  public.tap_checkout_begin(uuid,text,text,text,boolean,text,text,jsonb,jsonb,jsonb), public.tap_checkout_update(uuid,text,text,text),
  public.tap_checkout_due(text,boolean,text) to service_role;

commit;
