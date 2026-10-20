# Blogs setup

1. Run `supabase/migration_blogs.sql` in the existing project's Supabase SQL editor after the other migrations. It imports legacy articles and creates the blog tables, permissions, redirects and image bucket.
2. Set `NEXT_PUBLIC_SITE_URL` to the production origin (including https, no path). Redeploy after environment changes. This drives canonical URLs, social metadata and the sitemap.
3. Open Admin → Workspace → Blogs. Expand Categories to create a category, then choose New blog. Titles generate editable URL slugs. Save unpublished work as a draft; check Publish when ready.
4. Upload a desktop cover at **1600 × 800 px**. Reuse it on mobile or enable a separate **900 × 1100 px** cover. Uploads convert to WebP. Add descriptive alt text.
5. Paste formatted Word/Google Docs content into the editor. Supported headings, emphasis, lists, links, tables, text alignment and text styling survive; document pagination and embedded local clipboard images do not. Upload inline images separately. Use H2/H3 for the automatic table of contents.
6. Set meta title and description in the blog editor. Empty values fall back to title/excerpt. Slug/category changes retain permanent redirects from old paths.
7. As a superadmin, open Workspace → Users and assign **Blogs & SEO editor** to a registered user. That role can manage blogs and edit page/product SEO, but cannot manage products, prices, customers or orders. Analytics can be added to the workspace later.

The storefront listing is `/posts`; articles use `/posts/<category>/<slug>`. The global link is in the footer. Only published blogs appear in listings and the sitemap. Draft previews are currently available through the editor only.

Validation before launch: publish a test draft, check its public desktop/mobile covers and metadata, change its slug and verify the redirect, then test editor permissions with a separate browser session. These database-backed checks require the migration; development smoke checks did not publish or modify real content.
