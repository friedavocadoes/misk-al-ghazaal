import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReferralTerms } from "./pricing";
import { addressKey, normalizeAddress } from "./saved-address";
import { revalidateHome, revalidatePagePaths, revalidateProductPaths } from "./revalidate";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(prefix: string, len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = prefix;
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

export type CheckoutProfileInput = {
  address_line?: string;
  address_building?: string;
  city?: string;
  state?: string;
  emirate?: string;
  postcode?: string;
  address_label?: string;
  lat?: number | null;
  lng?: number | null;
  save_phone?: boolean;
};

export function refreshCheckoutStock(slugs: Iterable<string>) {
  for (const slug of new Set(slugs)) revalidateProductPaths(slug);
  revalidateHome();
  revalidatePagePaths("/collection/[slug]");
}

export async function saveCheckoutCustomer(
  admin: SupabaseClient,
  orderId: string,
  order: { customer_name: string; email: string | null; phone: string; address: string; user_id: string | null; country_code: string; referral_code: string },
  body: CheckoutProfileInput,
) {
  const { customer_name: name, email, phone, address, user_id: ownerId, country_code: countryCode, referral_code: referralCode } = order;
  // Referral reward: newcomer already saved via the quote; now mint the
  // referrer's personal single-use coupon and record the introduction.
  const refereeEmail = email;
  if (referralCode && refereeEmail) {
    const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", referralCode).single();
    const terms = await getReferralTerms();
    if (referrer && terms.active) {
      const percent = terms.referrerPercent;
      let rewardCode = "";
      for (let attempt = 0; attempt < 5 && !rewardCode; attempt++) {
        const code = randomCode("REF-", 6);
        const row: Record<string, string | number | boolean | null> = {
          code,
          kind: "percent",
          amount: percent,
          active: true,
          usage_limit: 1,
          used_count: 0,
          icon: "gift",
          is_public: false,
          owner_id: (referrer as { id: string }).id,
          max_discount: terms.referrerCap,
        };
        let { error } = await admin.from("coupons").insert(row);
        if (error && /max_discount/i.test(error.message)) {
          // Older DBs predate migration_coupons_v2 — mint uncapped.
          delete row.max_discount;
          ({ error } = await admin.from("coupons").insert(row));
        }
        if (!error) rewardCode = code;
      }
      let rewardId: string | null = null;
      if (rewardCode) {
        const { data: rc } = await admin.from("coupons").select("id").eq("code", rewardCode).single();
        rewardId = (rc as { id: string } | null)?.id ?? null;
      }
      await admin.from("referrals").insert({
        referrer_id: (referrer as { id: string }).id,
        referee_email: refereeEmail,
        referee_user_id: ownerId,
        order_id: orderId,
        reward_coupon_id: rewardId,
        status: "rewarded",
      });
      const { data: prof } = await admin.from("profiles").select("referral_uses").eq("id", (referrer as { id: string }).id).single();
      await admin.from("profiles").update({ referral_uses: Number((prof as { referral_uses: number } | null)?.referral_uses ?? 0) + 1 }).eq("id", (referrer as { id: string }).id);
      // Remember who introduced a signed-in newcomer.
      if (ownerId) {
        await admin.from("profiles").update({ referred_by: (referrer as { id: string }).id }).eq("id", ownerId).is("referred_by", null);
      }
    }
  }

  // Remember the shopper for next time (logged-in only): the last
  // delivery snapshot always refreshes (autofill source), the name
  // fills once (never clobbers), the phone ONLY with explicit consent.
  if (ownerId) {
    try {
      const { data: prof } = await admin
        .from("profiles")
        .select("full_name, phone, default_address")
        .eq("id", ownerId)
        .single();
      const saved = normalizeAddress({
        line: body.address_line || address,
        building: body.address_building,
        city: (body.city ?? "Dubai").trim() || "Dubai",
        state: (body.state ?? body.emirate ?? "Dubai").trim() || "Dubai",
        postcode: body.postcode,
        country_code: countryCode,
        label: body.address_label,
        lat: body.lat,
        lng: body.lng,
      });
      const patch: Record<string, unknown> = { default_address: saved };
      if (name && !prof?.full_name) patch.full_name = name;
      if (body.save_phone && phone) patch.phone = phone;
      if (saved) {
        const key = (value: typeof saved) => createHash("sha256").update(addressKey(value)).digest("hex");
        const previous = normalizeAddress(prof?.default_address);
        if (previous && key(previous) !== key(saved)) {
          const { data: existing } = await admin.from("shopper_addresses")
            .select("id").eq("user_id", ownerId).limit(1);
          if (existing?.length === 0) {
            await admin.from("shopper_addresses").upsert(
              { user_id: ownerId, address: previous, address_key: key(previous) },
              { onConflict: "user_id,address_key", ignoreDuplicates: true },
            );
          }
        }
        await admin.from("shopper_addresses").upsert(
          { user_id: ownerId, address: saved, address_key: key(saved), last_used_at: new Date().toISOString() },
          { onConflict: "user_id,address_key" },
        );
      }
      await admin.from("profiles").update(patch).eq("id", ownerId);
    } catch {
      /* profile memory must never block checkout */
    }
  }

}
