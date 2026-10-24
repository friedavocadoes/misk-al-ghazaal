# Stores and typo-tolerant search

## Activate stores

Run `supabase/migration_retail_stores.sql` in Supabase SQL Editor before deploying this feature. The migration has been tested in a disposable PostgreSQL database; it has not been run against your live project.

It creates the centralized directory and assignment table, adds their access policies and seeds **Misk Al Ghazaal — Mamzar Centre** with the brief address **Shop 08, Mamzar Center, Dubai, UAE**. Edit the details in the admin panel. No exact map pin, phone or opening hours are invented. Repeating the migration preserves edits to the default store.

Mamzar is set to carry **all products**, including future additions. That policy avoids creating a duplicate store record or thousands of product-specific copies.

## Admin workflow

Open **Workspace → Catalog → Stores & product availability**, or `/admin/stores`. The admin dashboard and product editor also link here. Store management is restricted to `super_admin`.

Select **Details & products** to edit the store name, city/area, address, Google Maps link, phone, opening hours, display order and optional Arabic details. Blank Maps links generate an address search in Google Maps; a direct Maps/share link can be pasted instead. Only HTTPS Google Maps hosts are accepted.

- **Visible on product pages** controls the entire location. Pausing preserves its assignments.
- **Carries all products, including future additions** includes the catalog by default. Use bulk removal to exclude specific products.
- Leave that checkbox off for a store that carries selected products only. Use bulk addition to include them.

Under **Product availability**, search by product name/slug, filter by collection or lineup, and optionally show assigned or unassigned products. Select individual products or **Select N shown**, choose Add/Remove, and click **Apply to selected**. Selections remain selected when you change filters; **Clear selection** clears the whole pending selection. Paused stores still show their saved assignment state in this editor.

Explicit choices remain saved when changing the all-products policy: a saved removal remains an exclusion, and a saved addition remains an inclusion. Assignment saves are atomic and idempotent. If a selected product was deleted, the entire save is rejected instead of leaving a partial update.

The delete control removes the store and its assignments, without changing any product. Pause the store if you intend to use it again. Creates, detail edits, bulk assignments and deletes appear under **Stores** in the audit log.

## Product pages

**Find in store** displays the locations carrying that product, with the store name, area, address, directions and optional hours/phone. More than four locations can be expanded. Empty/paused locations produce no empty section. Names and locations are read from the central record, not copied into products.

The section streams below the composition and does not block the product gallery or purchase controls. It uses plain links rather than loading Google Maps scripts. Store changes expire the shared lookup cache and revalidate English/Arabic product pages. Lookups have a 60-second fallback lifetime; saving store details refreshes them immediately. A missing migration or optional store-lookup failure never prevents the product page from loading.

Assignments describe which products a location carries. They do not claim a live physical inventory count or infer a shopper's location. Website stock quantities and the manual online out-of-stock setting remain separate.

Catalog reset SQL deletes product links through foreign-key cascades; the central store directory remains business configuration. All-product stores automatically apply to newly created catalog products.

## Search changes

The existing MiniSearch index now searches in stages: exact words and prefixes first, then joined-name matches and approximate spelling. Results are deduplicated. Approximate matching allows one edit for 3–5 letters, two for 6–9, and up to three for longer words. One- and two-letter terms do not use fuzzy matching, avoiding overly broad suggestions.

Examples covered by regression tests include `aud` → Oud, `abukalid oud` → Abukhalid Oud, `rose essense` → Rose Essence, and missing spaces such as `mywish` or `abukhalidoud`. Arabic normalization remains in place. Suggestions and full search share the algorithm; subsequent keystrokes continue searching locally without a network request per query.

## Checks

`node --test tests/*.test.cjs` runs the regression suite. Set `ANALYTICS_PGLITE_MODULE` to a local `@electric-sql/pglite` installation to include SQL integration tests. These check seed preservation, role restrictions, hidden paused stores, atomic bulk updates, exceptions, future-product coverage, cascading deletion and trusted Maps URLs. Desktop/mobile browser checks cover the product section, map links, expansion, bulk selection, filter persistence and misspelled customer searches.
