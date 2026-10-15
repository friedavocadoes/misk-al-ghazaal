-- ============================================================================
-- Migration: invoices (system PDF + admin-uploaded override).
-- Run once in Supabase Dashboard → SQL Editor.
-- orders.invoice_source: 'auto' (system PDF, default) or 'upload'
-- (admin-provided PDF/image, served when present).
-- The `invoices` bucket is PRIVATE (invoices carry PII) — NO public
-- read policy; shoppers/staff fetch through GET /api/orders/[id]/invoice
-- which enforces ownership. Staff write via the console uploader.
-- ============================================================================

alter table public.orders
  add column if not exists invoice_source text not null default 'auto'
    check (invoice_source in ('auto', 'upload')),
  add column if not exists invoice_file_path text;

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

drop policy if exists "staff write invoices bucket" on storage.objects;
create policy "staff write invoices bucket" on storage.objects
  for insert with check (
    bucket_id = 'invoices' and public.is_staff(auth.uid())
  );

drop policy if exists "staff update invoices bucket" on storage.objects;
create policy "staff update invoices bucket" on storage.objects
  for update using (
    bucket_id = 'invoices' and public.is_staff(auth.uid())
  );

drop policy if exists "staff delete invoices bucket" on storage.objects;
create policy "staff delete invoices bucket" on storage.objects
  for delete using (
    bucket_id = 'invoices' and public.is_staff(auth.uid())
  );
