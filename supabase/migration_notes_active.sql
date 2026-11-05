-- Run once before using the notes library's Enable/Disable actions.
alter table public.notes add column if not exists is_active boolean not null default true;
comment on column public.notes.is_active is 'Disabled notes retain assignments but are hidden from the storefront.';
