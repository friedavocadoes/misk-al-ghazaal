// Canonical public origin for Supabase Auth redirects (Google OAuth,
// signup confirmations, password recovery).
//
// In the browser this ALWAYS returns the page's own origin — never an env
// override. A stale NEXT_PUBLIC_SITE_URL (e.g. localhost copied into
// production env) would otherwise make Supabase bounce logins to the wrong
// domain, and the page origin is by definition exact. The env var survives
// only as a fallback for non-browser contexts. Client-safe.

export function getSiteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
}
