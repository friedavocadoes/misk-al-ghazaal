# WhatsApp — final order workflow

Updated 28 October 2026. This supersedes the original placement-receipt flow. Promotion development is on hold; existing campaigns are retained without expansion.

## Workflow and migration

Customers receive no email or WhatsApp when placing an order, including staff-created orders. Checkout still records optional WhatsApp permission. The order-received screen/private order page remain available. New orders instead queue a Telegram alert for the shop; read NOTIFICATION_SETUP.md.

At confirmation, staff have separate Email and WhatsApp checkboxes, initially checked when permitted by master settings/customer consent. Later status or tracking changes use the same choices. Tracking-only edits can notify. Payment/staff-note edits alone do not notify; returning to `new` never sends a customer message. Consent/STOP and real cancelled/returned statuses remain enforced.

Apply `supabase/migration_whatsapp.sql` if not already applied, then **`supabase/migration_notification_control.sql`**. Re-run in that order if needed. Do not re-run only the old migration afterward: it contains the historical placement-trigger definition. The upgrade stops placement queueing, suppresses old pending placement receipts, and adds tracking revisions/master controls/Telegram alerts.

## Callback registration

```text
Callback URL: https://www.miskalghazaalperfumes.com/api/whatsapp/webhook
Verify token: the WHATSAPP_WEBHOOK_VERIFY_TOKEN server environment value
```

A random Verify token was saved in local `.env`. Set the same value in production and Meta. It is visible to super admins under **Admin → Setup → Notifications → WhatsApp webhook**. Do not put the outbound access token or App Secret in the Verify token field.

1. Deploy the route/environment before Verify and save. Meta cannot reach localhost; development needs public HTTPS or a deployed callback.
2. Matching GET `hub.mode=subscribe` / `hub.verify_token` echoes `hub.challenge` with HTTP200; a mismatch returns403.
3. Subscribe the app/WABA to the **messages** webhook field.
4. Finish app publication/production requirements: your dashboard warns unpublished apps may receive only dashboard test callbacks.
5. Leave the optional client-certificate switch off. POST verification uses `X-Hub-Signature-256`, HMAC-SHA256 over the request body with the App Secret. Only the configured Phone Number ID is processed.

The callback handles sent/delivered/read/failed and STOP. STOP event IDs are deduplicated; ordinary message bodies are not retained. It is not a live-chat inbox. Read receipts depend on recipient settings.

