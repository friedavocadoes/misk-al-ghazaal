# First-party store analytics

Location reporting: apply `supabase/migration_analytics_locations.sql` **after** the existing analytics/survey migrations, then open **Analytics → Locations & emirates**. See [Location analytics](ANALYTICS_LOCATIONS.md) for installation, UAE mapping, page conversion, hosting headers, and accuracy limits.

For the detailed explanation of tracking, bot detection, abandonment, surveys, metric formulas, and the source-code map, read [How analytics works](ANALYTICS_EXPLAINED.md).

## Install and open

1. Run **`supabase/migration_analytics.sql`** in the Supabase SQL editor after the existing project migrations. It is safe to rerun. The application uses the existing Supabase environment variables; no analytics account, keys, or third-party SDK is required.
2. Deploy the code. Open **Admin → Workspace → Analytics** (`/admin/analytics`).
3. Super admins and content editors can view aggregate analytics. Only super admins can open **Customer data & export**. The orders role cannot access analytics. Exports are recorded in the audit log.
4. Make an ordinary storefront visit. `/api/analytics/collect` responds with 204, and data should appear on dashboard refresh. Automated/headless tests appear in **Include bots / Bots only**, not the default real-user view.

The live strip refreshes every 30 seconds while the admin tab is visible. Live visitors means unique non-bot visitors active in the last 90 seconds. Monthly conversion uses tracked sessions; total orders comes from the orders table, excluding deleted orders. Total visitors begins when tracking is installed, not when the shop was originally created.

## What is recorded

- `_av_id`: random visitor UUID, one year; `_as_id`: random session UUID, rolling 30-minute inactivity expiry. Logging out or switching accounts starts a new session. Guest activity can become associated with the account when the shopper logs in.
- `_utm_first`: original attribution, one year; `_utm_last`: latest campaign/external referrer, 30 days. Capture includes source, medium, campaign, content, term, referral code, landing path and referrer domain. Cookie sizes are bounded for non-Latin text. Full referrer URLs and ordinary query strings are not collected as page paths.
- `_is_bot`: server user-agent classification, supplemented by webdriver/headless checks. A session once classified as automated stays automated. Detection is heuristic; bot traffic is recorded and filterable, not blocked from shopping.
- Page/product views, user-triggered cart adds/removals/quantity changes, checkout entry and server-verified purchases. Hydration, account cart reconciliation and refresh do not count as cart actions. StrictMode does not duplicate initial views.
- Foreground activity heartbeats approximately every 30 seconds, with idle/background tabs excluded. Active seconds are capped by elapsed server time. This is an interaction estimate, not exact attention measurement.
- An optional, dismissible abandonment question. It displays once per tab/session and does not display after purchase. Responses use a unique session constraint. It supports removing the last item, leaving cart/checkout, desktop exit intent and mobile cart/checkout idle. A checkout submission pauses its idle prompt.

## Reading the numbers

- Date controls use **Asia/Dubai**, inclusive calendar dates, with a maximum 366-day window. Comparison is the immediately preceding interval of equal length.
- Viewers are unique visitor IDs. Conversion is purchase sessions / sessions. Funnel stages count sessions independently; shoppers may enter midway through the funnel.
- Revenue is **order value placed**, including COD awaiting confirmation. It is not settled cash, profit, or net revenue after refunds. The dashboard does not invent advertising ROI: spend is not available.
- One purchase event is stored per order UUID, only from `/api/checkout`. The public collector rejects browser-supplied purchase/revenue events. The server's existing quote supplies amounts. Tracking runs after the response and never changes an order's outcome.
- Product revenue is merchandise price × units before discounts/shipping. Product drop-offs count sessions adding that product in the selected period with no recorded purchase, including purchases recorded later. Dashboard tables return at most 500 product/source groups; product sorting and filters work within that result.
- First/last-touch attribution uses the respective campaign captured for a session. Attribution is not a guarantee that an ad caused an order. Cookies cleared by shoppers or blocked storage can reduce attribution accuracy.
- Customer data shows all shopper accounts, with orders in the selected period and activity for sessions started in that period. Session active time crossing a date boundary is not split at midnight. Visitors who never log in remain anonymous.

## Customer exports

Use **Analytics → Customer data → Export Excel CSV**. The UTF-8 BOM CSV opens in Excel, includes all matching pages of results and follows the chosen date/search/promotion filters. Fields include email, name, phone, saved address, promotion and order-email preferences, session/active-time figures, first/last activity, order count and spending. Passwords, auth tokens and arbitrary auth metadata are never exported. Spreadsheet formula-like text is escaped.

The PII endpoint checks the authenticated super-admin role independently of the UI. SQL tables and functions have no public/ordinary authenticated grants; service-role access stays on the server. Aggregate metrics are calculated by PostgreSQL RPCs, not from raw event downloads in Node/browser code.

## Verification

```powershell
node --test tests/*.test.cjs
npx tsc --noEmit
npm run build
```

`tests/analytics-sql.test.cjs` can also run the actual migration and aggregation/access regressions in disposable local PostgreSQL through PGlite, without touching Supabase:

```powershell
npm install --prefix "$env:TEMP/gazaal-analytics-qa" @electric-sql/pglite
$env:ANALYTICS_PGLITE_MODULE = Join-Path $env:TEMP 'gazaal-analytics-qa/node_modules/@electric-sql/pglite'
node --test tests/analytics-sql.test.cjs
```

If Windows reports an SWC native-cache permissions error during build, point the build process at a workspace-local cache (no machine-wide permissions change):

```powershell
$env:SWC_NATIVE_BINDING_CACHE = Join-Path (Get-Location) 'node_modules/.cache/swc-native-cache'
npm run build
```

## Operations

- A missing migration leaves storefront tracking as a silent no-op and shows an installation/retry state in admin. It does not fabricate historical metrics. Purchases made before installation cannot be assigned historical sessions.
- Collection is best effort: blocked beacons, browser termination, or a failed background database write may lose events. Purchase deduplication prevents duplicates but is not a durable retry queue. This is store analytics rather than an accounting ledger.
- Analytics tables contain history until explicitly removed. To implement a retention policy, delete old `analytics_sessions` after your chosen interval; event/survey rows cascade. No automatic deletion policy is enabled by this migration.
- Before launch, check collection and a real order in the deployed environment after running the migration. Local verification does not place a live order or change Supabase data.

## Contextual feedback update (2026-10-22)

Existing installations: run `supabase/migration_survey_experience.sql` after the original analytics migration. Fresh installations can run the updated `migration_analytics.sql` directly.

Feedback now distinguishes returning to an unfinished bag (after at least 15 seconds away), leaving checkout, removing a scent, desktop exit intent, mobile idle (45 seconds), and product interest without adding it (120 foreground seconds). Context-specific options include uncertainty about the scent, missing details, availability, fees and payment preferences. Return/removal/checkout navigation prompts wait 6–7 seconds; they do not interrupt the click itself.

One question is shown per analytics session, with a cross-visit cooldown: 30 minutes after showing, two hours after dismissal, twelve hours after an answer or purchase. Purchase/checkout submission and open dialogs suppress prompts. Use a fresh browser test context when validating separate triggers, rather than interpreting the deliberate cooldown as a failure. Closing/leaving the site records a bag snapshot for a later return; no prompt tries to block unload.

Admin → Analytics → Why no buy? now shows opportunity/shown/dismissed/answer counts, response rate for prompts in the chosen range, responses grouped by journey, and a searchable/filterable feed of the latest 100 answers, including answers with no comment. Aggregates run in PostgreSQL. Feedback only shows a success acknowledgement after the server confirms storage; failed saves expose retry.
