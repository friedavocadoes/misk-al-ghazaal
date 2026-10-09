import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** Server-side shopper gate for /account/* — null when logged out.
    Server-only (imports next/headers): never import from client code —
    use @/lib/shopper-identity for shared helpers. */
export async function requireShopper(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}
