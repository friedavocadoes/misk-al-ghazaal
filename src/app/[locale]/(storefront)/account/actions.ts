"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Own contact only — the profile row id IS the auth id, so a shopper can
    never touch another account's number (RLS enforces the same). */
export async function saveContactDetails(input: {
  name: string;
  phone: string;
}): Promise<{ ok: boolean; error: string }> {
  const name = input.name.slice(0, 80);
  const phone = input.phone.replace(/[^\d+\s-]/g, "").slice(0, 24);
  const digits = phone.replace(/\D/g, "");
  if (phone && (digits.length < 7 || digits.length > 15))
    return { ok: false, error: "That number looks incomplete." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name || null, phone: phone || null })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Could not save — try again." };
  if (name) await supabase.auth.updateUser({ data: { full_name: name } });
  // Locale triple (next-intl as-needed: EN renders at the clean path via
  // an internal /en rewrite — revalidate all three, see lib/revalidate.ts).
  revalidatePath("/account");
  revalidatePath("/en/account");
  revalidatePath("/ar/account");
  return { ok: true, error: "" };
}
