-- Deletes ALL tracked traffic and surveys. Leaves orders and customers intact.
begin;
delete from public.analytics_sessions; -- events and feedback cascade
commit;
