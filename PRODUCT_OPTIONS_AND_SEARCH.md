# Product options, inventory, search and demand ranking

## Install

Run these in Supabase SQL Editor, in order, before deploying this update:

1. `supabase/migration_product_options.sql`
2. `supabase/migration_demand_ranking.sql`
3. `supabase/migration_optional_stock.sql` (allows blank/unlimited stock)

The ranking migration requires the existing analytics and audit-log migrations. All three migrations are repeatable and preserve product/variant IDs, orders, inventory and existing manual bestseller tags. No SQL has been executed against the live database as part of this update. The initial ranking refresh runs when its migration is installed.

`npm install` installs the new `minisearch` dependency. No hosted search account, API key or external service is needed.

## Inventory

Admin → Products shows an **Out of stock** shortcut only when there are unavailable products. The status filter and row badges use both the manual override and the sum of active option availability. Pausing a product remains a separate visibility control.

In a product editor, **Variants + stock → Mark product out of stock** stops sales without erasing inventory. **Use inventory counts** releases that override; a product stays unavailable if all its active options have zero stock. Blank stock is unlimited (`NULL` in SQL), while explicit zero means sold out. Products without variants use their base price and unlimited stock unless manually marked out of stock. Existing numeric counts are preserved; clear the field to stop tracking an option. Storefront cards, search suggestions, the product picker, purchase buttons, catalog availability filters and Product structured data follow the same rules. The pricing API also enforces them for saved carts, direct requests and archived options. Successful checkout invalidates product/listing/search caches after stock changes.

## Variants

Each card represents a real concentration/capacity pair, with its own price, stock, SKU, optional product-name override and gallery policy. Use **Add variant** to create another pair. For example:

| Concentration | Size | Photos |
| --- | --- | --- |
| Eau de Parfum | 50 ml | Product gallery |
| Eau de Parfum | 100 ml | Own images |
| Eau de Toilette | 100 ml | Product gallery |

Selecting EDT exposes only its 100 ml size. Changing an option updates the product title, price, availability and gallery together. Multi-option listing cards open the product page to choose an option; they never silently add a different option. Bag, drawer and checkout summaries retain the selected option's title, price and image.

The five concentrations are Eau Fraîche, Eau de Cologne, Eau de Toilette, Eau de Parfum and Extrait de Parfum. For incense or other products, leave concentration and ml empty and use a custom label such as `100 g`. Migration recognizes explicit ml/concentration labels only; it never converts grams to ml or guesses a strength. Existing labels and IDs remain intact.

Choose **Own images** for the variant uploader, which uses the existing drag/drop WebP conversion. Empty custom galleries are rejected. Removed images are deleted only after checking references in product/variant galleries, notes and artwork, including archived/binned products. Shared galleries use the product gallery directly. The starting price follows the lowest active option; edit prices on the option cards. Products without options can edit their base price in Details. Unlimited stock is never decremented and never renders a remaining-stock counter.

**Archive option** removes it from new purchases but retains its ID, gallery and order history. Keep at least one active option. Expand **Archived options**, edit and save to restore one. A customer holding an archived option in a saved cart sees a stock warning rather than receiving a different option.

## Search

MiniSearch indexes English/Arabic names, notes, lineup names, category slugs and option labels. It supports prefix and typo matching; Arabic diacritics and common alef variants are normalized. The customer downloads one compact catalog and subsequent keystrokes search in memory without a network request. Public and authenticated admin indexes are separate; paused products never enter the public index.

The server caches the catalog for 60 seconds and reuses its in-memory search engine. Admin catalog mutations, ranking refreshes and checkout stock changes invalidate the server's `catalog-search` tag through the normal revalidation helpers. An already-open browser refreshes its snapshot on a subsequent search after its 60-second lifetime. Pricing and availability at checkout are always authoritative database reads, never search-index values. Full search and infinite-scroll results use the same matching engine, preserve relevance by default and still support the existing filters and explicit sorts.

## Automatic demand ranking

The service-only SQL function `refresh_product_demand` runs at most once every five minutes following a page visit, product view, cart addition, checkout start or order. A database advisory lock makes this limit hold across server instances; no cron or foreground checkout delay is required. If there is no qualifying traffic, the next qualifying event refreshes the scores. Analytics failure never blocks a purchase.

Scores use the last 30 days, with a seven-day half-life:

| Signal | Weight |
| --- | --- |
| Product viewed | 0.5 |
| Added to cart | 1.5 |
| Added, then checkout started before removal | 2 |
| Valid order containing the product | 6, with a small capped lift for multiple units |

Engagement signals count once per visitor/product/Dubai calendar day. Bot and staff sessions are excluded. Purchases come from actual order items, including orders without analytics cookies; cancelled, returned, binned and staff orders contribute nothing. A single order's quantity lift is capped at three units. These are placed COD orders, not a claim of settled revenue.

Automatic tags require a score of at least 5 and evidence from either three visitors or two orders. The leading 15% of active catalog products qualify, capped at eight tags. Previously tagged products stay eligible within 80% of the current cutoff to reduce tag flicker. Expired demand can remove an automatic tag.

The editor exposes three policies:

- **Automatic**: follows demand; the visible Best seller checkbox reflects the effective database tag.
- **Pinned**: always a bestseller. Existing manual tags migrate here.
- **Excluded**: never automatically tagged. Unchecking the checkbox selects this policy.

The popular sort prioritizes demand; featured ranking combines manual priority, bestseller status, demand and lifetime sales. Each automatic tag addition/removal writes a **System / auto_rank** audit entry with score, visitor count, order count and previous/new values. Score-only refreshes do not flood the audit log. Demand scores also appear in the admin product list. The owner-run analytics/order/activity reset examples refresh these derived values when the ranking function is installed; pinned editorial tags remain.

## Validation

Run `node --test tests/*.test.cjs`. To execute the SQL integration tests too, point `ANALYTICS_PGLITE_MODULE` to a local `@electric-sql/pglite` installation. Tests use a disposable PostgreSQL database, never live Supabase. Coverage includes dependent sizes, galleries, bilingual/typo search, manual/zero stock, archived options, legacy carts, ranking deduplication/decay, policy overrides, audit records, repeatable migrations and service-only execution.
