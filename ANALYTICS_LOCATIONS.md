# Location analytics

Implemented 26 October 2026. Open **Admin → Analytics → Locations & emirates** (`/admin/analytics/locations`). Super admins and content editors can use this section; other staff roles cannot access its API.

## Installation

Run `supabase/migration_analytics_locations.sql` in the Supabase SQL editor **after** the existing analytics and survey migrations. It adds nullable location columns, preserves the existing ingestion safeguards, and installs the service-only `analytics_locations` reporting function. It can be rerun safely. Deploy the application changes alongside it.

The migration has been exercised against disposable local PostgreSQL, not applied to the live project by the coding agent. Editing a local migration file does not update Supabase.

## What you can see

- Visitors, sessions, page views, distinct buyers, placed orders, revenue, and session conversion for a selected country/emirate.
- Seven UAE emirate cards, compared by visitors, page views, or orders. Clicking one filters the detailed reports.
- Country comparison, with click-through to country-specific data.
- City/region performance for the selected location.
- Page-by-page views and subsequent orders from the selected location, with path search.
- The latest 100 matching visit sessions, including anonymous browser/session references, estimated location, source, activity time, views, and orders.
- CSV export of the country, city, and page tables.

The existing date and bot filters apply. Emirate cards and the country comparison remain an overview of all locations within those date/bot filters; the summary, cities, pages, and recent sessions follow the selected country/emirate. The active selection appears in their headings.

No new chart library, map SDK, or external geolocation request is sent to shoppers. Region filters are URL-backed, so a selected report can be bookmarked.

## Where the location comes from

The server reads coarse location supplied by the hosting edge. It does not request GPS permission, save raw IP addresses, or infer an emirate from the site's language/timezone.

On Vercel, capture reads `x-vercel-ip-country`, `x-vercel-ip-country-region`, and URL-decoded `x-vercel-ip-city`. These headers describe the client IP's estimated location, rather than the server's deployment region. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).

For a Cloudflare-proxied origin, it supports `cf-ipcountry`, `cf-region-code`/`cf-region`, and `cf-ipcity`. Country-only geolocation is insufficient for city reporting; enable **Add visitor location headers** in Cloudflare's Managed Transforms if using that provider. See [Cloudflare location headers](https://developers.cloudflare.com/rules/transform/managed-transforms/reference/).

Fields from different providers are not combined. Vercel's set takes precedence when its country header exists. The production edge/proxy must supply trustworthy headers and correctly identify the original client; a custom origin exposed directly to arbitrary clients should not blindly trust client-injected headers.

Normal localhost requests have no hosting geolocation and display Unknown. Missing or unsupported data also stays Unknown. Old session records are not retrospectively assigned cities/emirates.

### UAE mapping

| Code | Emirate |
| --- | --- |
| AZ | Abu Dhabi |
| DU | Dubai |
| SH | Sharjah |
| AJ | Ajman |
| UQ | Umm Al Quwain |
| RK | Ras Al Khaimah |
| FU | Fujairah |

Explicit UAE region codes/names take priority. A conservative fallback recognizes unambiguous city names, including Al Ain as Abu Dhabi. Ambiguous or unrecognized city names are not guessed. UAE visits with no known emirate still count toward UAE totals.

The first available location is retained per session. Missing details can fill later from a compatible country, but a later request from another country does not relabel that session. This is a session's estimated visit location, not a continuously tracked movement history.

The report displays coverage: sessions with a known country and UAE sessions with a known emirate. A low coverage rate means the deployment is not supplying enough location data; it does not mean the missing visitors were outside the UAE.

## Metric definitions

The date window is inclusive Dubai calendar dates, matching existing analytics. Default reports exclude flagged bot sessions.

- **Visitors:** distinct browser visitor IDs in included sessions.
- **Page views:** `page_view` events in the window. Multiple views by the same browser count multiple times.
- **Buyers:** distinct authenticated account IDs when associated, otherwise visitor IDs, among sessions with a purchase event in the window.
- **Orders:** recorded server purchase events in the window, deduplicated by order ID.
- **Conversion:** sessions with a purchase in the window ÷ included sessions × 100. It is not orders ÷ page views.
- **Revenue:** tracked purchase totals from current fully paid active orders only after `migration_paid_feedback.sql`; pending/refunded/cancelled/returned/deleted orders contribute zero.

Country and emirate comparisons count distinct visitors within each group. A browser appearing in multiple location sessions can appear in more than one group, so group visitor counts should not be summed as globally unique people.

### Page conversion

For each session and page path, the report finds the first view of that page in the selected period. It then counts purchase events in that session/period at or after that view. Orders before a page's first view do not count against that page.

Page conversion is sessions with a subsequent purchase ÷ sessions viewing that page. This measures association, not proof that a page caused the order. One order can appear after several pages in a journey; **do not add page-level order or revenue totals together**.

Query strings are stripped by existing collection, so filtered/search URLs can share a stored path. The report returns up to 200 paths and 200 city/region groups, ranked by views and visitors respectively. Search/sorting/export use those returned rows, not an unlimited raw history export.

### Buyers' location versus delivery location

These reports locate the recorded purchasing session. They do not group by delivery addresses. A customer browsing Dubai and shipping a gift to Sharjah counts under the browsing session's estimated location. VPNs and mobile networks can produce an estimate outside the customer's actual emirate.

Actual order records can exceed tracked purchases if analytics collection failed or session cookies were unavailable. No historical locations are fabricated to close that gap.

## Files

| File | Responsibility |
| --- | --- |
| `src/lib/analytics/location.ts` | Header decoding, provider selection, conservative UAE normalization |
| `src/lib/analytics/server.ts` | Include coarse location in server-derived analytics session context |
| `supabase/migration_analytics_locations.sql` | Schema upgrade, compatible ingestion, location/page aggregates and permissions |
| `src/app/api/admin/analytics/route.ts` | Role/date/filter validation; `kind=locations` RPC |
| `src/lib/analytics/dashboard.ts` | Location report types and section registration |
| `src/components/admin/analytics/LocationAnalytics.tsx` | Location interface, drill-down controls, recent sessions and CSV exports |
| `src/components/admin/analytics/AnalyticsDashboard.tsx` | Location report fetch, refresh and shared date/bot controls |
| `src/components/admin/admin-nav.tsx` | Workspace entry |
| `tests/analytics-locations.test.cjs` | Geo parsing, filters, real SQL report/ingestion/access regressions |

## Verification

```powershell
$env:ANALYTICS_PGLITE_MODULE = Join-Path $env:TEMP 'gazaal-analytics-qa/node_modules/@electric-sql/pglite'
node --test tests/analytics-locations.test.cjs tests/analytics.test.cjs tests/analytics-sql.test.cjs
```

The optional PGlite dependency setup is described in `ANALYTICS_SETUP.md`. Tests use disposable local data and do not place an order or change live Supabase records.

After applying the migration and deploying, visit the storefront from a normal browser and refresh the Locations report. Use the coverage counts and Recent visit locations table to verify that the hosting provider supplies country/region/city. Ordinary bot/date filters still apply.
