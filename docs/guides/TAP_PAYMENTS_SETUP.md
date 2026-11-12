# Tap Payments setup

Gazaal displays Card, Apple Pay, Tabby and Tamara in its payment step. The selected method opens its own Tap payment flow. Visa and Mastercard debit, credit and international cards use the Card option. Tap may also accept American Express when enabled for the merchant.

## Configure a sandbox checkout

1. Apply `supabase/migration_tap_checkout.sql` after the existing migrations on a staging Supabase project.
2. Put the following values in `.env.local` at the repo root for local development. For a hosted test deployment, add the same names in the host’s Preview environment variables and redeploy. Use the public HTTPS checkout origin for `TAP_SITE_URL`. For local testing, open the app through that HTTPS tunnel origin so the browser can return to the same checkout and Tap can reach the webhook.

   ```dotenv
   TAP_SECRET_KEY=sk_test_...
   TAP_SITE_URL=https://your-preview-or-tunnel.example
   TAP_PAYMENT_METHODS=card
   ```

3. Add `apple_pay`, `tabby`, and `tamara` to the comma-separated list as Tap enables them for your sandbox account. The hosted flow uses your secret key and lets Tap select the merchant by default. `TAP_MERCHANT_ID` is an optional override for an explicit numeric Merchant ID. The public key is for browser SDKs. [Tap charge API](https://developers.tap.company/reference/create-a-charge)
4. Set `TAP_TAMARA_MIN_AED` and `TAP_TAMARA_MAX_AED` to the UAE merchant limits supplied by Tap or Tamara. Both values are required to show Tamara as available. Optional `TAP_TABBY_MIN_AED` and `TAP_TABBY_MAX_AED` reflect any tighter merchant limits. The documented Tap Tabby floor is AED 10. Card and Apple Pay use the Tap API floor of AED 0.10, with optional merchant overrides listed in `.env.example`.
5. Verify that the existing scheduled `/api/notifications/process` worker runs every minute with `Authorization: Bearer CRON_SECRET`. It also reconciles outstanding Tap charges if the shopper leaves before returning or a webhook is missed. Each charge supplies `/api/checkout/payment/webhook` to Tap as its `post.url`.

The checkout checks the final AED total, merchant activation, Apple Pay browser capability, and a UAE delivery address and UAE mobile number for pay later. Tabby and Tamara confirm the customer’s approval during their payment flow.

[Tap redirect guide](https://developers.tap.company/docs/redirect) · [Tabby limits and mobile requirement](https://developers.tap.company/docs/tabby) · [Tamara activation](https://developers.tap.company/docs/tamara) · [Tap charge minimum](https://developers.tap.company/reference/create-a-charge)

## Test before enabling live payments

- Use [Tap’s test cards](https://developers.tap.company/reference/testing-cards) for approved and declined payments, including 3D Secure. Confirm the shopper returns to the matching English or Arabic checkout.
- Test Apple Pay on an eligible device and browser. Test Tabby and Tamara with your enabled sandbox account and UAE shopper details. Try totals below and above the configured limits.
- Confirm that a captured charge produces one paid order and one staff alert, including when the webhook arrives before the shopper or repeats. A declined or cancelled charge releases its stock, samples and coupon reservation. Sandbox captures create orders in the configured Supabase project, so use a staging project for this exercise.
- For live checkout, use the Tap live secret key, the production HTTPS origin, and only the methods activated in live mode. Vercel Production declines `sk_test_` keys. Complete one live verification per enabled method using [Tap’s integration checklist](https://developers.tap.company/docs/recommendations-best-practices).

If a payment remains pending, compare its `tap_checkout_attempts` reference or `charge_id` with the Tap dashboard. The worker retrieves known charge IDs and uses the original idempotency reference for recent requests without a charge ID. Attempts with no charge ID past that retry window need reconciliation in Tap before their holds can be released. The order detail shows the Tap charge ID after capture.
