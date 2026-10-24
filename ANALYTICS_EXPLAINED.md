# How Misk Al Ghazaal analytics works

A guide to the current implementation, its code, and how to interpret the numbers.

**Code reviewed:** 24 October 2026, repository revision `64c472f`.

**Scope:** This explains the implementation in this repository. It does not verify which migrations are currently installed in the live Supabase project. Nothing in this guide requires changing customer data.

You can paste this Markdown into Notion. File paths are relative to the project root, `C:\Users\g\Downloads\gazaal`.

## Contents

1. The overall idea
2. What technologies are used
3. Visitors, sessions, accounts, and cookies
4. How a visit becomes a database record
5. How bot detection works
6. How page visits and product views work
7. How activity and live visitors work
8. How cart actions are recorded
9. How checkout and purchases are recorded
10. What abandonment actually means
11. How customer surveys work
12. How attribution and campaign links work
13. How to read the dashboard metrics
14. Admin screens, permissions, and exports
15. Database tables and functions
16. How analytics influences best sellers
17. Privacy, security, performance, and reliability
18. An example customer journey
19. Code map and where to make changes
20. How to inspect and troubleshoot the system
21. Current boundaries and possible future additions

## 1. The overall idea

This is a **first-party analytics system**. Our own website sends small messages to our own API, and our API stores them in our Supabase database. Our admin panel asks PostgreSQL to summarize those records.

There are three different kinds of information:

| Kind | Example | What it tells us |
| --- | --- | --- |
| Recorded behavior | A product page opened; an item was added | Something happened in the browser |
| Inferred behavior | A session added to cart but has no recorded purchase | A possible drop-off, based on a rule |
| Customer feedback | “Delivery time” selected in a survey | What that respondent chose to tell us |

These should not be treated as interchangeable. Someone leaving a checkout page is not necessarily abandoning an order forever. Someone viewing a perfume for two minutes has not necessarily read every word. A survey answer explains that respondent's experience, not every shopper's experience.

The main flow is:

```text
Customer opens the storefront
    → proxy/browser creates visitor and session cookies
    → browser observes a route change or shopping action
    → browser sends a small event to /api/analytics/collect
    → server validates and classifies the request
    → PostgreSQL saves the session and event
    → admin API requests SQL summaries
    → admin dashboard renders cards, tables, and charts

Successful order placement follows a separate trusted route:
    /api/checkout → server-calculated order → recordPurchase()
```

The system observes shopping; analytics failures are designed not to prevent shopping.

## 2. What technologies are used

| Technology | Its actual role |
| --- | --- |
| Next.js 16 App Router | Routes, API handlers, server authentication, and background `after()` work |
| React 19 + TypeScript | Browser observers, survey interface, dashboard, and shared data contracts |
| Supabase Auth | Verifies the logged-in account and staff permissions |
| Supabase PostgreSQL | Stores sessions, events, and feedback; computes reports through SQL functions |
| Supabase JavaScript clients | Browser authentication and server database/RPC access |
| Browser cookies | Remember visitor/session IDs and campaign attribution |
| `navigator.sendBeacon()` | Queues small analytics requests without waiting for them in the UI |
| `fetch()` with `keepalive` | Fallback transport when beacon is unavailable or cannot queue |
| Page Visibility and input events | Estimate foreground activity and avoid prompting hidden tabs |
| `localStorage` / `sessionStorage` | Remember survey history, unfinished bags, and purchase suppression |
| Browser `CustomEvent` | Lets cart, checkout, product views, and surveys communicate locally |
| Recharts | Draws the admin charts; it does not collect customer behavior |
| `date-fns` and `Intl` | Date controls and Dubai calendar boundaries |
| Tailwind, local UI primitives, Lucide | Dashboard and survey presentation |

There is no Google Analytics, PostHog, Segment, external analytics SDK, fingerprinting library, session replay tool, or paid bot-classification service in this analytics implementation. Bot detection does not use AI or machine learning.

The tests can use PGlite, a disposable local PostgreSQL environment, to exercise the SQL without touching Supabase. That is a testing tool, not something downloaded by customers.

## 3. Visitors, sessions, accounts, and cookies

### A visitor is a browser identity

`_av_id` contains a randomly generated UUID. It is the main anonymous visitor identity.

It does not mean “one uniquely identified human.” The same person on a phone and laptop normally has two visitor IDs. Two people sharing the same browser profile can share one visitor ID. Clearing cookies or opening a fresh private browser creates another identity.

There is no fingerprint built from fonts, canvas rendering, or hardware characteristics to reconnect those identities.

### A session is a period of activity

`_as_id` is another UUID, with a rolling 30-minute cookie lifetime. Tracked events renew it; matched storefront requests can renew it too. Once it expires, the next tracked activity creates a new session ID.

This is an activity window, not necessarily a single browser tab. Tabs on the same host share cookies. Two tabs can therefore send events into the same session.

**Closing a tab does not itself guarantee a new session**, and an expired session cookie does not delete the existing database session.

### An account is a verified login

An account has a Supabase Auth user ID. The server obtains it from the verified session, rather than trusting a `user_id` supplied by the browser.

If a guest logs in during an existing analytics session, later ingestion can associate that session with the account. Events join back to that session, allowing the session's earlier guest activity to be understood alongside the login.

Signing out or switching from one signed-in account to another clears the analytics session cookie so the next visible heartbeat/activity starts another session. The visitor cookie remains: the browser is still the same browser.

This association does **not** merge all of the person's historical visitor IDs across devices. Account-based orders and browser-based visitor totals answer different questions.

### Cookie reference

| Cookie | Contents | Lifetime | Why it exists |
| --- | --- | --- | --- |
| `_av_id` | Random visitor UUID | One year when created | Recognize the browser across visits |
| `_as_id` | Random session UUID | Rolling 30 minutes | Group nearby activity |
| `_utm_first` | First captured attribution object | One year | Preserve the original recorded acquisition context |
| `_utm_last` | Latest qualifying attribution object | 30 days | Remember a newer campaign or external referrer |
| `_is_bot` | `1` when the server detects a bot-like user agent | 30 minutes | Carry a classification signal into collection |

These cookies use path `/`, `SameSite=Lax`, and `Secure` on HTTPS. They are accessible to JavaScript because the browser tracking code needs them; they are not authentication cookies and are not signed proof of identity.

First-touch means the first attribution captured while that cookie survives. It does not necessarily mean the first time the person ever discovered the brand.

**Main files:** `src/lib/analytics/proxy.ts`, `src/lib/analytics/client.ts`, `src/components/analytics/AnalyticsProvider.tsx`, `src/lib/analytics/server.ts`.

