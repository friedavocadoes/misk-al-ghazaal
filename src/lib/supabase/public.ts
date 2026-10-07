import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublishableKey, getSupabaseUrl } from "./keys";

// Anonymous public client for storefront reads (products, collections,
// banners, articles). Publishable key, NO cookies/session — safe in
// generateStaticParams, sitemaps and any build-time prerender. RLS public
// SELECT policies apply (`anon` role). Never use for staff-gated reads.
export function createPublicClient() {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
