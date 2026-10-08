import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { quoteBag, type BagLine } from "@/lib/pricing";

// COD checkout, now with the full working flow: live pricing via quoteBag
// (coupons + referral + shipping in one place), gift lines, coupon usage +
// redemptions, referral rewards (personal coupon for the referrer), account
// links, and stock decrement. Totals can never be spoofed — the client only
// sends lines + codes; every dirham is recomputed here.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(prefix: string, len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = prefix;
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      customer_name?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      emirate?: string;
      notes?: string;
      items?: BagLine[];
      coupon_code?: string;
      referral_code?: string;
      user_id?: string;
    };
    const name = (body.customer_name ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const email = (body.email ?? "").trim();
    const address = (body.address ?? "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!name || !phone || !address)
      return NextResponse.json({ error: "Name, phone and address are required." }, { status: 400 });
    if (!items.length || items.length > 50)
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    for (const it of items) {
      if (!it.slug || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 20)
        return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { priced, quote } = await quoteBag({
      lines: items,
      email,
      couponCode: body.coupon_code,
      referralCode: body.referral_code,
      userId: body.user_id,
    });

    const { data: order, error: oErr } = await admin
      .from("orders")
      .insert({
        order_no: "", // trigger assigns MG-0001…
        customer_name: name,
        phone,
        email: email || null,
        address,
        city: (body.city ?? "Dubai").trim() || "Dubai",
        emirate: (body.emirate ?? "Dubai").trim() || "Dubai",
        notes: (body.notes ?? "").trim() || null,
        subtotal: quote.subtotal,
        shipping: quote.shipping,
        discount: quote.discount,
        total: quote.total,
        coupon_code: quote.couponCode || "",
        referral_code: quote.referralCode || "",
        user_id: body.user_id || null,
        payment_method: "cod",
        status: "new",
      })
      .select("id,order_no")
      .single();
    if (oErr || !order) throw oErr ?? new Error("order insert failed");
    const orderId = (order as { id: string }).id;

    const itemRows = priced.map((l) => ({
      order_id: orderId,
      product_slug: l.slug,
      variant_id: l.variantId ?? null,
      title: l.title,
      qty: l.qty,
      unit_price: l.unit,
    }));
    // Gift coupons ride along as a complimentary line (visible in admin).
    if (quote.giftTitle) {
      itemRows.push({
        order_id: orderId,
        product_slug: "gift",
        variant_id: null,
        title: `Gift — ${quote.giftTitle}`,
        qty: 1,
        unit_price: 0,
      });
    }
    await admin.from("order_items").insert(itemRows);
    await admin.from("order_status_history").insert({
      order_id: orderId,
      from_status: null,
      to_status: "new",
    });
    for (const l of priced) {
      if (l.variantId) await admin.rpc("decrement_stock", { p_variant_id: l.variantId, p_qty: l.qty });
    }

    // Coupon usage accounting.
    if (quote.couponCode) {
      const { data: coupon } = await admin.from("coupons").select("id").eq("code", quote.couponCode).single();
      if (coupon) {
        await admin.from("coupon_redemptions").insert({
          coupon_id: (coupon as { id: string }).id,
          order_id: orderId,
          user_id: body.user_id || null,
        });
        await admin.rpc("increment_coupon_use", { p_coupon_id: (coupon as { id: string }).id }).then(
          () => {},
          async () => {
            // RPC may not exist on older DBs — fall back to a direct bump.
            const { data: cur } = await admin.from("coupons").select("used_count").eq("id", (coupon as { id: string }).id).single();
            await admin.from("coupons").update({ used_count: Number((cur as { used_count: number } | null)?.used_count ?? 0) + 1 }).eq("id", (coupon as { id: string }).id);
          },
        );
      }
    }

    // Referral reward: newcomer already saved via the quote; now mint the
    // referrer's personal single-use coupon and record the introduction.
    if (quote.referralCode && email) {
      const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", quote.referralCode).single();
      const { data: settings } = await admin.from("referral_settings").select("percent").eq("id", 1).single();
      if (referrer && settings) {
        const percent = Number((settings as { percent: number }).percent ?? 25);
        let rewardCode = "";
        for (let attempt = 0; attempt < 5 && !rewardCode; attempt++) {
          const code = randomCode("REF-", 6);
          const { error } = await admin.from("coupons").insert({
            code,
            kind: "percent",
            amount: percent,
            active: true,
            usage_limit: 1,
            used_count: 0,
            icon: "gift",
            is_public: false,
            owner_id: (referrer as { id: string }).id,
          });
          if (!error) rewardCode = code;
        }
        let rewardId: string | null = null;
        if (rewardCode) {
          const { data: rc } = await admin.from("coupons").select("id").eq("code", rewardCode).single();
          rewardId = (rc as { id: string } | null)?.id ?? null;
        }
        await admin.from("referrals").insert({
          referrer_id: (referrer as { id: string }).id,
          referee_email: email,
          referee_user_id: body.user_id || null,
          order_id: orderId,
          reward_coupon_id: rewardId,
          status: "rewarded",
        });
        const { data: prof } = await admin.from("profiles").select("referral_uses").eq("id", (referrer as { id: string }).id).single();
        await admin.from("profiles").update({ referral_uses: Number((prof as { referral_uses: number } | null)?.referral_uses ?? 0) + 1 }).eq("id", (referrer as { id: string }).id);
        // Remember who introduced a signed-in newcomer.
        if (body.user_id) {
          await admin.from("profiles").update({ referred_by: (referrer as { id: string }).id }).eq("id", body.user_id).is("referred_by", null);
        }
      }
    }

    return NextResponse.json({
      order_no: (order as { order_no: string }).order_no,
      total: quote.total,
      shipping: quote.shipping,
      discount: quote.discount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    const status = /stock|invalid|empty|required|unknown|coupon|referral|min/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