## 4. How a visit becomes a database record

### Step 1: Initialize identity

`src/proxy.ts` handles the storefront's locale/auth request flow and calls `analyticsCookies()` from `src/lib/analytics/proxy.ts`.

The analytics helper prepares cookies. It skips prefetch requests so merely preparing a possible navigation does not initialize tracking as a deliberate visit. Static assets, API routes, and Next.js internals are outside the proxy's matching storefront flow.

**Setting a cookie is not a database page view.** A crawler fetching HTML without running JavaScript can receive cookies without generating a stored analytics event.

The browser helper also creates missing identity cookies. This supports cached pages and long client-side navigation sessions where there may not be a fresh proxy response setting everything.

### Step 2: Observe an action

`src/app/layout.tsx` mounts `AnalyticsProvider`, which renders no visible content. It observes route changes and runs the heartbeat listeners.

Other components report more specific actions: product views, cart mutations, and survey activity.

### Step 3: Create and send an event

`trackEvent()` in `src/lib/analytics/client.ts` creates an event UUID and sends JSON containing fields such as:

```json
{
  "id": "a-generated-event-uuid",
  "event_type": "add_to_cart",
  "page_path": "/product/example-perfume",
  "product_id": "example-perfume",
  "product_name": "Example Perfume",
  "product_price": 189,
  "quantity": 1,
  "variant_id": "a-variant-uuid",
  "client_bot_detected": false
}
```

The sample values above are illustrative. In analytics, `product_id` currently means the **product slug**, despite the field's name. A variant ID is a separate identifier.

The browser first tries `sendBeacon()`. If it cannot queue the request, it falls back to `fetch()` with `keepalive: true`. The customer does not wait for a database response before the interface responds.

A successful beacon return value means “the browser queued it,” not “Supabase saved it.” There is no persistent offline event queue or guaranteed retry mechanism.

### Step 4: Validate it on the server

`src/app/api/analytics/collect/route.ts`:

- Checks the request origin and rejects explicitly cross-site browser requests.
- Reads at most 16,000 bytes and accepts only expected event names.
- Rejects browser-submitted `purchase` events.
- Bounds strings, prices, and quantities rather than trusting arbitrary payloads.
- Loads visitor/session cookies and the actual authenticated account.
- Adds bot/device/country/attribution context.
- Where possible, resolves the product title and verifies the variant belongs to the product before using its price.

Ordinary browser events remain observations, not financial authority. A determined script can imitate a normal event. The checkout quote is the source of truth for order money.

### Step 5: Persist in background

The route schedules database work with Next.js `after()`. The `ingest_analytics_event` SQL function upserts the session and inserts the event within one transaction. This prevents an event arriving before its parent session exists.

The public collector normally returns **204 No Content**, including for many ignored or invalid requests. Therefore, seeing 204 in DevTools is not sufficient proof that an event was stored. Check the dashboard or database when verifying persistence.

**Main files:** `src/app/layout.tsx`, `src/proxy.ts`, `src/components/analytics/AnalyticsProvider.tsx`, `src/lib/analytics/client.ts`, `src/lib/analytics/server.ts`, `src/app/api/analytics/collect/route.ts`, `supabase/migration_analytics.sql`.

## 5. How bot detection works

The system asks, “Does this session have recognizable automation signals?” It does not prove that a visitor is human.

### Signal A: Server user-agent inspection

`botReason()` in `src/lib/analytics/shared.ts` examines the request's user-agent string.

- A string containing `headless` becomes reason `headless`.
- Recognizable crawler/tool words become reason `ua_crawler`.

The current case-insensitive pattern checks for terms including `bot`, `crawler`, `spider`, `crawling`, `lighthouse`, `gtmetrix`, `pingdom`, `python`, `curl`, `wget`, `axios`, `facebookexternalhit`, `whatsapp`, `slackbot`, `gptbot`, `claudebot`, and `bytespider`.

Examples: Lighthouse performance testing and a Python scraping request can be identified without asking an external service. Social-link preview agents can also match.

This is substring matching, not a verified registry of crawler identities. A user agent can be forged, and an unusual legitimate user agent can match accidentally.

### Signal B: Browser automation checks

`src/lib/analytics/client.ts` checks whether:

- `navigator.webdriver === true`;
- both `window.outerWidth` and `window.outerHeight` are zero;
- the user agent contains `HeadlessChrome`.

A positive browser signal is sent with events and mapped to `webdriver_detected` unless a server user-agent reason already takes precedence.

### Signal C: Carry the result forward

The server can set `_is_bot=1`. On database session updates:

```text
stored is_bot = previous is_bot OR incoming is_bot
```

Once a session is flagged, later ordinary-looking requests do not turn that database session back into a human session. The first stored non-null reason is retained.

The bot cookie itself is not actively rewritten to zero on the next ordinary-looking request. A recently flagged browser can therefore retain that signal until the cookie expires or is cleared.

### What happens to bots?

Bot classification does not block someone from browsing or ordering. Recorded bot sessions can be inspected with dashboard bot filters. The default report excludes them, and survey submissions from flagged bot sessions are ignored.

Two limits matter:

1. A sophisticated bot can avoid these signals and count as ordinary traffic.
2. A simple crawler that never executes JavaScript may produce no analytics event at all.

The bot dashboard shows **recorded, classified traffic**, not every bot HTTP request reaching the server. “Real visitors” means “visitor IDs in sessions not classified as bots,” rather than verified people.

Staff browsing the storefront is not automatically excluded from ordinary analytics. Visiting `/admin` itself is excluded from browser event tracking; the demand-ranking algorithm separately excludes staff activity.

## 6. How page visits and product views work

### `page_view`

`AnalyticsProvider` observes pathname and search-parameter changes. `trackRoute()` avoids sending the same consecutive route string twice.

- Opening a page creates a page view when the browser observer runs.
- Client-side navigation creates another page view.
- A → B → A counts as three route views.
- Refreshing loads a new browser module instance and can produce a new view.
- A changed query string can produce another view, but the stored `page_path` strips the query and hash.
- Hash-only section jumps are not separately observed as route views.

Admin, auth, and API path prefixes are excluded. This does not exclude every account page: storefront paths such as `/account/login` are not the `/auth` prefix.

A view means the observer saw the route. It does not require a minimum reading time, a click, or a purchase intention.

### `product_view`

The product route mounts `src/components/analytics/ProductView.tsx`. That component calls `trackProduct()` with the product slug, title, and base price, and emits a local `analytics-product-view` signal for the survey observer.

There is protection against development React StrictMode duplicates: the initial effect uses a cancellable zero-delay timer, and the client helper deduplicates the same product/session/path within one second.

