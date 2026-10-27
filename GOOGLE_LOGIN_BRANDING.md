# Google sign-in branding

Checked against official documentation on 26 October 2026. These settings are in your Google/Supabase dashboards; they are not controlled by the storefront logo or the Supabase project display name.

## 1. Set the app name and logo

Open [Google Cloud Console](https://console.cloud.google.com/), select the project owning the OAuth client configured in Supabase's Google provider, then open **Google Auth Platform → Branding**.

Set the application name to **Misk Al Ghazaal**, add your logo, support email, website, privacy-policy link, and relevant authorized domain. Save the configuration and complete brand verification if Google requests it. The exact sign-in display depends on Google's flow and verification state. See [Google's branding setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

If you have multiple Google projects, match the OAuth Client ID against **Supabase → Authentication → Sign In / Providers → Google**. Changing an unrelated project's branding will have no effect. Keep credentials private.

## 2. Replace the visible Supabase callback domain

A name/logo and the authentication callback domain are separate. To replace `<project>.supabase.co` with your own branded domain, configure a custom domain such as `auth.your-domain.com` under **Supabase → Project Settings → General → Custom Domains**, following its DNS/verification instructions.

Before activation, add `https://auth.your-domain.com/auth/v1/callback` to the existing Google OAuth client's authorized redirect URIs, keeping the existing Supabase URI during the transition. Supabase advertises the custom OAuth callback after activation; the original API domain remains usable, so an immediate application-wide URL replacement is unnecessary. Custom domains are a paid add-on on a paid plan. See [Supabase custom domains](https://supabase.com/docs/guides/platform/custom-domains).

## 3. Keep the two callback paths distinct

| Callback | Where it is configured | Purpose |
| --- | --- | --- |
| `https://<project>.supabase.co/auth/v1/callback` or custom-domain equivalent | Google's OAuth client redirect URIs | Google returns to Supabase Auth |
| `https://your-store-domain.com/auth/callback` | Supabase Auth redirect allowlist | Supabase returns to our storefront |

Changing only Supabase's Site URL does not rename the Google app or replace the callback domain. Our storefront callback remains responsible for finishing login and account bootstrap.

Repository references: `SETUP_SUPABASE.md` section 6c, `src/app/auth/callback/route.ts`, and the shared Supabase clients in `src/lib/supabase/`.

No provider settings, DNS records, OAuth credentials, billing, or deployed environment variables were changed by this task. After making dashboard changes, test a fresh Google sign-in and confirm it returns to the production shop.
