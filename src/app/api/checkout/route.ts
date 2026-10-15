import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { getReferralTerms, quoteBag, type BagLine } from "@/lib/pricing";
import { buildOrderEmail, sendMailboxMail } from "@/lib/mailer";
import { wantsOrderMail } from "@/lib/email-settings";

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
      country_code?: string;
      state?: string;
      postcode?: string;
      address_label?: string;
      lat?: number | null;
      lng?: number | null;
      save_phone?: boolean;
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
    // Identity is server-authoritative: the session decides the owner.
    // A client-supplied user_id that disagrees with the session is
    // ignored (it would otherwise let anyone bind orders — and personal
    // coupons — to somebody else's account).
    let sessionUserId: string | null = null;
    let sessionEmail: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      sessionUserId = sessionUser?.id ?? null;
      sessionEmail = sessionUser?.email ?? null;
    } catch {
      /* no session — guest checkout */
    }
    const ownerId = sessionUserId;
    // Delivery zone guard: the country must be active in the admin list
    // (the map already enforces this; the server has the final word).
    const countryCode = (body.country_code ?? "").trim().toUpperCase();
    if (countryCode) {
      const { data: zone } = await admin
        .from("delivery_countries")
        .select("id")
        .eq("code", countryCode)
        .eq("active", true)
        .single();
      if (!zone) throw new Error("delivery:unsupported");
    }
    const { priced, quote } = await quoteBag({
      lines: items,
      email: email || sessionEmail || "",
      couponCode: body.coupon_code,
      referralCode: body.referral_code,
      userId: ownerId ?? undefined,
    });

    const { data: order, error: oErr } = await admin
      .from("orders")
      .insert({
        order_no: "", // trigger assigns MG-0001…
        customer_name: name,
        phone,
        email: email || sessionEmail || null,
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
        user_id: ownerId,
        country_code: countryCode,
        state_name: (body.state ?? "").trim(),
        postcode: (body.postcode ?? "").trim(),
        address_label: (body.address_label ?? "").trim(),
        delivery_lat: typeof body.lat === "number" ? body.lat : null,
        delivery_lng: typeof body.lng === "number" ? body.lng : null,
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
    // Light best-seller algo: every sold unit quietly pulls the product up
    // the maison ranking (score subtracts sales_count — see rankScore).
    const soldBySlug = new Map<string, number>();
    for (const l of priced) {
      soldBySlug.set(l.slug, (soldBySlug.get(l.slug) ?? 0) + l.qty);
    }
    for (const [slug, qty] of soldBySlug) {
      const { data: cur } = await admin.from("products").select("sales_count").eq("slug", slug).single();
      await admin
        .from("products")
        .update({ sales_count: Number((cur as { sales_count?: number } | null)?.sales_count ?? 0) + qty })
        .eq("slug", slug);
    }

    // Coupon usage accounting.
    if (quote.couponCode) {
      const { data: coupon } = await admin.from("coupons").select("id").eq("code", quote.couponCode).single();
      if (coupon) {
        await admin.from("coupon_redemptions").insert({
          coupon_id: (coupon as { id: string }).id,
          order_id: orderId,
          user_id: ownerId,
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
    const refereeEmail = email || sessionEmail || "";
    if (quote.referralCode && refereeEmail) {
      const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", quote.referralCode).single();
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
          .select("full_name, phone")
          .eq("id", ownerId)
          .single();
        const p = (prof as { full_name?: string | null; phone?: string | null } | null) ?? {};
        const patch: Record<string, unknown> = {
          default_address: {
            line: address,
            city: (body.city ?? "Dubai").trim() || "Dubai",
            state: (body.state ?? body.emirate ?? "Dubai").trim() || "Dubai",
            postcode: (body.postcode ?? "").trim(),
            country_code: countryCode,
            label: (body.address_label ?? "").trim(),
            lat: typeof body.lat === "number" ? body.lat : null,
            lng: typeof body.lng === "number" ? body.lng : null,
          },
        };
        if (name && !p.full_name) patch.full_name = name;
        if (body.save_phone && phone) patch.phone = phone;
        await admin.from("profiles").update(patch).eq("id", ownerId);
      } catch {
        /* profile memory must never block checkout */
      }
    }

    // Order confirmation email (skipped when unconfigured OR the
    // account holder switched order updates off in email preferences).
    const receiptEmail = email || sessionEmail || "";
    if (receiptEmail && (await wantsOrderMail(admin, ownerId))) {
      const origin = new URL(req.url).origin;
      const { data: faces } = await admin
        .from("products")
        .select("slug, images")
        .in("slug", priced.map((l) => l.slug));
      const faceMap = new Map(
        ((faces as { slug: string; images: string[] }[] | null) ?? []).map((f) => [f.slug, f.images?.[0] ?? ""]),
      );
      const cityName = ((body.city ?? "Dubai") as string).trim() || "Dubai";
      const stateName = ((body.state ?? body.emirate ?? "Dubai") as string).trim() || "Dubai";
      const addrHtml = `${address}<br />${[cityName, stateName, (body.postcode ?? "").trim(), countryCode].filter(Boolean).join(" · ")}`;
      const mail = buildOrderEmail({
        orderNo: (order as { order_no: string }).order_no,
        date: new Date().toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" }),
        statusLabel: "received",
        customerName: name,
        lines: priced.map((l) => ({
          title: l.title,
          qty: l.qty,
          unit: l.unit,
          ...(faceMap.get(l.slug) ? { image: faceMap.get(l.slug) as string, href: `/product/${l.slug}` } : {}),
        })),
        origin,
        subtotal: quote.subtotal,
        discount: quote.discount,
        shipping: quote.shipping,
        total: quote.total,
        addressHtml: addrHtml,
        couponCode: quote.couponCode || undefined,
      });
      await sendMailboxMail("noreply", { to: receiptEmail, ...mail });
    }

    return NextResponse.json({
      order_no: (order as { order_no: string }).order_no,
      total: quote.total,
      shipping: quote.shipping,
      discount: quote.discount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    const status = /stock|invalid|empty|required|unknown|coupon|referral|min|delivery/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