A product route normally produces **both** a general `page_view` and a specific `product_view`. Product-view metrics use the second event rather than treating every page view as a perfume view.

Choosing another variant does not automatically mean another product view. The view event uses the base product context; cart events can carry the selected variant.

**Files:** `src/components/analytics/AnalyticsProvider.tsx`, `src/lib/analytics/client.ts`, `src/components/analytics/ProductView.tsx`, `src/app/[locale]/(storefront)/product/[slug]/page.tsx`.

## 7. How activity and live visitors work

### Foreground activity estimate

Every approximately 30 seconds, the provider considers sending a heartbeat. It does so when:

- the page is visible; and
- the browser has seen interaction within the last 60 seconds.

Pointer movement, pointer presses, keyboard input, and scrolling refresh the interaction timestamp. Returning to a visible tab also resets the browser activity timers and sends a heartbeat with zero added seconds.

A heartbeat updates the session; it is not inserted as an `analytics_events` row. It can renew session identity and update `last_seen_at` without inflating page-view counts.

### Why active seconds are capped

The browser normally proposes no more than 30 seconds per beat. Server input is bounded to 60 seconds. SQL also limits the increment to elapsed time since the session's previous active update.

This matters when two tabs share a session: both should not freely claim the same 30 seconds as 60 seconds of attention. Server elapsed-time capping reduces that inflation.

Active time is still approximate. Someone moving a mouse is not proof of reading; someone quietly reading beyond the idle threshold can be undercounted. Browser suspension and network failures can also lose time.

### Live visitors

The live metric counts distinct **non-bot visitor IDs** with `last_seen_at` in the last **90 seconds**.

The admin live component polls every **30 seconds** while visible. This is polling, not a WebSocket presence connection. It is expected to lag a little, and a recently departed visitor can remain live until the 90-second window passes.

**Files:** `src/components/analytics/AnalyticsProvider.tsx`, `src/components/admin/analytics/LiveAnalytics.tsx`, SQL `ingest_analytics_event` and `analytics_live` in `supabase/migration_analytics.sql`.

## 8. How cart actions are recorded

Instrumentation is centralized in `src/lib/cart.tsx`, rather than copied into every add button. Product cards, product pages, and other entry points share that cart behavior.

| Actual action | Analytics event |
| --- | --- |
| Add a product | `add_to_cart`, quantity = actual added amount |
| Increase quantity | `add_to_cart`, quantity = positive difference |
| Reduce quantity | `remove_from_cart`, quantity = amount removed |
| Remove a complete line | `remove_from_cart`, quantity = previous line quantity |
| Clear the bag | Removal events for the lines, unless clearing follows a recognized purchase |

For example, changing quantity from two to five reports an addition of three, not five. The current line cap is 20; trying to add beyond the accepted cap does not invent additional units.

Cart restoration from local storage, login synchronization, and database cart reconciliation are not deliberate adds and do not generate shopping-action events. Event emission is kept outside React state-updater callbacks to avoid development double-invocation recording the same action twice.

There are also local `analytics-cart-change` signals for survey coordination. These are browser messages, not extra database shopping events. One distinction: reducing a positive quantity from three to two records a removal event, but does not currently send the same removal-survey signal as deleting a line or reducing it to zero.

The commerce cart (`misk-cart-v1` and account cart synchronization) is separate from analytics survey snapshots. Analytics does not reconstruct or control the actual bag.

## 9. How checkout and purchases are recorded

### Checkout started means entering the page

`trackRoute()` emits `checkout_started` on entering `/checkout` or `/ar/checkout`.

It does not mean the customer completed an address, passed validation, clicked Place order, or started payment. Re-entering or refreshing checkout can generate another event; reporting groups checkout participation by session for funnel counts.

### Purchase comes from the server

The public collector refuses a browser payload claiming to be a purchase. The trusted route is:

1. `src/app/api/checkout/route.ts` validates the order and uses server-side pricing.
2. The order is created.
3. Background work calls `recordPurchase()` in `src/lib/analytics/server.ts`.
4. The function records the order UUID, server-calculated total, and purchased items.

The SQL has a unique purchase index on the order ID. Re-recording the **same order UUID** cannot create another purchase event.

That is analytics deduplication, not a promise that the business checkout API can never create two separate orders. Two distinct real order IDs are two separate analytics purchases.

### What revenue means

The site currently uses COD. A purchase event means **an order was placed**, including an order awaiting team confirmation. It does not mean the courier collected money or the parcel was delivered.

The recorded purchase total comes from the checkout quote. Product-level revenue is calculated separately from item price × units, before order discounts/shipping. These totals need not match.

Later cancellation, return, or deletion does not automatically create a negative analytics event or rewrite the original purchase history. The customer directory and ranking logic consult current order rows and use different status rules, so their numbers can differ from historical purchase-event metrics.

### Preventing a successful order from looking like cart abandonment

After success, `src/app/[locale]/(storefront)/checkout/page.tsx` calls `markPurchase()` before clearing the cart.

`markPurchase()` writes a session storage marker and dispatches `analytics-purchased`. This closes/suppresses surveys and lets cart clearing avoid recording a successful order as a customer deleting everything.

It does not itself send a financial purchase event: the server does that separately.

### Why actual orders and analytics purchases can differ

Order creation must work even if analytics fails. If cookies are unavailable, the analytics write fails, or background work is interrupted, an order can exist without a purchase event. There is no durable analytics retry queue.

For order fulfilment and reconciliation, use the actual order records. Use analytics to understand behavior and direction, with those collection limits in mind.

## 10. What abandonment actually means

There are **two separate abandonment mechanisms**.

### A. The report infers cart abandonment

For the selected date window, SQL finds sessions with an `add_to_cart` event. It then checks whether each session has **any recorded purchase**, including a purchase outside the selected window.

```text
Drop-off sessions = sessions with an add in the window
                    and no recorded purchase anywhere in that session

Abandonment rate = drop-off sessions / sessions with an add in the window × 100
```

Example: 100 sessions added something. Forty have a recorded purchase in those sessions. The inferred abandonment rate is 60%.

This is **cart abandonment**, not a dedicated checkout-only abandonment rate. It is computed when the report runs; no background job waits 30 minutes and stamps an abandoned-order record.

Important consequences:

- A shopper still deciding can temporarily look like a drop-off.
- A later recorded purchase in the same session can reduce an earlier window's drop-off total.
- Any purchase in that session rescues its product drop-offs, even if a different product was purchased.
- A purchase in a new session does not rescue the earlier session automatically.
- Missing purchase tracking can make abandonment appear higher.

