-- Deletes ALL tracked traffic and surveys. Leaves orders and customers intact.
begin;
delete from public.analytics_sessions; -- events and feedback cascade
-- Refresh derived demand after this owner-run reset, when installed.
do $$ begin
 if to_regprocedure('public.refresh_product_demand(boolean)') is not null then
  perform public.refresh_product_demand(true);
 end if;
end $$;

commit;
