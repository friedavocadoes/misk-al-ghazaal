begin;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('customer','orders','super_admin','content_editor'));
create table if not exists public.blog_categories(id uuid primary key default gen_random_uuid(),name text not null,slug text unique not null);
insert into public.blog_categories(name,slug) values('The journal','journal') on conflict do nothing;
create table if not exists public.blog_posts(
 id uuid primary key default gen_random_uuid(), category_id uuid not null references public.blog_categories(id),
 title text not null, slug text not null, excerpt text not null default '', content_html text not null default '',
 image text not null default '', mobile_image text not null default '', image_alt text not null default '',
 author text not null default 'Misk Al Ghazaal', published boolean not null default false,
 published_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 meta_title text not null default '', meta_description text not null default '', unique(category_id,slug));
insert into public.blog_posts(category_id,title,slug,excerpt,content_html,image,author,published,published_at)
select c.id,a.title,a.slug,a.excerpt,a.content_html,a.image,coalesce(a.author,'Misk Al Ghazaal'),true,a.date::timestamptz from public.articles a cross join public.blog_categories c where c.slug='journal' on conflict do nothing;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
drop policy if exists "read blog categories" on public.blog_categories;
create policy "read blog categories" on public.blog_categories for select using(true);
drop policy if exists "read published blogs" on public.blog_posts;
create policy "read published blogs" on public.blog_posts for select using(published and published_at<=now());
drop policy if exists "manage blog categories" on public.blog_categories;
create policy "manage blog categories" on public.blog_categories for all to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role in ('super_admin','content_editor'))) with check(exists(select 1 from public.profiles where id=auth.uid() and role in ('super_admin','content_editor')));
drop policy if exists "manage blogs" on public.blog_posts;
create policy "manage blogs" on public.blog_posts for all to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role in ('super_admin','content_editor'))) with check(exists(select 1 from public.profiles where id=auth.uid() and role in ('super_admin','content_editor')));
drop policy if exists "content editor seo" on public.page_seo;
create policy "content editor seo" on public.page_seo for all to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='content_editor')) with check(exists(select 1 from public.profiles where id=auth.uid() and role='content_editor'));
insert into storage.buckets(id,name,public,allowed_mime_types,file_size_limit) values('blogs','blogs',true,array['image/webp'],10485760) on conflict do nothing;
drop policy if exists "public blog images" on storage.objects;
create policy "public blog images" on storage.objects for select using(bucket_id='blogs');
drop policy if exists "edit blog images" on storage.objects;
create policy "edit blog images" on storage.objects for all to authenticated using(bucket_id='blogs' and exists(select 1 from public.profiles where id=auth.uid() and role in ('super_admin','content_editor'))) with check(bucket_id='blogs' and exists(select 1 from public.profiles where id=auth.uid() and role in ('super_admin','content_editor')));
create table if not exists public.blog_redirects(path text primary key, post_id uuid not null references public.blog_posts(id) on delete cascade);
alter table public.blog_redirects enable row level security;
drop policy if exists "read blog redirects" on public.blog_redirects;
create policy "read blog redirects" on public.blog_redirects for select using(true);
create or replace function public.remember_blog_url() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.slug<>new.slug or old.category_id<>new.category_id then
 insert into public.blog_redirects(path,post_id) select '/posts/'||slug||'/'||old.slug,old.id from public.blog_categories where id=old.category_id on conflict(path) do update set post_id=excluded.post_id;
 end if;
 return new;
end $$;
drop trigger if exists remember_blog_url on public.blog_posts;
create trigger remember_blog_url before update on public.blog_posts for each row execute function public.remember_blog_url();
drop policy if exists "content editor audit" on public.admin_audit_log;
create policy "content editor audit" on public.admin_audit_log for insert to authenticated with check(user_id=auth.uid() and category='seo' and exists(select 1 from public.profiles where id=auth.uid() and role='content_editor'));
update public.blog_posts p set meta_title=coalesce(s.meta_title,''),meta_description=coalesce(s.meta_description,'') from public.page_seo s where s.page_type='article' and s.slug=p.slug and p.meta_title='' and p.meta_description='';
create index if not exists blog_posts_published_idx on public.blog_posts(published_at desc) where published;
create index if not exists blog_posts_category_idx on public.blog_posts(category_id);
commit;