For example, adding Oud A and then buying Rose B in the same session makes that session a purchaser. The current algorithm does not label Oud A as abandoned through an exact item-by-item basket reconstruction.

### B. The browser notices opportunities to ask a question

Leaving checkout, returning to an unfinished bag, removing a perfume, and long product viewing can create survey opportunities.

These triggers do not define the report's abandonment percentage. A shopper can count as an inferred drop-off without ever seeing a survey, or answer a survey and later complete an order.

## 11. How customer surveys work

**Controller and interface:** `src/components/analytics/CartAbandonmentSurvey.tsx`.

**Timing and eligibility helpers:** `src/lib/analytics/survey-policy.ts`.

**Persistence endpoint:** `src/app/api/analytics/survey/route.ts`.

The controller is mounted in `src/app/[locale]/(storefront)/layout.tsx`. It supports guests and logged-in shoppers. The delivered-order review invitation is a separate component and should not be confused with abandonment feedback.

### The six triggers

| Trigger | What the implementation observes | Scheduled delay |
| --- | --- | --- |
| `cart_return` | Return to a saved unfinished bag after at least 15 seconds away | Seven seconds on initial restoration; normally six seconds after a visibility return |
| `checkout_abandonment` | Navigate away from cart or checkout while the last known bag has items | Six seconds |
| `cart_removal` | Delete a line, reduce it to zero, or clear the bag | Seven seconds |
| `cart_exit` | Desktop pointer leaves through the top edge, with a relevant bag | 1.2 seconds |
| `cart_idle` | Coarse-pointer device sits on bag/checkout without interaction for 45 seconds | Then another 0.5 seconds |
| `product_dwell` | Remain visibly on a product for about two minutes without adding that product | Another one second after the threshold |

The trigger named `checkout_abandonment` is also used when leaving the **cart** page. Its separate `survey_type` distinguishes cart versus checkout context. Do not interpret every row with that trigger as someone completing checkout fields and then abandoning them.

### More detail on each trigger

**Return to a bag:** The browser saves the bag snapshot and when the page was hidden/left. On a later mount, a saved snapshot must be under 14 days old and show at least 15 seconds away. The visibility-return branch uses the away-time rule without repeating that initial-mount 14-day test. At display time, the current bag must still be nonempty.

**Leaving cart/checkout:** This observes route navigation. It cannot read the shopper's intention or know they will never return. Purchase markers suppress the normal successful-checkout case.

**Removal:** The controller keeps a last-known bag snapshot so it can ask about the removed perfume even when the last item is gone. Positive quantity reductions do not currently trigger this UI, even though they are tracked as removal events.

**Exit intent:** This is a desktop pointer heuristic, not knowledge of the browser close button. It applies on a shopping page, or with a current bag that has existed for over a minute. Closing a browser does not open a survey after it closes.

**Mobile idle:** Touch-style/coarse-pointer shopping uses inactivity instead of mouse exit. Pointer presses, keys, or scrolling reset the 45-second timer.

**Product dwell:** A one-second timer accumulates visible time on the same product, with a cap on each tick so background suspension cannot suddenly claim minutes. It stops being eligible if that perfume is in the bag or was added during this controller's lifetime. This visible dwell measure differs from the recent-interaction heartbeat measure.

### Guardrails against pestering people

Before displaying, the controller checks for current visibility, another open dialog, a paused checkout interaction, existing survey state, and the trigger's remaining relevance.

Frequency guards include:

| Previous state | Suppression |
| --- | --- |
| Survey already shown in this tab/session | Do not show another in that tab/session |
| Purchase marker for the current session | Do not show |
| Answered a survey recently | 12 hours |
| Purchased recently | 12 hours |
| Dismissed recently | Two hours |
| Shown recently | 30 minutes |

The browser-wide history survives page reloads through local storage. The “seen this session” marker uses session storage, which is tab scoped. Server-side, a unique constraint allows only **one answer per session**, even if another tab tries to submit too.

These are not a global cross-device frequency policy. Clearing browser storage or using a different device can bypass browser cooldown history. History is browser based rather than strictly per account.

Starting a Place order attempt pauses the prompts. The current code does not explicitly resume them immediately after a failed submission; route changes reset that flow. This is a conservative boundary that avoids interrupting checkout, but can reduce feedback opportunities after an error.

### Opportunities, shown, dismissed, and responses

These are different records:

- `survey_opportunity`: a trigger tried to schedule a prompt, before all cooldown/display checks.
- `survey_shown`: the prompt actually opened after eligibility checks.
- `survey_dismissed`: the shopper closed it without submitting.
- A survey table row: the answer was accepted by the feedback endpoint.

An opportunity may be cancelled or suppressed. Multiple opportunities do not mean multiple unique shoppers or multiple lost orders.

The dashboard's response rate uses answers associated with a shown event in the selected reporting window, divided by shown events. It does not simply divide every historical response by every opportunity.

### What is asked and saved

Choices vary by context. Product hesitation can ask about uncertainty over the scent or missing information; cart/checkout can ask about shipping, price, delivery, payment, browsing, or another reason.

The answer can include an optional comment, limited to 500 characters. The system saves the reason, trigger, context type, relevant product, bag snapshot, calculated snapshot total, and timestamp.

Comments are stored as submitted text. There is no AI interpretation or sentiment classifier.

The snapshot total is calculated from bounded submitted item values. It is useful context, **not an authoritative checkout quote**.

The endpoint rejects flagged bots and sessions with a recorded purchase. It upserts on the unique session ID with duplicates ignored: the first accepted response wins rather than being overwritten by repeated submissions.

Unlike ordinary beacon events, survey submission waits for an explicit saved response. If storage fails, the UI can show an error and let the shopper retry; it does not mark an unsaved answer as successful.

### Survey storage keys

| Browser key | Storage | Role |
| --- | --- | --- |
| `misk-survey-bag` | Local | Last bag, update time, away time, checkout context |
| `misk-survey-history` | Local | Shown/dismissed/answered/purchased timestamps |
| `analytics-survey:<session-id>` | Session | Already shown in this tab/session |
| `analytics-purchased:<session-id>` | Session | Purchase suppression marker |

## 12. How attribution and campaign links work

Attribution asks, “What recorded source brought this browser/session here?” It does not prove what caused the purchase.

A campaign link might look like:

```text
https://your-store-domain.example/product/example-perfume
  ?utm_source=instagram
  &utm_medium=paid_social
  &utm_campaign=winter_oud
```

Use one actual URL without whitespace when publishing it.

The capture supports:

