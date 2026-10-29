# Master notifications and Telegram

Updated 28 October 2026. Read WHATSAPP_SETUP.md for customer templates/callback.

## Activate

Apply `migration_whatsapp.sql` if needed, then **`supabase/migration_notification_control.sql`**. Deploy and open **Admin → Setup → Notifications** (`/admin/settings/notifications`, super-admin only).

New orders send no customer email/WhatsApp. Confirmation/later status or tracking edits have separate staff-selected channels. New-order Telegram staff alerts are independent. Master application-email defaults are enabled after migration; Telegram also requires credentials. **Missing/unreadable settings suppress application email**, so apply the migration before relying on sends. Global email off overrides each individual switch and order checkbox, including requests from stale admin tabs. Disabled email is not queued for later replay.

## Email inventory

| Master option | Trigger / source | Mailbox / destination |
| --- | --- | --- |
| Welcome | `src/app/api/auth/ensure/route.ts`, `src/app/auth/callback/route.ts` | hello → new customer |
| Order confirmations & updates | `src/lib/order-notifications.ts`, selected admin actions | noreply → customer; essential order email cannot be opted out by customers |
| Contact alerts | `src/app/api/contact/route.ts` | hello → shop; inbox copy persists even if email is off |
| Order-support forwards | `src/app/api/order-issue/route.ts` | orders → support; when paused customer is told to use WhatsApp rather than falsely reporting success |
| Promotional email | Existing `src/app/admin/promo/[id]/page.tsx` | promo → email subscribers; no campaign expansion |

`src/lib/mailer.ts` enforces all application SMTP gates. Contact alerts explicitly specify their category. `notification-settings.ts` reads private settings; `notification-rules.ts` defines labels/types.

Order/bulk email controls disable with hover or keyboard-focus tooltip showing **Admin → Setup → Notifications → Order confirmations & updates** and its URL. Server checks prevent stale tabs from bypassing the switch.

### Supabase authentication mail

Signup verification, email-change verification and password recovery use Supabase Auth, including AuthTabs, forgot-password and admin reset actions. They do not use nodemailer. Manage them under **Supabase Dashboard → Authentication → Email / Email templates**. The setup page explains this boundary. Disabling store messages does not silently turn off verification or password recovery; authentication security was not changed.

## Create the Telegram bot

BotFather manages bots; shop alerts come from **your new bot**, not BotFather.

1. Open the official **@BotFather** in Telegram; send `/newbot` and choose its name/username.
2. Store its token as `TELEGRAM_BOT_TOKEN`. Treat it as a password; BotFather can revoke/rotate it.
3. Private destination: employee opens your new bot and presses Start (`/start`). Ordinary bots cannot start that private conversation themselves.
4. Group destination: add the bot to a private shop group with posting permission; send a command/message there. Group IDs are commonly negative.
5. Get the chat ID from your own bot's `getUpdates`, not an untrusted third-party ID bot.

PowerShell example after setting the token in your shell environment; it prints chat details, not the token:

```powershell
$updates = Invoke-RestMethod -Uri ("https://api.telegram.org/bot{0}/getUpdates" -f $env:TELEGRAM_BOT_TOKEN)
$updates.result | ForEach-Object { $_.message.chat } | Select-Object id, title, first_name
```

Send a fresh `/start`/group command first. getUpdates cannot run while a webhook is registered for the same bot. This send-only integration does not register one or run polling. If another service manages your bot, use a dedicated bot instead of deleting its webhook blindly.

Official references: [BotFather/tutorial](https://core.telegram.org/bots/tutorial), [Bot API](https://core.telegram.org/bots/api), [limits](https://core.telegram.org/bots/faq). Ordinary bot messaging is free within Telegram's limits; paid broadcasts are not enabled here. Telegram advises avoiding more than one message/second/chat and limits group sending; batches are paced and429 retry-after is respected.

## Environment

```dotenv
TELEGRAM_BOT_TOKEN=THE_TOKEN_FROM_BOTFATHER
TELEGRAM_CHAT_ID=YOUR_PRIVATE_OR_GROUP_CHAT_ID
# Optional forum-group topic only
TELEGRAM_MESSAGE_THREAD_ID=123
NEXT_PUBLIC_SITE_URL=https://www.miskalghazaalperfumes.com
CRON_SECRET=YOUR_EXISTING_RANDOM_SCHEDULER_SECRET
```

Missing token/chat-ID placeholders were added locally without overwriting existing values. All Telegram values are server-only. The public origin needs HTTPS for staff buttons. Restart/redeploy after edits. No Telegram webhook, client certificate, BotFather chat ID or paid-broadcast switch is needed.

## Staff alert

```text
New Order

Order: #GZ1042
Customer: Ahmed
Total: AED 249.00
Payment: Cash on delivery
Status: Pending processing

https://www.miskalghazaalperfumes.com/admin/orders/ORDER_UUID
```

The actual stored reference is used; the order-number scheme is not changed. An **Open order** button requires staff login. No customer capability link, address, phone or email appears. Keep the destination private to trusted staff.

## Queue and monitoring

An order-insert trigger queues one alert atomically, for storefront/manual orders. No historic backfill. Manual-order retries do not duplicate the alert. Checkout/manual actions try an after-response batch; schedule recovery every minute:

```text
GET https://www.miskalghazaalperfumes.com/api/notifications/process
Authorization: Bearer YOUR_CRON_SECRET
```

The old `/api/whatsapp/process` is an alias: install one schedule, not two. This repository does not configure a live scheduler. Telegram/WhatsApp drain independently via SKIP LOCKED claims.

Telegram claims5, paces within the batch and uses bounded429/preparation retries. Binned/non-new orders and alerts older than24h are skipped to avoid stale “new order” messages after a long pause. Ambiguous/interrupted sends become unknown and are not blindly retried; inspect the shop chat before manual recovery. Bot API has no idempotency key guaranteeing exactly-once sending after a timeout.

Latest15 states/errors appear in **Setup → Notifications**. Sent means Bot API acceptance, not employee read. No real bot/customer messages were sent during verification.

## Files

- `src/lib/telegram.ts`: staff text/button and API sender.
- `supabase/migration_notification_control.sql`: master settings, final WhatsApp triggers, Telegram queue/claims.
- `src/app/admin/settings/notifications/page.tsx`: master switches, callback details, alert monitor.
- `src/components/admin/EmailNotificationOption.tsx`: disabled checkbox/tooltip.
- `src/app/api/notifications/process/route.ts`: protected worker.
- `tests/notification-control.test.cjs`: disposable SQL, SMTP gate, bot payload and callback tests; sends mocked.


## Leads and customer preferences upgrade (29 October 2026)
Read [LEADS_LOCATION_AND_PREFERENCES.md](LEADS_LOCATION_AND_PREFERENCES.md). The new leads migration adds guest preference links, persistent WhatsApp opt-outs, central lead sources and queued email campaigns. Essential order email is now customer-mandatory; staff master switches still apply. The unified worker also drains email deliveries.
