-- Migration: admin audit log — append-only trail of every console action.
--
-- Every admin mutation writes one row here (who / what / when / details).
-- Rows are IMMUTABLE by design: there are deliberately NO update or delete
-- RLS policies, so no app code, admin role, or API key can alter history.
-- Only the project owner clears it directly in the dashboard SQL editor
-- (service role bypasses RLS).
--
-- Categories mirror the admin console: products | orders | banners |
-- coupons | referrals | reviews | countries | homepage | lineups | notes |
-- rituals | users | bin | seo | auth.
--
-- Safe to re-run.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text not null default '',
  user_role text not null default '',
  category text not null,
  action text not null,
  entity text not null default '',
  entity_id text not null default '',
  entity_label text not null default '',
  summary text not null default '',
  details jsonb not null default '{}'
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_user_idx
  on public.admin_audit_log (user_id);

create index if not exists admin_audit_log_category_idx
  on public.admin_audit_log (category);

create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log (entity, entity_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "staff insert audit log" on public.admin_audit_log;
create policy "staff insert audit log" on public.admin_audit_log
  for insert with check (public.is_staff(auth.uid()));

drop policy if exists "staff read audit log" on public.admin_audit_log;
create policy "staff read audit log" on public.admin_audit_log
  for select using (public.is_staff(auth.uid()));