- `utm_source`: platform or origin, such as Instagram.
- `utm_medium`: channel, such as paid social or email.
- `utm_campaign`: the named campaign.
- `utm_content`: useful for distinguishing creative/link variations.
- `utm_term`: an optional keyword or audience label.
- `ref`: the site's referral code parameter.
- Landing page pathname.
- External referrer hostname, when available.

Ordinary full query strings and complete referrer URLs are not stored as page paths. Attribution fields are bounded to 250 characters each, and the encoded cookie is kept within roughly 3,000 characters, including non-Latin values.

### First touch versus last touch

The first-touch cookie is set when missing. The last-touch cookie is refreshed for a qualifying campaign or external referrer, or initialized if absent. Client-side route handling also updates explicit campaign parameters.

The server attaches these objects to sessions. A session preserves its existing first touch; later ingestion can update its last touch.

In the dashboard, first/last attribution switches which session attribution object SQL uses for grouping. It chooses a source from the selected touch's source, then referrer, then the session referrer fallback, otherwise direct. Medium defaults to none when absent.

This is **session-level attribution**. Last-touch data can change as a session continues. There is no immutable per-order attribution snapshot or multi-touch credit-splitting model in these reports.

### Why “direct” can appear

The shopper may have typed the address, used a bookmark, opened a link from an app that did not provide a referrer, or arrived without campaign tags. Browser privacy restrictions can also remove context.

The ad-link builder in `src/components/admin/analytics/AnalyticsDashboard.tsx` creates same-site campaign links and supports choosing a product/page. It does not manage advertising budgets, fetch ad-platform spending, or calculate genuine advertising ROI.

## 13. How to read the dashboard metrics

### Dates

Reports use **Asia/Dubai** calendar boundaries. A chosen end date is inclusive in the interface; SQL receives the following midnight as an exclusive endpoint.

For 1–7 October, the interval is 1 October at 00:00 Dubai through just before 8 October at 00:00 Dubai. Date ranges are validated and limited to 1–366 days.

Comparison uses the immediately preceding interval of the same length. Percentage growth is `(current - previous) / previous × 100`. A positive value after a zero previous value is displayed as “New,” rather than pretending the percentage is finite.

### Core metrics

| Metric | Current definition | Important interpretation |
| --- | --- | --- |
| Viewers | Distinct visitor IDs in the report's included sessions | Browser identities, not verified humans |
| Sessions | Included session rows | A continuing session can qualify through events in the window |
| Orders in the date-range report | Purchase events in the selected period | Tracked order placements, not a reconciliation ledger |
| Revenue | Sum of purchase-event totals in the period | Placed COD order value, not settled cash |
| Conversion | Sessions with a purchase in the period / included sessions × 100 | Session based, even where UI wording refers to viewers/customers |
| Drop-offs | Sessions with an add in the period and no purchase anywhere in that session | Inferred cart abandonment |
| Abandonment rate | Drop-off sessions / sessions with an add × 100 | Not checkout-only abandonment |

The session selection includes sessions created in the range and earlier sessions with an event in the range; sessions created after the range are excluded. Some session fields, such as active time, are stored totals rather than event-by-event slices.

### The funnel

The funnel counts sessions reaching each action independently: included sessions, product-view sessions, add sessions, checkout sessions, purchase sessions.

It is not a strict ordered intersection. A shopper can enter checkout from a restored bag without a new add event in the current range. The first stage is labeled Viewers in the UI but uses session count.

Do not assume each stage is always a subset of the previous stage or interpret the shape as an exact sequence completed by the same cohort in order.

### Product metrics

| Product metric | Calculation |
| --- | --- |
| Views | Number of `product_view` events |
| Cart adds | Number of `add_to_cart` events, not total units added |
| Cart no-buy/drop-offs | Distinct adding sessions with no purchase anywhere in that session |
| Purchases/units | Sum of quantities in purchase item metadata |
| Product revenue | Sum of item price × quantity, before order discounts/shipping |
| View-to-buy conversion | Purchasing sessions for the product / product-view event count × 100 |

Example: one action adding three bottles is one add event, quantity three. A later purchase of those three contributes three product units.

The product conversion denominator is view **events**, not distinct product viewers. Missing views or restored shopping flows can produce surprising ratios; it is not a guaranteed 0–100% unique-person conversion measure.

SQL returns at most 500 product groups, initially ordered by views. Frontend filters and sorting operate within those returned rows, rather than querying an unlimited full catalog history.

### Traffic charts and bot views

Daily visitor counts use distinct visitor IDs with analytics events on each day, not exclusively page-view events. The same visitor on three days counts once in each daily column but once in a whole-period unique total.

The SQL returns daily human and bot series from the broader session pool; chart presentation chooses the appropriate series. The overall real/bot split is also computed independently of the main bot inclusion filter, so it can explain the mix rather than disappearing in Bots only mode.

A browser that has both flagged and unflagged sessions can appear in both populations. Do not assume adding every category always equals a globally deduplicated person count.

### Acquisition metrics

Sources group by session attribution. Visitors are distinct visitor IDs; customers use account ID where known, otherwise visitor ID, for purchasing sessions. Conversion remains purchasing sessions divided by sessions.

One visitor can participate in multiple source groups across sessions. Source-group totals are not necessarily additive unique-person totals. The query returns at most 500 source groups.

### Live strip versus date-range report

The live strip uses a separate SQL function:

- Live: non-bot visitors seen in the last 90 seconds.
- Total visitors: all-time distinct non-bot visitor IDs.
- Total orders: actual non-deleted order rows, rather than analytics purchase events. It does not apply a cancellation/return status exclusion there.
- Monthly conversion: current-Dubai-month tracked purchase sessions divided by non-bot sessions seen since month start.

That monthly denominator differs from the main report's session selection. Do not expect the live strip and a hand-selected month report to always match exactly.

### Customer directory

This starts from customer-role profiles, so accounts can appear even with no activity in the selected window.

- Activity counts non-bot sessions **started in the window**.
- Active seconds use those sessions' stored totals, without splitting them at midnight.
- First/last activity reflect that session cohort, not necessarily lifetime first/last activity.
- Orders/spending use actual orders created in the window, excluding deleted, cancelled, and returned orders.

This is another reason customer spending can differ from historical purchase-event revenue.

### Survey reporting

The dashboard can show trigger/context breakdowns, reasons, shown/dismissed counts, response rate, and written feedback.

The response list is limited to the latest 100 rows; the separate recent-comments list is limited to 30 written comments. Searching those displayed responses searches that returned subset. Aggregate reason counts can cover more responses than the visible list.

## 14. Admin screens, permissions, and exports

