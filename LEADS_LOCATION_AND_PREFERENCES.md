# Leads, communication preferences and visitor location

Updated 29 October 2026. No live subscriptions, campaign sends or customer records were changed during development. A read-only audit of the latest19 analytics sessions found8 US sessions (6 marked bots),5 Malaysia sessions (1 marked bot),1 UAE session and5 unknown. Those countries came from Vercel metadata; they are not evidence of a person's physical location or proof that unflagged sessions are human.

## Deployment

Apply these after existing WhatsApp, notification-control, analytics-location and paid-feedback migrations:

1. `supabase/migration_leads_preferences.sql`
2. `supabase/migration_analytics_city_filter.sql`

Keep this migration order. The leads migration replaces the WhatsApp consent helper and adds persistent per-channel opt-outs; do not reapply older WhatsApp definitions alone afterward.

Set **`COMMUNICATION_PREFERENCES_SECRET`** to a long random server-only value in production. A random key was generated locally in ignored `.env`; copy it through your normal secure environment setup. It hashes newsletter rate-limit identities and IP cache keys; it is never shown in HTML or logs. Preference URLs use random database tokens, so key rotation does not invalidate existing preference links. Keep `NEXT_PUBLIC_SITE_URL` set to the real HTTPS production origin for email links.

Keep one authenticated every-minute schedule for `/api/notifications/process` with `Authorization: Bearer CRON_SECRET`. It now drains email campaigns as well as WhatsApp/Telegram; the old WhatsApp worker path remains an alias. No live schedule was installed. Missing lead tables/configuration disable newsletter capture; promotional mail is not sent without a working preference link and current permission.

## Visitor location

`src/lib/analytics/ip-location.ts` runs inside the existing after-response analytics collector, not in the browser's rendering path:

- Vercel's platform-owned original visitor-IP header is trusted only on Vercel (`VERCEL=1`). Vercel location headers remain the fallback.
- Outside Vercel, opt into a known proxy explicitly: `ANALYTICS_TRUST_PROXY=cloudflare` for Cloudflare-overwritten headers, or `custom` for an infrastructure-overwritten `x-real-ip`. Do not enable either behind an untrusted/publicly bypassable proxy. Local/untrusted header sets produce Unknown, rather than trusting spoofed country text.
- A valid public visitor IP is looked up through HTTPS at IPWhois. Private/reserved/local addresses are skipped. The lookup always supplies the visitor IP; the server's own IP is never intentionally geolocated.
- Successful results cache24h by HMAC of IP in a private table. Raw IP is sent to the lookup service, but is not stored in application analytics/cache tables or logged. In-flight/failure leases avoid repeated lookups. SQL caps new lookup attempts at950/day across this project. Timeout1500ms or provider/quota failure falls back to platform metadata. `ANALYTICS_IP_LOOKUP=0` disables external lookup.
- Source is visible in Recent visit locations. There is no GPS collection or claim of exact addresses. VPNs, proxies/mobile gateways and provider inaccuracies can still produce a different country/city. Free geolocation does not prove someone is a real shopper.

