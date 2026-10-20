import { cookies } from "next/headers";
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
  promoOptIn?: boolean,
): Promise<{ created: boolean }> {
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
        role: "customer",
        referral_code: code,
        referred_by: referrerId,
        promo_opt_in: promoOptIn ?? true,
      });
      if (!error) { await claimBrowserRatings(admin,userId); return { created: true }; }
      // Collision on referral_code (or a racing insert) — retry, then
      // fall back to updating the row the trigger may have created.
      const { data: retry } = await admin.from("profiles").select("id").eq("id", userId).single();
      if (retry) break;
    }
  }

  const patch: { referral_code?: string; referred_by?: string; promo_opt_in?: boolean } = {};
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
  // Login-pane opt-in syncs the flag for existing accounts (unchecked = off).
  if (promoOptIn !== undefined) patch.promo_opt_in = promoOptIn;
  if (Object.keys(patch).length) {
    await admin.from("profiles").update(patch).eq("id", userId);
  }
  await claimBrowserRatings(admin,userId);
  return { created: false };
}

/** Adopt guest orders placed with this address before signup: the auth
    email is verified by Supabase, so matching user_id-NULL rows are
    unambiguously this shopper's. Exact lower() match only (never LIKE). */
export async function claimGuestOrders(
  admin: SupabaseClient,
  userId: string,
  email: string,
): Promise<void> {
  try {
    const { data } = await admin
      .from("orders")
      .select("id, email")
      .is("user_id", null);
    const ids = (
      (data as { id: string; email: string | null }[] | null) ?? []
    )
      .filter((o) => (o.email ?? "").toLowerCase() === email.toLowerCase())
      .map((o) => o.id);
    if (!ids.length) return;
    await admin.from("orders").update({ user_id: userId }).in("id", ids);
  } catch {
    /* claiming must never block login */
  }
}

async function claimBrowserRatings(admin:SupabaseClient,userId:string){
 const guest=(await cookies()).get("misk-rating-browser")?.value;
 if(guest && /^[0-9a-f-]{36}$/i.test(guest))await admin.rpc("claim_browser_ratings",{gid:guest,uid:userId});
}