Open **Admin → Workspace → Analytics**, at `/admin/analytics`.

| Section | What it is for |
| --- | --- |
| Overview | Main KPIs and overall trend |
| Traffic | Visitor trends and recorded bot traffic |
| Products | Product views, adds, units, revenue, and drop-offs |
| Acquisition | First/last-touch sources and campaign links |
| Feedback | Survey reasons, contexts, activity, and answers |
| Customers | Account contact/activity/order data and export |

Super admins and content editors can access aggregate analytics. The orders role cannot. Only super admins can access customer data and customer exports.

These checks exist at the page/API boundary, not just by hiding navigation buttons.

The dashboard normally refreshes every 60 seconds while its tab is visible. The separate live strip refreshes every 30 seconds. Manual refresh is available. Requests use abort handling to reduce stale results replacing newer selections.

Charts are dynamically loaded on the admin side. A chart library is not required for storefront event capture.

### Customer CSV export

The super-admin export includes matching customer pages, not merely the first visible page of 100 rows. The endpoint reads batches of up to 500 and streams UTF-8 CSV with a BOM so Excel can recognize text encoding.

It respects selected dates, search, and promotion-preference filtering. Fields include contact/saved-address details, email preferences, sessions, active time, first/last activity, order count, and spending.

It does not export passwords, auth tokens, or arbitrary authentication metadata. Values that look like spreadsheet formulas are escaped. Export activity is recorded in the admin audit log.

Aggregate product/source table exports are a different feature: the browser exports the currently available table rows, subject to the SQL result limits.

**Main files:**

- `src/app/admin/analytics/[[...section]]/page.tsx`
- `src/components/admin/analytics/AnalyticsDashboard.tsx`
- `src/components/admin/analytics/AnalyticsCharts.tsx`
- `src/components/admin/analytics/SurveyFeedback.tsx`
- `src/components/admin/analytics/LiveAnalytics.tsx`
- `src/app/api/admin/analytics/route.ts`
- `src/app/api/admin/analytics/export/route.ts`
- `src/lib/admin-auth.ts`

## 15. Database tables and functions

The main migration is `supabase/migration_analytics.sql`.

### `analytics_sessions`

One row per session UUID. Important fields:

- `id`, `visitor_id`, and optional authenticated `user_id`.
- `is_bot` and `bot_reason`.
- First/last-touch attribution JSON.
- Referrer domain, device type, and optional country.
- Created, last-seen, last-active timestamps, and active seconds.

Device classification is a basic user-agent rule: tablet terms first, mobile terms second, otherwise desktop. Country comes from hosting headers such as `x-vercel-ip-country` or `cf-ipcountry`; without them it can be null. The app does not run its own IP geolocation database.

### `analytics_events`

One row per persisted event UUID. It links to a session and stores event type, path, product context, quantity, optional purchase order/revenue, metadata, and timestamp.

The known types are:

```text
page_view
product_view
add_to_cart
remove_from_cart
checkout_started
purchase
survey_opportunity
survey_shown
survey_dismissed
```

Heartbeat updates are not stored as event rows. Purchase items live in purchase-event metadata, enabling product summaries without trusting browser financial claims.

### `analytics_abandonment_surveys`

Stores submitted feedback: reason, optional comment, type, trigger, relevant product, cart snapshot/total, and creation time. `session_id` is unique, allowing one accepted response per session.

Deleting a session cascades to its events and survey. Deleting an auth user sets the session's user reference to null; it does not automatically erase all anonymous analytics history.

### SQL functions

| Function | Responsibility |
| --- | --- |
| `ingest_analytics_event` | Transactional session upsert, active-time caps, bot flag persistence, event validation/deduplication, per-session event cap |
| `analytics_report` | Main date-range KPIs, daily series, products, acquisition, funnel, bot and survey summaries |
| `analytics_dashboard` | Current report plus optional previous equal-length report |
| `analytics_live` | Live strip and all-time/current-month figures |
| `analytics_customers` | Paginated customer directory, account orders/spending, activity, and search/preference filters |

Events have a primary-key deduplication rule, and purchase order IDs have an additional unique index. Common session/time/type/product indexes support joins and aggregation without needing to download raw tables into the browser.

The collector allows up to 120 non-purchase events per session per minute. Beyond that, the session can still be updated but extra events are not inserted. Purchases are exempt. This is not an IP firewall: a determined sender can rotate session IDs.

Tables use RLS and ordinary anonymous/authenticated clients do not have analytics-table grants. The functions are privileged server operations, restricted to the service role. Admin HTTP routes enforce the actual staff permissions before asking the database for reports.

`supabase/migration_survey_experience.sql` upgrades existing installations with the richer survey reasons/context/reporting. Fresh installs should use the current migrations; a newer source file does not automatically update an already-deployed database function.

## 16. How analytics influences best sellers

Reporting and product ranking share some inputs, but ranking has a separate scoring algorithm.

**Files:** `src/lib/demand-ranking.ts`, `supabase/migration_demand_ranking.sql`.

The algorithm uses the last 30 days, weighting recent demand more heavily with a seven-day half-life. Approximate engagement weights are:

| Signal | Base contribution |
| --- | --- |
| Product viewed | 0.5 |
| Added to cart | 1.5 |
| Reached checkout with product intent | 2 |
| Valid order containing the product | 6 for one unit, 7.5 for two, 9 for three or more |

Engagement contributions are deduplicated per visitor/product/day to reduce repeated-refresh influence. Checkout intent requires an add followed by checkout within a day in the same session, without an intervening removal.

Orders are read from actual order/order-item rows, allowing valid purchases to influence ranking even if analytics cookies were unavailable. Deleted, cancelled, returned, and staff orders are excluded; bot and staff engagement is also excluded.

Qualification requires a score of at least five **and** either three distinct engaged visitors or at least two orders. The score threshold still applies to the two-order route. Ranking targets the top 15% of active products, with a minimum of one and up to eight new ranked positions.

Existing automatic winners have a retention margin around the cutoff to prevent constant tag flickering. Pinned products and retained previous winners can mean total tagged products are not a strict maximum of eight.

Modes are:

- `auto`: let demand determine the tag.
- `pinned`: preserve the admin's chosen best-seller status.
- `excluded`: keep the product out of automatic best sellers.

The job updates database score/automatic/tag fields and records effective automatic tag changes in the audit log. Merely updating a score does not create an audit entry every time.

Refresh attempts follow relevant non-bot activity and purchase recording. A database lock/throttle allows a refresh roughly once per five minutes across server instances. This is traffic driven, not a promise of an independent cron job running exactly every five minutes.

