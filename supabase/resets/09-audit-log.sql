-- Owner-only SQL purge of the append-only audit trail. No app role may do this.
begin;
delete from public.admin_audit_log;
commit;
