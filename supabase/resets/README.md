# Owner-run data reset queries

These scripts permanently delete data. They are **not migrations** and are not executed by the application. Run only the selected script in Supabase SQL Editor after exporting any data you want to keep. They target the current schema after project migrations are installed. Transactions stop on errors; no broad TRUNCATE CASCADE is used.

| Script | Deletes / clears |
|---|---|
| 01-analytics.sql | All sessions, events and feedback |
| 02-orders.sql | All orders, including recycle bin, plus dependent items/history/redemptions/prompts; resets sales counters |
| 03-customers.sql | Only `customer` Auth accounts and profiles, preserving `super_admin`, `orders`, and `content_editor` accounts |
| 04-carts-wishlists.sql | Saved customer carts and wishlists |
| 05-reviews-ratings.sql | Reviews and guest/account ratings; resets visible product aggregates |
| 06-coupons-referrals.sql | Coupon codes/redemptions and referral history |
| 07-catalog.sql | Products, collections, lineups, rituals, notes, samples and tiers |
| 08-editorial-content.sql | Banners, homepage sections, blogs, categories, SEO overrides and promo campaigns |
| 09-audit-log.sql | Audit history; deliberately separate from the activity reset |
| 10-test-activity.sql | Combined test-activity reset while preserving staff, catalog and content |

For an empty storefront with staff accounts preserved, run **10**, **07**, **08** and (only if wanted) **09**. Site defaults, SMTP configuration, delivery zones and referral settings remain; these are configuration rather than test activity. Analytics starts recording again as soon as someone visits.

Order deletion does not restore stock. Removing orders also removes their coupon redemption history, making per-account allowances available again. Reset inventory explicitly to your intended quantities in admin. Customer account deletion alone leaves order PII and anonymous analytics history; use the orders/analytics scripts too when clearing those datasets.

**Storage files are separate:** SQL deletes database rows, not uploaded bytes. Delete unwanted invoice/avatar/product/banner/blog files through Supabase Storage's API/dashboard, not by directly deleting `storage.objects` metadata. Customer deletion may be blocked by owned Storage objects; remove those objects first and rerun. These scripts do not remove bucket policies or storage configuration.

**Browser state is separate:** saved guest bags, selected offers/samples, guest rating cookies and survey cooldowns cannot be erased through database SQL. On your test browsers, sign out and clear the relevant site storage/cookies before revisiting; otherwise a stored cart may sync back to the database. Preserve production customer browser state unless you intend a full test reset.
