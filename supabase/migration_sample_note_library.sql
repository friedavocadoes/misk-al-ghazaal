begin;
create table if not exists public.sample_notes(sample_id uuid not null references public.samples(id) on delete cascade,note_id uuid not null references public.notes(id) on delete cascade,primary key(sample_id,note_id));
alter table public.sample_notes enable row level security;
drop policy if exists "read sample notes" on public.sample_notes;
create policy "read sample notes" on public.sample_notes for select using(true);
drop policy if exists "manage sample notes" on public.sample_notes;
create policy "manage sample notes" on public.sample_notes for all to authenticated using(public.is_super_admin(auth.uid())) with check(public.is_super_admin(auth.uid()));
create or replace function public.set_sample_notes(sid uuid,nids uuid[]) returns void language plpgsql set search_path=public as $$
begin
 if not public.is_super_admin(auth.uid()) then raise exception 'Unauthorized'; end if;
 insert into sample_notes(sample_id,note_id) select sid,unnest(nids) on conflict do nothing;
 delete from sample_notes where sample_id=sid and not(note_id=any(nids));
end $$;
-- Carry forward exact library-name matches from old free-text lists.
insert into sample_notes(sample_id,note_id) select distinct s.id,n.id from samples s cross join lateral regexp_split_to_table(s.notes,'[,·;]') token join notes n on lower(trim(token))=lower(n.name) on conflict do nothing;
commit;