Latest documentation entry points: [Meta WhatsApp webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview), [Graph webhook setup](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/). These pages returned HTTP429 to the documentation reader during this update; a complete latest-page review was unavailable. The verification/signature contract is also in [Meta's hosted reference](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/). That SDK is archived and is not installed or used; this sender calls Graph directly.

## Credentials

Meta for Developers → your app → WhatsApp → API Setup (or corresponding use-case setup):

- **Phone Number ID:** numeric sending-number ID, not the phone number/WABA/app ID.
- **Testing token:** only for the development number and allowed recipients shown by Meta.
- **Production token:** Business Settings → Users → System Users. Assign app/WhatsApp assets; generate a token with `whatsapp_business_messaging`. Management operations may need `whatsapp_business_management`. Record the actual expiry offered; tokens can also be revoked.
- **App Secret:** App Settings → Basic, for webhook signatures.
- **Graph version:** copy a supported `vXX.X` from Meta's current example; replace the placeholder.

Complete number registration, billing and production eligibility shown by Meta. A WABA ID environment field is not needed by this sender; templates are created in WhatsApp Manager.

## Three approved Utility templates

Use positional variables, the exact language code, a text body and no runtime-variable header/buttons. Meta approves/classifies templates externally. Supply dummy samples, never real private order links.

**Confirmation — `misk_order_confirmed`:**

```text
Hello {{1}}, thank you for ordering with Misk Al Ghazaal.
Your order {{2}} is confirmed. We are preparing it with care.
View your order: {{3}}
Reply STOP to stop WhatsApp updates.
```

Variables: name, reference, full private order URL.

**Tracking — `misk_order_tracking`:**

```text
Hello {{1}}, here is a delivery update for order {{2}}.
Status: {{3}}
Tracking number: {{4}}
Track your parcel: {{5}}
View your order: {{6}}
Reply STOP to stop WhatsApp updates.
```

Variables: name, reference, status, tracking number, courier URL, private order URL. Selected when tracking exists, including a tracking-only edit, except cancelled/returned orders.

Max Express defaults to `https://maxexuae.com/tracking/`; customers may need to paste the supplied number into its form. Another carrier's saved URL may contain `{tracking}` for direct substitution. Automatic cross-site pasting is not promised without carrier support.

**Other updates — `misk_order_update`:**

```text
Hello {{1}}, your Misk Al Ghazaal order {{2}} has an update.
Status: {{3}}
View your order and details: {{4}}
Reply STOP to stop WhatsApp updates.
```

Variables: name, reference, actual status, private order URL. Cancellation/return uses this even with old tracking. **The earlier six-variable generic template is incompatible with this four-variable template.** Approve/update templates before enabling the revised sender.

## Environment

```dotenv
WHATSAPP_ENABLED=0
WHATSAPP_ACCESS_TOKEN=YOUR_SYSTEM_USER_TOKEN
WHATSAPP_PHONE_NUMBER_ID=YOUR_NUMERIC_PHONE_NUMBER_ID
WHATSAPP_API_VERSION=vXX.X
WHATSAPP_CONFIRMATION_TEMPLATE=misk_order_confirmed
WHATSAPP_TRACKING_TEMPLATE=misk_order_tracking
WHATSAPP_ORDER_TEMPLATE=misk_order_update
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_APP_SECRET=YOUR_APP_SECRET
WHATSAPP_WEBHOOK_VERIFY_TOKEN=THE_SAME_RANDOM_TOKEN_AS_META
CRON_SECRET=YOUR_SCHEDULER_SECRET
NEXT_PUBLIC_SITE_URL=https://www.miskalghazaalperfumes.com
```

Match the approved language (`en` differs from `en_US`). Credentials stay server-only, never `NEXT_PUBLIC_`. Restart/redeploy after changes. Enable sending only after migrations/templates/callback are ready. Missing template configuration gets bounded preparation retries rather than an incorrectly shaped send.

## Persistent worker

Schedule one authenticated GET every minute:

```text
https://www.miskalghazaalperfumes.com/api/notifications/process
Authorization: Bearer YOUR_CRON_SECRET
```

It drains WhatsApp/Telegram independently. `/api/whatsapp/process` remains a compatibility alias; schedule one path, not both. No live schedule is installed by this change. Use a scheduler with secret headers or [Supabase Cron](https://supabase.com/docs/guides/cron), checking plan limits. Never put the secret in the URL.

Immediate after-response batches improve latency; a persistent schedule is required for serverless recovery. WhatsApp claims5 via SKIP LOCKED, prioritizes orders, deduplicates revisions, and rechecks consent/current state. Rate-limit/preparation failures have bounded retries. Ambiguous network/5xx/crash results become unknown without blind resends. Accepted is not delivered; signed callbacks may resolve it later through an opaque job ID.

## Costs and limitations

Check [Meta's live selector](https://business.whatsapp.com/products/platform-pricing) for UAE rates/exemptions. Direct Cloud API avoids an intermediary subscription, but applicable Meta charges remain. A website order does not open a WhatsApp service window; do not assume unlimited free alerts.

No contact-existence lookup is used: formatting is checked and delivery recorded. Undeliverable131026 does not conclusively mean “not registered”; numbers are not permanently blacklisted. Supplied-number consent is not an OTP ownership check. Email/order pages remain independent of WhatsApp. Promotions stay on hold.

No live messages were sent during implementation. Real delivery requires credentials, deployment, approved templates and your own recipient.
