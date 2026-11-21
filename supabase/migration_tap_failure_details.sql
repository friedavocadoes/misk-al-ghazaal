begin;
alter table public.tap_checkout_attempts add column if not exists failure_code text;
alter table public.tap_checkout_attempts add column if not exists failure_reason text;
create or replace function public.tap_checkout_record_failure(p_id uuid, p_code text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_reason not in ('method_unavailable','customer_details','declined','provider_error') then
    raise exception 'Invalid payment failure reason';
  end if;
  update tap_checkout_attempts set failure_code = left(p_code,16), failure_reason = p_reason
    where id = p_id and state in ('pending','failed');
end $$;
revoke all on function public.tap_checkout_record_failure(uuid,text,text) from public,anon,authenticated;
grant execute on function public.tap_checkout_record_failure(uuid,text,text) to service_role;
commit;
