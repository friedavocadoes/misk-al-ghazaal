# Supabase setup — Misk Al Ghazaal backend (Phase 2)

REQUIRED — Supabase is the only data source (mock-data deleted). Storefront
getters throw without env; `/admin/*` shows a setup hint.

## 1. Create the project

1. https://supabase.com/dashboard → New project → name `misk-al-ghazaal`, region closest to UAE (e.g. `eu-central-1` / `ap-south-1` — pick lowest latency).
2. Wait for provisioning (~2 min).

## 2. Run the schema

Dashboard → SQL Editor → New query, paste in order:

1. `supabase/schema.sql` (tables + RLS + storage buckets + policies)
2. `supabase/migration_soft_delete.sql` (recycle bin)
3. `supabase/migration_shopper_reads.sql` (shoppers read own orders/items)
4. `supabase/migration_avatars.sql` (`avatars` bucket + `profiles.avatar_url`;
   shoppers upload into their own `avatars/<user_id>/` folder)
5. `supabase/migration_delivery_cart.sql` (`delivery_countries` + seed,
   order delivery columns, `profiles.cart`)
6. `supabase/migration_product_active.sql` (`products.is_active` pause flag)
7. `supabase/migration_ranking_homepage.sql` (`sort` + `sales_count`,
   `homepage_sections` + seed mirroring the current home)
4. `supabase/migration_product_experience.sql` (lineups, notes, rituals,
   coupons, referrals, reviews, PDP copy, order links — includes
   `increment_coupon_use()` + a starter notes library)
5. `supabase/migration_coupons_v2.sql` (max discount cap + once-per-account)
6. `supabase/migration_referrals_v2.sql` (split percents + caps per side)
7. `supabase/migration_page_seo.sql` (invisible SEO layer per page)
8. `supabase/migration_audit_log.sql` (append-only admin audit trail)
9. `supabase/migration_emails_promo.sql` (promo opt-in, hello template, campaigns)
10. `supabase/migration_orders_lock.sql` (STRICT order isolation: user_id-only
    shopper RLS + `expected_delivery_date` + shopper contact profile —
    run even on existing DBs; guest orders are auto-claimed at next login)
11. `supabase/migration_email_prefs.sql` (`profiles.order_updates_opt_in`,
    default ON — gates noreply confirmation + status mails per account)
12. `supabase/migration_invoices.sql` (private `invoices` bucket + order
    invoice source/file columns; invoices served via
    `/api/orders/[id]/invoice`, never public URLs)
2. `supabase/seed.sql` (FULL catalog: 11 collections, 47 products + variants,
   106 collection links incl. for-him/for-her/ramadan, 9 banners, 3 articles.
   Safe to re-run — upserts on slug, wipes + re-inserts variants/links/banners.)

Verify: Table Editor shows `profiles, products, variants, collections,
banners, articles, orders, order_items, order_status_history`. Storage shows
public buckets `products`, `banners`.

## 3. Env variables

```bash
cp .env.example .env
```

Fill from Dashboard → Settings → API Keys → "Publishable and secret API keys"
tab (create them first on older projects — legacy `anon`/`service_role` keep
working alongside until you deactivate them):

| Variable | Where | Used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | browser + server reads |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key (`sb_publishable_…`) | browser + server (RLS enforced) |
| `SUPABASE_SECRET_KEY` | secret key (`sb_secret_…`, SECRET) | `/api/checkout`, stock RPC only. Never `NEXT_PUBLIC_`, never commit. |

Without these, storefront getters throw and `next build` fails — by design
(fail loudly, never serve stale mock data). `/admin/*` shows a setup hint.

## 4. Create users (no public signup)

1. Authentication → Add user → Create new user (email + password, auto-confirm).
   Shopper signups always land on role `customer` (zero admin access).
