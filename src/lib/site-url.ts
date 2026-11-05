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

/** Public search-engine URLs must never point to localhost or a preview host. */
export function getSitemapOrigin(): string {
  const fallback = "https://www.miskalghazaalperfumes.com";
  const value = getSiteUrl();
  if (!value) return fallback;
  const url = new URL(value);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname.endsWith(".vercel.app")) return fallback;
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Invalid public site URL");
  return url.origin;
}
