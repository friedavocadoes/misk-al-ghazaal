"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublishableKey, getSupabaseUrl } from "./keys";

// Browser-side Supabase client (publishable key, RLS enforced).
// Use in Client Components only: login form, admin tables with realtime.
export function createClient() {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return createBrowserClient(url, key);
}