Ranking can disagree with dashboard purchase revenue because it uses current valid orders, its own decay/deduplication, and staff exclusions. That difference is intentional in the implementation.

## 17. Privacy, security, performance, and reliability

### What the analytics tables do not collect

There is no analytics field for raw IP addresses, a video recording of the screen, keystroke contents, DOM replay, arbitrary click maps, or scroll heatmaps.

The browser listens for interaction to update a timestamp, not to save what someone typed. This describes the analytics tables; hosting infrastructure can have its own request logs.

Paths and landing pages exclude ordinary query strings. External referrers are stored as hostnames. However, campaign fields and free-text survey comments can contain whatever someone puts in them; there is no automatic personal-information redactor.

Customer exports deliberately contain contact information and are restricted to super admins.

### Current consent/retention behavior

The current storefront does not mount an analytics consent or analytics opt-out gate. Promotion-email preferences are separate and do not turn analytics off.

The analytics migration does not schedule automatic retention deletion. History remains until explicitly removed. Account deletion alone does not delete the associated anonymous session/event history.

These are descriptions of the current implementation, rather than claims about a particular legal compliance standard.

### Security boundaries

- Public keys and cookie IDs are not admin privileges.
- Service-role credentials remain in server-only Supabase helpers.
- The server verifies account identity and role independently of browser claims.
- The public collector cannot create trusted purchases through its normal API.
- Payload limits, field bounds, origin checks, and the SQL event cap reduce accidental/malicious noise.
- CSV formula escaping reduces spreadsheet injection risk when opening exports.

These measures do not make arbitrary browser behavior tamperproof. The origin helper allows requests without an Origin header, and a custom HTTP client can imitate ordinary inputs. Neither cookies nor the bot heuristic are a substitute for authentication or checkout validation.

### Why it is reasonably lightweight

- No large third-party analytics SDK is loaded for storefront capture.
- Browser events are small and do not require a visible widget to mount.
- Ordinary tracking does not wait for the database before allowing interaction.
- Heartbeats run periodically rather than on every mouse movement.
- Mouse/scroll listeners mainly update in-memory timestamps.
- Reporting aggregation happens in PostgreSQL.
- Charts load in admin, not as part of shopper tracking.

Tracking still costs browser work, network requests, server work, and database storage. It is lightweight, not free.

### Failure behavior

Collection is best effort. Storage restrictions, blockers, page termination, network problems, missing migrations, or background exceptions can lose events. Many failures are intentionally swallowed to protect the storefront, which means “no console error” does not prove complete data.

Event and purchase uniqueness prevent certain duplicates; they do not provide delivery guarantees. There is no durable outbox, replay queue, or automated historical reconciliation from orders into missing session-linked purchase events.

## 18. An example customer journey

Imagine a guest arriving from an Instagram winter campaign:

1. The proxy creates visitor V1 and session S1, and captures the campaign.
2. The browser records a home page view.
3. The guest opens Oud A. That creates a page view and product view.
4. They add two units. The cart records one add event with quantity two.
5. They enter checkout. The route observer records checkout started.
6. They leave checkout for another page. A feedback opportunity is scheduled, subject to cooldowns.
7. They answer “Delivery time.” One survey row is saved with checkout context and a bag snapshot.
8. They log in. Later tracking associates S1 with the verified account.
9. They return and place the order. The server records a purchase with the real quote total.
10. Browser purchase markers suppress further abandonment prompts and prevent cart clearing looking like a deliberate removal.

What do we conclude?

- One visitor ID participated in this session.
- The perfume had one product view and one add action, involving two units.
- The customer reached checkout and told us delivery time was a concern.
- Their session ultimately purchased, so it is no longer a cart drop-off under the report's rule.
- Revenue is the placed order amount, even while the team has not confirmed it.
- The survey remains useful feedback; purchasing later does not mean the earlier concern was imaginary.

If they returned after session expiry, the purchase could belong to S2. S1 could remain a drop-off even though the same browser eventually bought. Session-based reporting is deliberately simpler than full cross-session journey attribution.

## 19. Code map and where to make changes

### Storefront capture

| File | Responsibility |
| --- | --- |
| `src/app/layout.tsx` | Mount global analytics observer |
| `src/proxy.ts` | Request matching, locale/auth flow, analytics-cookie integration |
| `src/lib/analytics/proxy.ts` | Initial cookies and server-side acquisition capture |
| `src/components/analytics/AnalyticsProvider.tsx` | Route observation, heartbeats, interaction/visibility, auth session changes |
| `src/lib/analytics/client.ts` | Browser identity, bot signals, event transport, view deduplication, purchase markers |
| `src/lib/analytics/shared.ts` | Event types, payload types, bot UA rules, attribution cleaning, safe paths, CSV escaping |
| `src/components/analytics/ProductView.tsx` | Product-view effect and local product signal |
| `src/lib/cart.tsx` | Actual cart action events and local survey coordination |
| `src/app/[locale]/(storefront)/checkout/page.tsx` | Checkout-attempt/purchase browser signals |
| `src/app/[locale]/(storefront)/layout.tsx` | Mount survey controller in storefront providers |

### Server ingestion and purchases

| File | Responsibility |
| --- | --- |
| `src/app/api/analytics/collect/route.ts` | Public event validation and background ingest |
| `src/lib/analytics/server.ts` | Trusted session context, body/origin helpers, server purchase recording |
| `src/app/api/checkout/route.ts` | Real order creation and scheduling purchase tracking |
| `src/lib/pricing.ts` | Server order/quote pricing; analytics does not replace it |
| `src/lib/supabase/service.ts` | Privileged server database client |
| `src/lib/supabase/server.ts` | Server session-aware Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase/auth client |

### Surveys

| File | Responsibility |
| --- | --- |
| `src/components/analytics/CartAbandonmentSurvey.tsx` | Triggers, snapshots, prompt design, submission, browser cooldown history |
| `src/lib/analytics/survey-policy.ts` | Trigger types, eligibility windows, route helpers, labels |
| `src/app/api/analytics/survey/route.ts` | Validate/store one response per session |
| `supabase/migration_survey_experience.sql` | Upgrade older survey schema/reporting |

### Reporting and admin

