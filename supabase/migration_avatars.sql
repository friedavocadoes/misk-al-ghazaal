-- ============================================================================
-- Migration: shopper avatars (+ used by /account + navbar).
-- Run once in Supabase Dashboard → SQL Editor.
-- Files live at avatars/<user_id>/<timestamp>.<ext>; each shopper writes
-- only their own folder. profiles.avatar_url is the source of truth;
-- auth user_metadata mirrors it so the navbar updates instantly.
-- ============================================================================

alter table public.profiles add column if not exists avatar_url text default '';

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users replace own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