[IPWhois documentation](https://ipwhois.io/documentation) currently allows commercial use of its free endpoint at1,000 requests/day without an API key; it has no uptime guarantee. This code uses that free endpoint only, with no automatic paid upgrade. [Vercel's header definitions](https://github.com/vercel/vercel/blob/main/packages/functions/src/headers.ts) distinguish original-client city/country from deployment/edge location.

Admin → Analytics → **Countries & cities** now has a country selector and a city selector built from actual non-null cities recorded in the selected date/bot/country scope. Selecting a city sets its country, so same-named cities in different countries do not collide. There is no global emirate dropdown. Existing UAE region data remains available in location details. Page views, session conversion and paid-only revenue retain their previous meaning. Historical locations are not guessed/relabelled; no historical raw IP exists to recheck them.

## Central lead directory

Admin → Emails → **Customers, leads & CSV imports** (`/admin/leads`, super-admin only).

One case-normalized email has one lead ID and stable private preference token. Multiple source tags can coexist:

| Source | Capture |
| --- | --- |
| Registered account | Existing/new customer profiles; their existing marketing choice is retained |
| Guest buyer | Existing non-binned guest orders and future guest checkouts, with supplied email/phone/name/location |
| Newsletter signup | Footer's email → name form, after final submission |
| Manual / CSV | Explicit staff import |

Registered purchases also fill missing lead contact fields. Guest purchases alone do not subscribe an address to marketing. A newsletter signup records permission for email offers. Public signup requests never return a preference token or disclose whether an address already exists. Newsletter requests have atomic per-address/per-sender limits; trusted visitor IP is hashed for the sender limit, with an HttpOnly anonymous-cookie fallback when no trusted IP is available. Previously unsubscribed addresses retain their choices on a repeated public signup.

The directory shows source tags, email marketing state, mandatory order-email state, WhatsApp order/offer state and a link to the same communication dashboard. Staff can opt out a lead from email marketing. Admin reads/actions are protected, and changes/imports are audited. Backfills exclude staff profiles; existing account opt-outs remain off. Sources retain history: a guest can later register without a second email recipient. Account-only campaigns require a current registered account; guest-buyer campaigns exclude current registered accounts. Newsletter/manual source audiences may overlap the other history tags.

### CSV

Download the template from the directory, fill it and upload it there. Columns:

```csv
email,name,location,phone,marketing_consent
```

Use international phone numbers as text (for example +971…). `marketing_consent=yes` or `true` means you have permission; `no`, `false` or blank imports without subscribing. Staff must affirm permission before importing rows marked yes. Imports do not reverse an unsubscribe. Existing names/location/phone can be updated by an authorized import; sources merge and the preference token stays stable.

Limit:1,000 rows/file,2MB. The Server Action request cap is2MiB to accommodate the file plus multipart overhead. UTF-8/BOM, quoted commas, escaped quotes and embedded newlines are handled. Every row is validated before the transactional database import, so an invalid row does not leave a half-import. The CSV template endpoint is staff-restricted and contains no existing customer data.

## Preferences without login

Customer welcome/order/promo email includes **Unsubscribe from offers / manage email and WhatsApp preferences**, linking to `/preferences/<opaque-token>`. No login/email typing is needed. GET merely displays choices; explicit Save persists them. Mandatory order confirmation/delivery email stays checked and disabled with an explanation; customers cannot disable it through the account form or guest API. Staff master email controls still take precedence.

Email offers, WhatsApp order updates and WhatsApp offers are independently adjustable. Phone-only guests have a phone-scoped preference token, linked from their private order page, which is already in the WhatsApp order message. No email or account is required for that route. Missing phone means WhatsApp controls are unavailable rather than modifying an arbitrary number.

Promotion messages also include RFC8058 one-click List-Unsubscribe headers. Its POST disables only promotional email; GET/link scanners never unsubscribe. Email/provider opt-outs synchronize account promo flags and immediately affect future recipient checks. Auth verification/reset email remains managed by Supabase, independent of promotional preferences.

The checkout WhatsApp checkbox is now preselected and says only that updates will be sent to the mobile number. STOP instructions were removed from checkout text. Backend STOP handling is retained. Saved per-channel opt-outs persist: a default-checked later checkout cannot silently reactivate WhatsApp after an explicit opt-out. The recipient can explicitly re-enable it through their preference dashboard/account. These permissions describe supplied numbers, not an OTP ownership check.

Preference routes are dynamic/private/no-store/noindex/no-referrer, excluded from sitemap and from application analytics/attribution. Tokens are private capabilities: only share links with trusted people. Token holders can manage only the email/phone associated with that token; APIs never accept a replacement target email/phone from the request body. An email-scoped dashboard uses the linked account WhatsApp number when present, otherwise its supplied lead phone. A phone-scoped dashboard exposes no email preferences.

## Email campaign audiences and queue

Existing/new campaigns default to Registered accounts. Guest-buyer audience means buyers who still have no registered account. Save a draft's **Audience** to choose all marketing subscribers, account, guest buyer, newsletter or manual. This changes both the count and actual dispatch. A contact with several source tags receives one email per campaign. Draft changes must be saved before queueing; invalid sources never widen to all recipients.

Queueing is atomic and locks the campaign. It snapshots eligible lead IDs once, with one delivery per campaign/lead. Queued content/audience cannot be edited through stale requests. The admin returns promptly and shows progress; the worker continues without that page remaining open. Current consent is checked again before every actual SMTP send, including unsubscribes after queueing. Global/category master switches can pause pending sends. No production campaign was queued during tests.

The worker claims3 deliveries with SKIP LOCKED and sends the batch concurrently using the existing SMTP settings. Configure the schedule to drain the queue within your mailbox/hosting limits. Pending/sending/sent/skipped/unknown states appear in progress. SMTP errors/timeouts can be ambiguous, so unsuccessful attempted sends are not blindly retried; inspect mailbox logs before recovery. Sending leases interrupted beyond2min become unknown. Completed dispatch is stored as the existing sent status even if some recipients skipped or had unknown outcomes; the delivered/unknown breakdown is the meaningful result. Sent means SMTP acceptance, not inbox placement or a read receipt.

Deleting a queued campaign cancels its pending rows; in-flight mail cannot be recalled. SMTP credentials/master settings are checked before claiming; a paused/unconfigured sender retains pending work. No external email service or paid plan was added. WhatsApp promotion features were not expanded.

## Code map

- `supabase/migration_leads_preferences.sql`: lead merge/triggers, consent/tokens, import, newsletter throttling, persistent WhatsApp opt-outs, email queue and IP cache/budget.
- `supabase/migration_analytics_city_filter.sql`: visited-city choices and scoped metrics, preserving paid-only revenue.
- `src/lib/analytics/ip-location.ts`: trusted original-IP extraction, validation/cache/lookup.
- `src/app/api/newsletter/route.ts`, `components/blocks/NewsletterSection.tsx`: durable newsletter capture and two-step UI.
- `src/lib/leads.ts`, `/preferences/[token]`, `/api/preferences/[token]`: guest communication capabilities.
- `src/app/admin/leads/page.tsx`, `src/lib/lead-csv.ts`: staff directory/import and parsing.
- `src/lib/email-campaigns.ts`, `src/app/admin/promo/[id]/page.tsx`: audience queue/progress and worker.
- `src/lib/mailer.ts`: real preference footer, List-Unsubscribe and final per-recipient permission check.
- `tests/leads-location-preferences.test.cjs`: disposable SQL/mocked IP/CSV/consent tests; no real messages.
