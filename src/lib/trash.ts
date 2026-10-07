import { createClient } from "@/lib/supabase/server";

// Recycle-bin helpers (products / banners / orders).
// Retention: 20 days. purgeExpiredBin() hard-deletes overdue rows through
// the caller's own RLS session — call it at the top of every bin page so
// the rule holds with zero cron/services. (Optional pg_cron snippet lives
// at the bottom of supabase/migration_soft_delete.sql.)

export const BIN_RETENTION_DAYS = 20;

export type BinTable = "products" | "banners" | "orders";

export async function purgeExpiredBin(): Promise<void> {
  const supabase = await createClient();
  const cutoff = new Date(
    Date.now() - BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  // RLS-scoped: caller can only purge what their role may hard-delete.
  await supabase.from("products").delete().lt("deleted_at", cutoff);
  await supabase.from("banners").delete().lt("deleted_at", cutoff);
  await supabase.from("orders").delete().lt("deleted_at", cutoff);
}

export function autoDeleteAt(deletedAt: string): Date {
  return new Date(
    new Date(deletedAt).getTime() + BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}
