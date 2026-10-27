# System emails: settings and design map

Updated 27 October 2026. This guide describes application email code; no real test email was sent while verifying these changes.

## Compact environment settings

Every application mailbox uses the same connection:

```dotenv
SMTP_HOST=your-mail-server
SMTP_PORT=465
SMTP_SECURE=1

HELLO_SMTP_USER=hello@your-domain.com
HELLO_SMTP_PASS=your-mailbox-password
NOREPLY_SMTP_USER=noreply@your-domain.com
NOREPLY_SMTP_PASS=your-mailbox-password
PROMO_SMTP_USER=promo@your-domain.com
PROMO_SMTP_PASS=your-mailbox-password
ORDERS_SMTP_USER=orders@your-domain.com
ORDERS_SMTP_PASS=your-mailbox-password

SUPPORT_EMAIL=support@your-domain.com
```

`SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE` are shared. Separate credentials remain because these are separate mailbox logins. Each mailbox optionally accepts `<PREFIX>_SMTP_FROM`; omit it to use that mailbox's USER address. `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` remain optional single-login fallbacks.

Port 465 defaults to secure TLS. For a server configured for STARTTLS on port 587, use its required port and `SMTP_SECURE=0`. `SMTP_SECURE` accepts `1`/`true` or `0`/`false`.

The local `.env` was consolidated without exposing credentials. Update deployment environment variables to the same compact layout, then redeploy/restart. Never put mail passwords in `NEXT_PUBLIC_*` variables.

The compatibility fallback in `smtpConnectionSettings()` resolves one legacy prefixed connection for **all** mailboxes when shared values are absent. Shared settings win; mailbox-specific connection settings should be removed from deployment configuration after migration. Credentials and optional FROM addresses still vary per sender.

Unconfigured mailboxes skip sending gracefully. Connection/greeting/socket timeouts prevent an unavailable mail host hanging indefinitely.

## Where to edit the design

| File / function | What it controls |
| --- | --- |
| `src/lib/mailer.ts` → `shell()` | Shared HTML outer frame: brand header, typography, width, colours, footer and plain-text fallback |
| `src/lib/mailer.ts` → `smtpConnectionSettings()` | Shared SMTP host/port/TLS resolution |
| `src/lib/mailer.ts` → `mailboxAddress()` / `mailboxTransporter()` | Sender address, per-mailbox credentials and transport |
| `src/lib/mailer.ts` → `sendMailboxMail()` | Sending subject/HTML/text and optional attachments; all application mailboxes use this |
| `src/lib/mailer.ts` → `buildOrderEmail()` | Order confirmation/status email: customer greeting, items/images, totals, delivery, tracking and payment type |
| `src/lib/mailer.ts` → `orderStatusGraphic()` | Email-safe table-based progress graphic and per-status explanations |
| `src/lib/mailer.ts` → `buildHelloEmail()` | Welcome email body, selected product cards and heading personalization |
| `src/lib/mailer.ts` → `buildOrderIssueEmail()` | Order-issue message forwarded to support |
| `src/lib/email-settings.ts` | Welcome settings/default content, product choices and order-email preference checks |
| `src/app/admin/emails/hello/page.tsx` | Welcome copy/product editor at `/admin/emails/hello` |
| `src/app/admin/promo/[id]/page.tsx` | Campaign editor, preview and send flow; HTML comes from the saved campaign |
| `src/lib/invoice.ts` | System invoice PDF design, fonts, totals and payment type |
| `src/lib/invoice-attach.ts` | Select uploaded invoice override or generate system PDF for an attachment |

`buildWelcomeEmail()`, `orderLinesHtml()`, and `sendMail()` remain legacy helpers/adapters in `mailer.ts`; the active welcome flow uses `buildHelloEmail()`. Follow the actual call sites below when changing live messages.

## What sends each email

| Email | Sender | Call site |
| --- | --- | --- |
| Welcome after email account bootstrap | `hello` | `src/app/api/auth/ensure/route.ts` |
| Welcome after Google callback/bootstrap | `hello` | `src/app/auth/callback/route.ts` |
| Storefront order received | `noreply` | `src/app/api/checkout/route.ts` |
| Admin status updates | `noreply` | `src/app/admin/orders/[id]/page.tsx` → `src/lib/order-notifications.ts` |
| Bulk order status updates | `noreply` | `src/app/api/admin/orders/bulk/route.ts` → `src/lib/order-notifications.ts` |
| Optional manual-order confirmation | `noreply` | `src/app/api/admin/orders/route.ts` → `src/lib/order-notifications.ts` |
| Newsletter / campaign | `promo` | `src/app/admin/promo/[id]/page.tsx` |
| Customer order issue → support inbox | `orders` | `src/app/api/order-issue/route.ts` |

`SUPPORT_EMAIL` is the human support destination/contact address, not another application SMTP transport.

Admin notifications run after the database update. They respect account order-email preferences; for unassigned manual orders, the helper also checks a matching profile's preferences by email. Bulk actions send only for changed order statuses and only when their notification checkbox is selected. Payment-only edits do not create a status email. A queued notification skips itself if the order has already moved to another status.

Sending is best effort: an email outage does not roll back a saved order. There is no durable delivery queue or inbox-delivery guarantee. Database/audit history establishes whether the order changed; an email client is not the source of truth.

## Password resets and email verification are separate

`src/app/[locale]/(storefront)/account/forgot/page.tsx` calls Supabase Auth's `resetPasswordForEmail()`. Auth verification/recovery messages are sent by **Supabase Auth**, rather than `src/lib/mailer.ts`.

Edit those templates in **Supabase Dashboard → Authentication → Email Templates** (the email/template area of the Auth dashboard). Configure that hosted service's custom SMTP settings in the Supabase dashboard too; application `.env` settings do not automatically configure hosted Supabase Auth.

Our `/auth/callback` and account reset routes complete the authentication flow, not the outgoing Auth email's HTML design.

## Editing safely

- Change shared styles in `shell()` only when every application email should change.
- Change the relevant `build*Email()` function for one message type.
- Keep table-based progress/layout and inline styles for email-client compatibility; website Tailwind classes do not style an inbox.
- Keep order values derived from the saved order/quote. Never mark a payment paid from presentation code.
- Escape plain user/customer text before placing it in HTML. Admin-authored rich HTML is a separate content surface.
- Email links cannot copy to the clipboard automatically. Tracking emails show the number explicitly, with copy/paste instructions and the carrier link; the website's Track order button performs clipboard copying.
- Promo preferences and order-update preferences are different. Preserve both checks.

Tests: `node --test tests/order-email.test.cjs tests/orders-workspace.test.cjs`. SMTP tests mock Nodemailer; they do not contact a mail server.
