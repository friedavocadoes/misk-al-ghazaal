// Canonical public origin for Supabase Auth redirects (Google OAuth,
// signup confirmations, password recovery).
//
// Supabase only honours `redirectTo` when the URL is allowlisted in
// Dashboard → Authentication → URL Configuration → Redirect URLs —
// otherwise it silently falls back to the Site URL. Pinning one origin per
// environment (via NEXT_PUBLIC_SITE_URL in production, current origin in
// local dev) keeps every allowlist entry exact. Client-safe: import
// anywhere, but it only resolves on the client or when the env var is set.

export function getSiteUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
