// Central Supabase key resolution (new API-key model).
//
// Supabase is deprecating legacy JWT `anon` / `service_role` keys (end of
// 2026) in favour of `sb_publishable_…` / `sb_secret_…` keys. Dashboard:
// Settings → API Keys → "Publishable and secret API keys" tab.
//
//   Browser / RLS-enforced : NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
//   Server privileged      : SUPABASE_SECRET_KEY (never NEXT_PUBLIC_, never commit)
//
// Legacy vars remain as a fallback so existing local `.env` files keep
// working during migration; new vars always win when both are set.

export function getSupabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || undefined
  );
}

/** Publishable key (`sb_publishable_…`) for browser + user-scoped server clients. */
export function getPublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || // legacy fallback
    undefined
  );
}

/** Secret key (`sb_secret_…`) for SERVER-ONLY privileged clients. */
export function getSecretKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY || // legacy fallback
    undefined
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getPublishableKey());
}