2. Promote staff explicitly (shoppers can never reach /admin):
   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@company.com';
   update public.profiles set role = 'orders' where email = 'staff@company.com';
   ```
   After running `migration_roles_tracking.sql`, every pre-existing `orders`
   row was reset to `customer` — re-run the promote SQL for real staff.
3. Login at `/admin/login`. `orders` role is auto-redirected away from
   catalog pages. Shoppers who open `/admin/login` are signed straight back
   out with an explanation. One Supabase project = one browser session:
   test admin + shopper side-by-side with a separate browser profile
   (or incognito) — simultaneous separate logins in one profile are not
   possible by design.

## 5. Images (products + banners)

No extra service — Supabase Storage buckets `products` / `banners` (public
read, super_admin write via RLS).

- Admin: open a product → Images → Upload (3MB max, `<slug>-<timestamp>.webp`).
  First image = primary. Public URL is saved into `products.images[]`.
- Banners: Storage → `banners` → Upload, copy public URL into table `banners.src`.
- Code: `next.config.ts` already allows `**.supabase.co` in `next/image`.
  Local `/products/*` files keep working as fallback.

## 6. Checkout → orders flow

- Storefront posts COD orders to `POST /api/checkout` (validates against live
  prices, writes `orders + order_items + history`, decrements stock).
- Staff monitors `/admin/orders` (filter by status), opens detail, confirms via
  WhatsApp button (`wa.me`, zero API cost), prints slip, updates status +
  tracking no + internal note. Every change is logged to `order_status_history`.
- Realtime: add a `supabase.channel('orders').on('postgres_changes', …)` listener
  on the orders page later for a new-order toast — no extra service needed.

## 6b. Domain emails (cPanel, one login per address)

Run `supabase/migration_emails_promo.sql` once (adds `profiles.promo_opt_in`,
`hello_mail_settings`, `promo_campaigns`, `promo` bucket).

| Address | Sends | Via |
|---|---|---|
| `hello@` | Welcome mail on account creation (copy + 2–3 products edited at `/admin/emails/hello`) | `HELLO_SMTP_*` |
| `noreply@` | Order confirmation + every admin status change | `NOREPLY_SMTP_*` |
| `promo@` | Newsletters/offers, composed at `/admin/promo` (Write/HTML tabs, phone+PC preview, artwork uploads to `promo` bucket) — only to promo-opted-in shoppers | `PROMO_SMTP_*` |
| `orders@` | Shopper order-issue forms (`/account/orders` cards + order page) forwarded to support | `ORDERS_SMTP_*` |
| `support@` | Human inbox — mailto links (contact, account, footer, every mail footer). No SMTP needed. | — |

Shared cPanel connection: `SMTP_HOST=miskalghazaalperfumes.com`, `SMTP_PORT=465`, `SMTP_SECURE=1`. Each mailbox keeps its own login/password; its FROM address defaults to that login.
All application mailboxes now share `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE`. Only `<PREFIX>_SMTP_USER`, `<PREFIX>_SMTP_PASS`, and optional `<PREFIX>_SMTP_FROM` vary by mailbox. See `.env.example` and [System emails](SYSTEM_EMAILS.md) for compact configuration and every design/template call site. Hosted Supabase Auth recovery/verification mail has its own dashboard SMTP/template configuration.


## 6c. Shopper auth (email + Google) + referrals

To show the brand name/logo on Google sign-in and optionally replace the visible Supabase callback domain, see [Google sign-in branding](GOOGLE_LOGIN_BRANDING.md). These are Google Auth Platform/Supabase custom-domain settings, separate from the storefront logo and Site URL.

1. Dashboard → Authentication → Providers → enable **Email** (confirm email ON
   for production) and **Google**: create the OAuth client (Google Cloud
   Console → Credentials), paste Client ID + Secret, and add the redirect URL
   `https://<project>.supabase.co/auth/v1/callback` exactly as shown.
2. Authentication → URL Configuration → Site URL = your production
    storefront origin (e.g. `https://miskalghazaalperfumes.com`), and add
    EVERY origin the shop can be reached at to Redirect URLs — at minimum:
    - `https://<your-domain>/auth/callback` (Google OAuth landing)
    - `https://<your-domain>/**` (covers `/account/reset` recovery links)
    - `http://localhost:3000/**` (local dev)
    Include apex + `www` + any preview domains you log in from. Supabase
    ignores `redirectTo` for origins missing here and falls back to the
    Site URL — that fallback is what bounces production Google logins to
    `localhost:3000`. (The app always sends the page's own origin from the
    browser, so no env value can hijack it — but the origins below must
    still be allowlisted or Supabase falls back regardless.) The app's
    `/auth/callback` finishes the flow and bootstraps
    `profiles` (unique referral code + `?ref=` attribution).
3. Email sending (reset links, confirmations): Supabase's built-in mailer
   works out of the box for testing but is heavily rate-limited. For
   production, set up custom SMTP — Dashboard → Authentication → Email →
   Enable Custom SMTP (use Resend / Amazon SES / your host; needs host,
   port, user, pass + sender address/name). No code changes needed; the
   forgot-password flow (`/account/forgot` → email link → `/account/reset`)
   picks it up automatically.
4. Referral reward % and on/off live at `/admin/referrals` (default 25% both
   sides, first orders only). Reward coupons for referrers are minted with
   `owner_id` — visible only to that account.
5. Reviews: shoppers file from the PDP (login required); nothing is public
   until approved at `/admin/reviews` (approval recomputes the product
   rating/count shown on cards and the PDP).

## 7. Analytics (super_admin)

Build from SQL views next (revenue/day, orders by status, top products,
low stock) — no Mixpanel/GA required at this volume.

## Troubleshooting

- `/admin/login` loops back → user has no `profiles` row or role is null.
  Check Table Editor → `profiles`, re-run the promote SQL.
- Empty catalog after setup → you ran an old `seed.sql` (collections only).
  Re-run the current `supabase/seed.sql` — it loads the full catalog.
- `Missing Supabase URL / SUPABASE_SECRET_KEY` on checkout → set
  `SUPABASE_SECRET_KEY` (`sb_secret_…`) in `.env` and restart `next dev`.
- Still on legacy keys? Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` instead — code falls back to them. Deactivate
  legacy keys in Settings → API Keys only after everything uses the new ones.

### Illustrated fragrance notes

The notes editor at `/admin/notes` accepts transparent PNG, WebP or AVIF drawings (2 MB maximum) through the existing public `products` bucket and super-admin Storage policies. Upload, preview, then **Save note** to publish. Files live under `note-glyphs/`; original transparency and colors are retained. No additional schema is required beyond `supabase/migration_add_glyphs.sql` (`notes.glyph` text column). Old icon keys, empty values and failed image loads use the local `/notes/essence.svg` default. Assign the note to a product's top, heart or base tier in the product editor; this drives both the homepage matches and the product composition display.

### First-party analytics

Run `supabase/migration_analytics.sql`, then open Admin → Analytics. See [ANALYTICS_SETUP.md](ANALYTICS_SETUP.md) for dashboard access, cookie/event behavior, verified purchase tracking, customer Excel CSV exports, metric definitions and verification.

### Physical stores and product availability

Run `supabase/migration_retail_stores.sql`, then open Admin → Catalog → Stores & product availability (`/admin/stores`). It seeds Mamzar Centre for all current/future products. Edit its details centrally, add locations, and bulk assign products by collection or lineup. See [RETAIL_STORES.md](RETAIL_STORES.md) for assignments, Maps links, access controls and caching. This is a store directory, separate from online stock quantities and checkout delivery.


## Orders workspace upgrade (27 October 2026)
Apply `supabase/migration_orders_workspace.sql` after the existing order/product-options/samples/optional-stock migrations. Read [Orders workspace](ORDERS_WORKSPACE.md). Admin Orders now provides filtered summaries, a selectable/paginated table, all-matching/selected CSV export, atomic bulk changes and manual creation. Dispatched requires a tracking number. Existing Packed rows are retained as legacy preparation, not silently relabeled as courier handover. No Tap/card checkout integration is enabled by this upgrade.
