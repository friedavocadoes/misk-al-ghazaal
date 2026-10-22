-- Deletes CUSTOMER Auth accounts and their profiles only. Staff roles survive.
-- Orders remain, with user_id NULL; their names/email/address remain until separately erased.
-- Remove any customer-owned Storage objects with the Storage API first if deletion is blocked.
-- Preview exactly who will be deleted before running the transaction below:
select p.id,u.email,p.role from public.profiles p join auth.users u on u.id=p.id where p.role='customer';
begin;
delete from auth.users u using public.profiles p where u.id=p.id and p.role='customer';
commit;
