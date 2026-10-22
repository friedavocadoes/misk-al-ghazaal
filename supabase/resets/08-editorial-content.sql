-- Deletes ALL banners, homepage sections, blogs/categories, legacy articles and SEO overrides.
-- Uploaded image/video objects remain in Storage; use the Storage API to remove files.
begin;
delete from public.banners;
delete from public.homepage_sections;
delete from public.blog_posts;
delete from public.blog_categories;
delete from public.articles;
delete from public.page_seo;
delete from public.promo_campaigns;
commit;
