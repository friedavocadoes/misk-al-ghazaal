import { createClient } from "@supabase/supabase-js";
import { getSecretKey, getSupabaseUrl } from "./keys";

// Privileged client — SERVER ONLY (Server Actions / Route Handlers).
// Uses the secret key (`sb_secret_…`): bypasses RLS, blocked in browsers
// (401 on User-Agent match). Never import from a Client Component, never
// prefix the key with NEXT_PUBLIC_. Used for: checkout order writes +
// stock decrement RPC.
export function createAdminClient() {
  const url = getSupabaseUrl();
  const secretKey = getSecretKey();
  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase URL / SUPABASE_SECRET_KEY (server env)",
    );
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
