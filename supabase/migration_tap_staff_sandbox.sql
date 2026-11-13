begin;

alter table public.tap_checkout_attempts add column if not exists sandbox_staff_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.tap_checkout_attempts'::regclass and conname = 'tap_staff_sandbox_isolated') then
    alter table public.tap_checkout_attempts add constraint tap_staff_sandbox_isolated check (
      sandbox_staff_id is null or (not live_mode and order_id is null and coupon_id is null
        and lines = '[]'::jsonb and stock_holds = '[]'::jsonb and sample_lines = '[]'::jsonb)
    );
  end if;
end $$;

create or replace function public.tap_checkout_begin_sandbox(
  p_id uuid, p_key_hash text, p_method text, p_merchant text, p_origin text, p_locale text,
  p_staff uuid, p_amount numeric, p_customer jsonb
) returns public.tap_checkout_attempts language plpgsql security definer set search_path = public, pg_temp as $$
declare attempt tap_checkout_attempts%rowtype;
begin
  if not exists (select 1 from profiles where id = p_staff and role in ('super_admin', 'orders')) then
    raise exception 'Staff access required';
  end if;
  if p_amount is null or p_amount < 0.10 or round(p_amount, 2) <> p_amount then raise exception 'Invalid test amount'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into attempt from tap_checkout_attempts where id = p_id;
  if found then
    if attempt.key_hash <> p_key_hash or attempt.sandbox_staff_id is distinct from p_staff then raise exception 'Invalid payment attempt'; end if;
    return attempt;
  end if;

  insert into tap_checkout_attempts(id, key_hash, method, merchant_id, live_mode, origin, locale, sandbox_staff_id, order_data, lines, context)
  values (p_id, p_key_hash, p_method, p_merchant, false, p_origin, p_locale, p_staff,
    jsonb_build_object('total', p_amount, 'customer_name', p_customer->>'customer_name', 'phone', p_customer->>'phone', 'email', p_customer->>'email'), '[]', '{}')
  returning * into attempt;
  return attempt;
end $$;

create or replace function public.tap_checkout_update_sandbox(p_id uuid, p_charge text, p_state text, p_url text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare attempt tap_checkout_attempts%rowtype;
begin
  select * into strict attempt from tap_checkout_attempts where id = p_id and sandbox_staff_id is not null for update;
  if attempt.charge_id is not null and attempt.charge_id is distinct from p_charge then raise exception 'Tap charge mismatch'; end if;
  if attempt.state = 'pending' then
    if p_state not in ('pending', 'paid', 'failed') or (p_state = 'paid' and p_charge is null) then raise exception 'Invalid Tap state'; end if;
    update tap_checkout_attempts set state = p_state, charge_id = p_charge,
      payment_url = case when p_state = 'pending' then coalesce(p_url, payment_url) end,
      order_data = case when p_state = 'pending' then order_data else jsonb_build_object('total', order_data->'total') end
      where id = p_id returning * into attempt;
  end if;
  return jsonb_build_object('state', attempt.state, 'charge_id', attempt.charge_id);
end $$;

revoke all on function public.tap_checkout_begin_sandbox(uuid,text,text,text,text,text,uuid,numeric,jsonb),
  public.tap_checkout_update_sandbox(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.tap_checkout_begin_sandbox(uuid,text,text,text,text,text,uuid,numeric,jsonb),
  public.tap_checkout_update_sandbox(uuid,text,text,text) to service_role;

commit;
