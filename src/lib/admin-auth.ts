import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/keys";

export type AdminRole = "super_admin" | "orders";

export interface AdminSession {
  userId: string;
  email: string;
  role: AdminRole;
}

// Server-only. Returns null when not logged in OR when Supabase env is
// missing (so `next build` without .env still passes — admin shows setup hint).
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role as AdminRole) ?? null;
  if (role !== "super_admin" && role !== "orders") return null;
  return { userId: user.id, email: user.email, role };
}

export function canManageCatalog(role: AdminRole): boolean {
  return role === "super_admin";
}