| File | Responsibility |
| --- | --- |
| `src/app/admin/analytics/[[...section]]/page.tsx` | Authorized analytics page routing |
| `src/components/admin/analytics/AnalyticsDashboard.tsx` | Controls, refresh, tables, campaign builder, visible-row exports |
| `src/components/admin/analytics/AnalyticsCharts.tsx` | Recharts visualization components |
| `src/components/admin/analytics/SurveyFeedback.tsx` | Survey reporting UI and response search |
| `src/components/admin/analytics/LiveAnalytics.tsx` | Live strip polling/rendering |
| `src/components/admin/admin-nav.tsx` | Analytics links and admin placement |
| `src/lib/analytics/dashboard.ts` | Report contracts, sections/reason labels, Dubai date validation |
| `src/app/api/admin/analytics/route.ts` | Authorized report/live/customer API |
| `src/app/api/admin/analytics/export/route.ts` | Authorized paginated customer CSV stream |
| `src/lib/admin-auth.ts` | Server-side staff identity/permission checks |
| `src/lib/audit.ts` | Audit logging, including sensitive exports |
| `supabase/migration_analytics.sql` | Analytics tables, security, indexes, ingestion/reporting functions |

### Ranking and existing documentation

| File | Responsibility |
| --- | --- |
| `src/lib/demand-ranking.ts` | Refresh orchestration and storefront freshness |
| `supabase/migration_demand_ranking.sql` | Demand scoring and automatic database tag updates |
| `ANALYTICS_SETUP.md` | Installation, operational notes, and verification commands |
| `tests/analytics.test.cjs` | Browser-helper/policy and implementation regression checks |
| `tests/analytics-sql.test.cjs` | Actual SQL aggregation/access regression tests |

### “If I want to change X, where do I start?”

| Desired change | Starting points |
| --- | --- |
| Recognize another bot signature | `shared.ts` bot reason helper; browser checks in `client.ts` |
| Change session lifetime | Both analytics proxy and client cookie handling; keep them consistent |
| Change active-time behavior | `AnalyticsProvider.tsx` and SQL elapsed-time guards |
| Track another event | Shared types, producer, collector allowlist/metadata, SQL event constraint and reports |
| Change what abandonment means | SQL `analytics_report`, not just survey wording |
| Change prompt delays | Survey controller; eligibility cooldowns live in survey policy |
| Add a survey reason | Policy/UI labels, endpoint allowlist, SQL reason constraint, upgrade migration |
| Change conversion formula | SQL report/live functions and corresponding UI labels |
| Add campaign capture fields | Shared attribution contract/cleaner, proxy/client capture, SQL grouping, admin display |
| Change rankings | Ranking SQL, refresh helper, tag-mode/admin expectations |
| Add retention | A deliberate database cleanup/scheduling policy; none exists by default |

For SQL changes on an existing project, add/apply an appropriate migration. Editing a local SQL file alone does not update deployed functions.

## 20. How to inspect and troubleshoot the system

### A safe manual inspection

1. Open DevTools → Application/Storage → Cookies. Check `_av_id`, `_as_id`, and attribution cookies.
2. In Network, filter for `/api/analytics/collect`.
3. Navigate to a product and add it once. Inspect the event types and quantities.
4. Remember that beacon requests may appear as ping/beacon traffic rather than ordinary fetch entries.
5. Open admin analytics and refresh with the correct Dubai date range.
6. If testing with browser automation or Lighthouse, inspect Bots only/Include bots as well.

Do not make a real order just to test purchase tracking unless you intend to create that order. Local SQL tests can verify many rules without creating live commerce data.

### Read-only database checks

These queries are intended for the owner's Supabase SQL editor. They only read data and do not require making analytics tables publicly accessible.

Recent event types:

```sql
select event_type, count(*) as events
from public.analytics_events
where created_at >= now() - interval '24 hours'
group by event_type
order by events desc;
```

Recent session classifications:

```sql
select is_bot, coalesce(bot_reason, 'not flagged') as reason,
       count(*) as sessions
from public.analytics_sessions
where created_at >= now() - interval '24 hours'
group by is_bot, bot_reason
order by sessions desc;
```

Recent recorded shopping events, without account contact details:

```sql
select e.created_at, e.event_type, e.page_path, e.product_id,
       e.quantity, e.order_id, e.revenue, s.is_bot
from public.analytics_events e
join public.analytics_sessions s on s.id = e.session_id
order by e.created_at desc
limit 50;
```

Survey context counts:

```sql
select survey_type, trigger, reason, count(*) as responses
from public.analytics_abandonment_surveys
group by survey_type, trigger, reason
order by responses desc;
```

### Common questions

**“I see 204, but nothing appears.”** The response does not acknowledge a database write. Check cookies, installed migrations, bot/date filters, server configuration, and the underlying rows. Silent background errors are possible.

**“My test is missing from real visitors.”** Headless/webdriver tools and performance tests can be classified as bots. Check the bot views. A non-JavaScript HTTP request alone does not produce a page-view event.

**“Why is the survey not appearing?”** Check the cooldowns, per-tab seen marker, purchase history, hidden-tab state, other dialogs, current bag/product eligibility, and pending checkout pause. An opportunity event can exist without an actual shown prompt.

**“Why do orders and analytics revenue disagree?”** Check actual orders versus tracked purchase events, COD placement versus final order status, missing analytics sessions, product subtotal versus discounted order total, and the selected date basis.

**“Why did abandonment change for an old day?”** The report checks for purchases anywhere in those sessions. A later recorded purchase can change the earlier cohort's no-purchase classification.

**“Why do daily visitors add up to more than the period total?”** Daily counts deduplicate within each day. The period total deduplicates across the whole period.

**“Why did a best-seller tag change without an admin editing it?”** Demand ranking can update automatic tags and logs effective changes. Check ranking mode and the audit log.

### Repository verification

See `ANALYTICS_SETUP.md` for existing test/build commands and optional PGlite setup. `tests/analytics-sql.test.cjs` exercises database behavior in a disposable local environment.

This guide was produced by reading code and SQL. It is not a claim that a live order was placed or production analytics was queried during documentation.

## 21. Current boundaries and possible future additions

The current system provides useful first-party behavioral reporting without an external analytics vendor. Its limits are part of understanding its data:

- Bot classification is heuristic, not proof of humanity.
- Browser IDs are not unique-person identities.
- Events are best effort, without guaranteed delivery.
- Checkout started means page entry.
- Abandonment is a session-based inference, not an exact permanent decision.
- Feedback is a self-selected respondent sample, not everyone's explanation.
- Revenue is order placement value, without automatic cancellation/refund reconciliation.
- Attribution is session/cookie based, without advertising spend or causal proof.
- Visible tables and feedback lists have result limits.
- No automatic retention or analytics consent/opt-out gate is currently implemented.

If requirements grow, possible separate projects include a durable event outbox, reconciled order-lifecycle revenue, an explicitly ordered checkout funnel, cross-session conversion attribution, stronger abuse controls, a managed retention policy, and deeper survey segmentation.

Those are potential additions, not features this guide claims are already present.
