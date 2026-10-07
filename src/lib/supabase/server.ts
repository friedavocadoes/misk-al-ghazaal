import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getPublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "./keys";

export { isSupabaseConfigured };

// Server-side Supabase client (RSC, Server Actions, Route Handlers).
// Publishable key + user cookies: RLS still enforced — it acts as the
// logged-in user, NOT as an admin/secret client.
export async function createClient() {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from an RSC — cookies are read-only there.
          // Middleware refresh path handles the write instead.
        }
      },
    },
  });
}
