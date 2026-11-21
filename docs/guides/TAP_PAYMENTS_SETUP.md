# Tap Payments checkout

The server selects the environment from the request origin. Localhost, 127.0.0.1, and ::1 use test keys and the hosted Tap payment flow. Every other host requires HTTPS, live keys, and an origin matching TAP_SITE_URL. Hosted previews therefore use live payments too.

## Database upgrade

Apply supabase/migration_tap_local_checkout.sql after migration_tap_checkout.sql and migration_tap_staff_sandbox.sql. The migration allows local test attempts without a staff account and keeps their payment records isolated from orders, inventory, coupon use, analytics purchases and notifications. Test payments keep the cart so they can be repeated. COD still places a real order.

Then apply `supabase/migration_tap_failure_details.sql`. It preserves a numeric provider error code and a safe failure category on the private payment attempt, including when the draft customer data is cleared. Only the service role can record these diagnostics.

## Local development

Put these variables in .env.local at the repository root, then restart Next.js.

```dotenv
TAP_MERCHANT_ID=your_merchant_id
TAP_TEST_SECRET_KEY=sk_test_your_secret
TAP_TEST_PUBLIC_KEY=pk_test_your_public_key
TAP_PAYMENT_METHODS=card,apple_pay,tabby,tamara
TAP_TAMARA_MIN_AED=your_confirmed_minimum
TAP_TAMARA_MAX_AED=your_confirmed_maximum
```

Use your own matching merchant and credentials. The local hosted flow uses the secret key. The test public key is reserved for SDK testing. TAP_SITE_URL can keep the production URL because local requests use their actual localhost origin, including the port. The local charge omits post.url since Tap cannot deliver a webhook to localhost. The return page retrieves the charge directly and shows the sandbox result. A missing return can be resumed using the saved attempt.

Select a method in checkout, then use [Tap's test cards](https://developers.tap.company/reference/testing-cards) on the hosted page. Visa 4508 7500 1574 1019, expiry 01/39, CVV 100 and a test cardholder name are documented fixtures. Complete the sandbox authentication screen as prompted. Tabby and Tamara need sandbox activation for your merchant.

## Deployed hosts

Set these in the deployment environment and redeploy.

```dotenv
TAP_MERCHANT_ID=your_merchant_id
TAP_LIVE_SECRET_KEY=sk_live_your_secret
TAP_LIVE_PUBLIC_KEY=pk_live_your_public_key
TAP_SITE_URL=https://www.miskalghazaalperfumes.com
TAP_PAYMENT_METHODS=card,apple_pay,tabby,tamara
TAP_TAMARA_MIN_AED=your_confirmed_minimum
TAP_TAMARA_MAX_AED=your_confirmed_maximum
```

Keep the same merchant ID if Tap assigned it to both modes. Use the exact canonical origin after redirects. TAP_STAFF_SANDBOX is retired. Legacy TAP_SECRET_KEY and TAP_PUBLIC_KEY remain fallbacks, subject to the same strict test/live prefix checks. Prefer the explicit names above.

Cards use [Tap Web Card SDK v2](https://developers.tap.company/docs/card-sdk-web-v2) inside our checkout. Card number and CVV are collected by Tap's secure fields. The browser sends only a token to our server. The server recalculates prices, reserves stock and starts the charge with that token. The private attempt records the token for idempotent request recovery and removes it when settled. A bank may require its own 3-D Secure page before returning to our payment status screen.

Tap's Card SDK guide requires a live public key associated with the registered hosting domain and says that the registered domain's subdomains are covered. The deployed SDK returned `1220: bundle_id mismatch`; this is a domain/key compatibility error, not proof that `www` needs a separate registration. Verify the domain-linked public key for the domain serving checkout. Changing `TAP_SITE_URL` does not register a domain with Tap. When the SDK cannot load, checkout offers an explicit hosted-payment alternative; selecting it creates a charge with the documented method source instead of a token. The normal flow remains embedded.

Apple Pay uses the [Tap Apple Pay Web SDK](https://developers.tap.company/docs/apple-pay-web-sdk) button inside checkout. Register every checkout domain with Tap, including www, and host the verification file supplied for your account at /.well-known/apple-developer-merchantid-domain-association. Tap must activate Apple Pay for the live account. The integration passes the current hostname, merchant ID and live public key. Use a supported Apple device and browser for verification.

Tabby and Tamara use their method-specific Tap charge sources and redirect for their approval process. The Tamara request sends `threeDSecure: false`, matching its current integration example; card requests retain 3-D Secure. `receipt` is omitted because the current Charges schema marks that feature unsupported. TAP_PAYMENT_METHODS declares the methods activated for your merchant. This checkout requires both confirmed merchant limits for Tamara; Tap's Tamara guide does not publish AED minimum/maximum values. Tabby documents a minimum AED 10, with optional stricter merchant limits. The UAE mobile and delivery checks are this storefront's AED-market policy, not a claim that Tap universally restricts BNPL to the UAE. Final customer eligibility is decided by the provider.

A production Tabby create request was rejected with HTTP 400 and code `1243` before a charge ID was issued. The public charge error table does not document this code. A separate sandbox probe using this project's test credentials returned `1243` with the description "Requested payment method not enabled. Please contact our customer support." for both pay-later sources with 3-D Secure enabled. The Tamara request matching its guide (`threeDSecure: false`) returned `1109`, "Non 3D secure transactions are not allowed". These sandbox observations establish the permission errors for those test credentials; the live account must be checked separately. The application must not silently change authentication settings or switch payment methods to hide a rejection. Adding methods to `TAP_PAYMENT_METHODS` does not activate them at Tap. To temporarily disable pay-later options, use `TAP_PAYMENT_METHODS=card,apple_pay`.

## Payment verification and operations

The server verifies the charge ID, merchant, mode, order reference, amount and currency before committing a paid order. Return and webhook paths share the same locked database finalization. Webhooks verify Tap's HMAC signature, then retrieve the charge independently. Retried create requests reuse the same Tap idempotency reference.

The charge specifies /api/checkout/payment/webhook as post.url on deployed hosts. Keep the existing /api/notifications/process worker scheduled every minute with Authorization: Bearer CRON_SECRET to reconcile abandoned returns and missed webhooks. Keep credentials available until their outstanding payments settle.

Test the callback, webhook, failure and retry flows before go-live. Verify a real approved payment per enabled live method with the merchant account. Local test payments do not verify live domain registration, Apple Pay hardware behavior, provider activation or live bank authentication. [Tap integration checklist](https://developers.tap.company/docs/recommendations-best-practices)
