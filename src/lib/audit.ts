import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminSession } from "./admin-auth";

// ---------------------------------------------------------------------------
// Admin audit trail: every console mutation writes one append-only row.
// Writes go through the caller's RLS-enforced client (staff INSERT policy);
// reads are staff-only; there are NO update/delete policies, so history
// cannot be altered from the app — only the owner purges via dashboard SQL.
// logAdmin NEVER throws: auditing must not break admin saves.
// ---------------------------------------------------------------------------

export const AUDIT_CATEGORIES = [
  "products",
  "orders",
  "banners",
  "coupons",
  "referrals",
  "reviews",
  "countries",
  "homepage",
  "lineups",
  "notes",
  "rituals",
  "users",
  "bin",
  "seo",
  "auth",
  "emails",
  "promo",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export interface AuditEntry {
  category: AuditCategory;
  /** create | update | delete | restore | approve | status | login | logout | role … */
  action: string;
  entity?: string;
  entityId?: string;
  /** Human label (title / slug / code / order_no / email). */
  label?: string;
  /** One-line human summary for list rows. */
  summary: string;
  details?: Record<string, unknown>;
}

export async function logAdmin(
  supabase: SupabaseClient,
  s: AdminSession | null,
  entry: AuditEntry,
): Promise<void> {
  try {
    if (!s) return;
    await supabase.from("admin_audit_log").insert({
      user_id: s.userId,
      user_email: s.email,
      user_role: s.role,
      category: entry.category,
      action: entry.action,
      entity: entry.entity ?? "",
      entity_id: entry.entityId ?? "",
      entity_label: entry.label ?? "",
      summary: entry.summary,
      details: entry.details ?? {},
    });
  } catch {
    /* auditing must never break admin saves */
  }
}
