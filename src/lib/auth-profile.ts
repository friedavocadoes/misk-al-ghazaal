// ---------------------------------------------------------------------------
// Shopper profile bootstrap: every authenticated user gets a profiles row
// with a unique referral code (their earning identity). Called from the
// OAuth/email callback AND login (backfills older accounts).
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 6): string {
  let s = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

export async function ensureProfile(
  admin: SupabaseClient,
  userId: string,
  email: string | null,
  referredByCode?: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, referral_code, referred_by")
    .eq("id", userId)
    .single();

  let referrerId: string | null = null;
  const clean = (referredByCode ?? "").trim().toUpperCase();
  if (clean) {
    const { data: ref } = await admin.from("profiles").select("id").eq("referral_code", clean).single();
    if (ref && (ref as { id: string }).id !== userId) referrerId = (ref as { id: string }).id;
  }

  if (!existing) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      const { error } = await admin.from("profiles").insert({
        id: userId,
        email,
        role: "orders",
        referral_code: code,
        referred_by: referrerId,
      });
      if (!error) return;
      // Collision on referral_code (or a racing insert) — retry, then
      // fall back to updating the row the trigger may have created.
      const { data: retry } = await admin.from("profiles").select("id").eq("id", userId).single();
      if (retry) break;
    }
  }

  const patch: { referral_code?: string; referred_by?: string } = {};
  if (!(existing as { referral_code?: string } | null)?.referral_code) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      const { error } = await admin
        .from("profiles")
        .update({ referral_code: code })
        .eq("id", userId)
        .is("referral_code", null);
      if (!error) break;
    }
  }
  if (referrerId && !(existing as { referred_by?: string } | null)?.referred_by) {
    patch.referred_by = referrerId;
  }
  if (Object.keys(patch).length) {
    await admin.from("profiles").update(patch).eq("id", userId);
  }
}
