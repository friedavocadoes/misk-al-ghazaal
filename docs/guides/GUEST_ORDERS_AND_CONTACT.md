# Guest order access and correspondence

## Setup
Run these in Supabase SQL Editor after the existing order/auth/profile migrations:
1. `supabase/migration_guest_order_links.sql`
2. `supabase/migration_contact_inbox.sql`

No new package or secret is needed. `NEXT_PUBLIC_SITE_URL` must contain the deployed public origin for order-update email URLs, as it already does for system email assets. SMTP remains the existing shared SMTP configuration. Migrations were validated in disposable PostgreSQL; no live order, message, account claim or email was created during testing.

## Guest order links
- `/orders/<opaque-key>` (Arabic `/ar/orders/<opaque-key>`) shows live status, timeline, items, totals, delivery estimate, address and courier tracking without requiring login.
- New orders get a cryptographically random 64-character key in the same transaction as order creation. The migration backfills existing orders. Keys are stored in the private `order_access_links` table; browser roles have no table access or RPC grants. UUIDv4 pairs avoid relying on a particular pgcrypto extension schema.
- Keys are stable, including after cancellation, return, delivery or account adoption. Cancellation/return show their status rather than a 404. Soft-binned orders show an unavailable message and no order details; permanent deletion removes the key with the order. Invalid keys get a normal 404. Existing emails cannot be modified retroactively; future receipts/status emails contain the link, and an old order’s link is available in admin after migration.
- Order pages have no shared cache, noindex/nofollow metadata, X-Robots-Tag and no-referrer headers, and are excluded from robots/sitemap discovery. First-party analytics do not collect these paths or attribution; the shared path sanitizer also redacts the key as a defense in depth. The page never exposes staff notes or account email. Bearer links disclose the displayed order details to anyone holding them, so the interface labels them private.
- Status refreshes every 45 seconds while visible and on returning to the tab. There is a retry boundary if the database is unavailable.

## Saving to an account
Checkout and an explicit order-page POST remember up to eight private keys in an HttpOnly, SameSite=Lax cookie for 30 days. Reading a page or a prefetch alone never changes ownership. Visit the private link again to remember an older key if browser memory has expired.

Email login/profile bootstrap, signup/email confirmation and Google OAuth call the same claim flow. A customer with verified Auth email can adopt unowned, non-binned orders matching that email. Browser-key possession additionally lets them adopt remembered guest orders even if they register with a different email. The order page retries adoption after login and offers login/register links returning to that order. Once saved, the existing account order list/detail works normally.

Both claims run in guarded service-only SQL functions, with `user_id is null` in the UPDATE itself. Another account’s order is never reassigned, including races. Orders with an existing owner remain readable through their private key, but cannot be saved into a different account. Staff roles are excluded from claims; the access endpoint also avoids remembering links during staff previews. Staff see a preview notice. Login remains available even if claiming fails; revisiting the private link retries.

The verified-email SQL replaces the previous unbounded client-side scan and protects against unverified-email adoption and concurrent ownership changes. The duplicate claim call in `/api/auth/ensure` was removed.

## Email, checkout and admin
- `src/lib/mailer.ts`: shared order email adds a “View your order & updates” action and private-link explanation.
- `src/app/api/checkout/route.ts`: obtains the saved key, remembers guest access, includes it in the receipt and response.
- `src/components/blocks/OrderReceived.tsx`: post-order action opens the private page for guests as well as account holders.
- `src/lib/order-notifications.ts`: status/manual-order emails use the same private link.
- `/admin/orders/[id]`: Customer order link panel provides Open and Copy controls. Clipboard failure offers a normal open link. Viewing as staff does not claim it.

## Contact redesign and real inbox
`/pages/contact` uses the existing transparent-header opt-in, smoked-olive graphic hero, etched SVG bottle/contour artwork, two-pixel eased corners, subtle glass surfaces and all existing direct contact methods. There are no new hero image downloads or animation packages. The contact form streams behind Suspense, so catalog options cannot hold up the hero/direct channels. Non-contact info pages no longer fetch the full product catalog unnecessarily.

`MagneticContactLink` translates the inner surface by at most seven pixels on fine mouse input using CSS variables and one animation-frame write. Its hit area stays fixed. Pointer exit resets it; touch, keyboard and reduced-motion users keep ordinary links. Copy controls are separate from the anchor. The page’s shared header still turns solid/compact on scroll as usual.

The previous form only generated a client-side reference without delivering anything. Now `/api/contact` validates meeting/review/complaint fields, checks origin and a honeypot, and calls an atomic inbox insert. Email-normalized requests are capped at three/hour, with five/hour per sender cookie; the database serializes these checks. Failures preserve the form and allow retry. Success returns a durable server-generated reference.

Messages are visible under **Workspace → Contact inbox** (`/admin/inbox`) for super admins and order staff, 30 per page. Content editors/customers cannot read it. Full topic-specific details are retained privately. A best-effort email alerts the support address using the existing hello mailbox; SMTP failure does not lose a stored enquiry. Contact feedback is an inbox enquiry, not an automatic public product rating/review, so the existing review approval system is preserved. Success copy reflects receipt without promising publication or a fixed response deadline.

## Main files
| File | Purpose |
| --- | --- |
| `src/lib/order-access-shared.ts` | Key validation, cookie bounds, route construction |
| `src/lib/order-access.ts` | Server key lookup, HttpOnly browser memory, claim RPC |
| `src/app/api/orders/access/route.ts` | Explicit remember/claim POST, role/ownership guards |
| `src/lib/auth-profile.ts` | Login/callback account adoption |
| `src/app/[locale]/(storefront)/orders/[token]/page.tsx` | Explicit public-field order presentation |
| `src/components/blocks/GuestOrderAccess.tsx` | Save/login prompt, auth updates, visible refresh |
| `src/components/blocks/ContactLanding.tsx` | Contact hero and streamed form |
| `src/components/blocks/ContactChannels.tsx` | Direct channel content and copy controls |
| `src/components/blocks/MagneticContactLink.tsx` | Bounded mouse attraction and motion fallbacks |
| `src/components/blocks/ContactExperience.tsx` | Existing three-step enquiry workflow, real submit |
| `src/lib/contact-message.ts` / `src/app/api/contact/route.ts` | Validation, persistence and notification |
| `src/app/admin/inbox/page.tsx` | Private enquiry inbox |
| `tests/guest-orders-contact.test.cjs` | SQL ownership/permissions/throttle and mocked API/email regressions |

Validation includes a successful production build, disposable PostgreSQL tests, and actual page/component browser checks with mocked requests on desktop/mobile. Browser checks cover cancelled-order visibility, login save-state, magnetic response/reset/reduced motion, and contact error/retry/success. No live messages or emails were sent.
