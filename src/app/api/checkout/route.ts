import { CHECKOUT_TERMS_VERSION } from "@/lib/checkout-terms";
import { processTelegramQueue } from "@/lib/telegram";
import { whatsappPhone } from "@/lib/whatsapp-shared";
import { getOrderAccessPath, rememberOrderAccess } from "@/lib/order-access";
import { refreshCheckoutStock, saveCheckoutCustomer, type CheckoutProfileInput } from "@/lib/checkout-effects";
import { findCheckoutAttempt, startCheckoutPayment, continueCheckoutPayment, checkoutPaymentProof } from "@/lib/checkout-tap";
import { isTapMethod, paymentRestriction, tapPhone } from "@/lib/checkout-payment";
import { tapConfig } from "@/lib/tap";
import { recordPurchase } from "@/lib/analytics/server";
import { after, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { quoteBag, type BagLine } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutProfileInput & {
      checkout_terms_version?: string;
      customer_name?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      items?: BagLine[];
      sample_ids?: string[];
      coupon_code?: string;
      referral_code?: string;
      user_id?: string;
      country_code?: string;
      whatsapp_opt_in?: boolean;
      payment_method?: string;
      payment_attempt?: unknown;
      expected_total?: number;
      locale?: string;
    };
    if (body.checkout_terms_version !== CHECKOUT_TERMS_VERSION) {
      return NextResponse.json({ error: "terms:stale" }, { status: 409 });
    }
    const method = body.payment_method === undefined ? "cod" : body.payment_method;
    if (method !== "cod" && !isTapMethod(method)) {
      return NextResponse.json({ error: "payment:unavailable" }, { status: 400 });
    }
    const payment = method === "cod" ? null : tapConfig();
    const proof = method === "cod" ? null : checkoutPaymentProof(body.payment_attempt);
    if (method !== "cod") {
      if (!payment || req.headers.get("origin") !== payment.origin || !proof) {
        return NextResponse.json({ error: "payment:unavailable" }, { status: 400 });
      }
      const existing = await findCheckoutAttempt(proof);
      if (existing) return NextResponse.json(await continueCheckoutPayment(existing, payment));
    }
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

    if (body.whatsapp_opt_in === true && !whatsappPhone(phone, (body.country_code ?? "").toUpperCase())) return NextResponse.json({error:"Enter an international WhatsApp number including the country code."},{status:400});
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
    if(body.coupon_code && !ownerId)throw new Error("coupon:login");
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
    if(body.sample_ids && (!Array.isArray(body.sample_ids)||body.sample_ids.length>50||body.sample_ids.some(id=>typeof id!=="string"||! /^[0-9a-f-]{36}$/i.test(id))))throw new Error("Invalid sample selection.");
    const { priced, quote } = await quoteBag({
      lines: items,
      email: email || sessionEmail || "",
      couponCode: body.coupon_code,
      referralCode: body.referral_code,
      userId: ownerId ?? undefined,
    });

    const orderData = {
      ...(body.sample_ids?.length ? {sample_ids:body.sample_ids} : {}),
      checkout_terms_version: CHECKOUT_TERMS_VERSION,
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
      ...(body.whatsapp_opt_in === true ? {whatsapp_opt_in:true} : {}),
      payment_method: method === "apple_pay" ? "wallet" : method,
    };
    const orderLines: typeof priced = quote.giftTitle
      ? [...priced, { slug: "gift", title: `Gift — ${quote.giftTitle}`, qty: 1, unit: 0 }]
      : priced;

    if (isTapMethod(method) && payment && proof) {
      if (body.expected_total !== quote.total) {
        return NextResponse.json({ error: "checkout:price" }, { status: 409 });
      }
      const restriction = paymentRestriction(method, payment.methods[method], quote.total, countryCode, phone);
      if (restriction || !tapPhone(phone)) {
        return NextResponse.json({ error: `payment:${restriction ?? "mobile"}` }, { status: 400 });
      }
      return NextResponse.json(await startCheckoutPayment(req, payment, proof, method, orderData, orderLines, {
        address_line: body.address_line, address_building: body.address_building, save_phone: body.save_phone,
      }, body.locale === "ar" ? "ar" : "en"));
    }

    const committed = await admin.rpc("storefront_checkout_commit", {
      p_order: orderData,
      p_lines: orderLines,
    });
    let order = committed.data as { id: string; order_no: string } | null;
    if (committed.error?.code === "PGRST202") {
      // Existing installations can continue to accept COD before applying the Tap migration.
      const legacy = await admin.from("orders").insert({ ...orderData, order_no: "", status: "new" }).select("id,order_no").single();
      if (legacy.error || !legacy.data) throw legacy.error ?? new Error("order insert failed");
      order = legacy.data;
      await admin.from("order_items").insert(orderLines.map((line) => ({
        order_id: legacy.data.id, product_slug: line.slug, variant_id: line.variantId ?? null, title: line.title, qty: line.qty, unit_price: line.unit,
      })));
      await admin.from("order_status_history").insert({ order_id: legacy.data.id, to_status: "new" });
      const soldBySlug = new Map<string, number>();
      for (const line of priced) {
        if (line.variantId) await admin.rpc("decrement_stock", { p_variant_id: line.variantId, p_qty: line.qty });
        soldBySlug.set(line.slug, (soldBySlug.get(line.slug) ?? 0) + line.qty);
      }
      for (const [slug, qty] of soldBySlug) {
        const { data } = await admin.from("products").select("sales_count").eq("slug", slug).single();
        await admin.from("products").update({ sales_count: Number(data?.sales_count ?? 0) + qty }).eq("slug", slug);
      }
    } else if (committed.error) {
      throw new Error(committed.error.message);
    }
    if (!order) throw new Error("order insert failed");
    const orderId = order.id;
    after(() => recordPurchase(req, orderId, quote.total, priced.map(l => ({ product_id: l.slug, product_name: l.title, price: l.unit, quantity: l.qty })), ownerId));
    after(() => refreshCheckoutStock(priced.map(l => l.slug)));
    const { data: sampleRows } = body.sample_ids?.length
      ? await admin.from("order_items").select("title,qty,unit_price").eq("order_id", orderId).eq("product_slug", "sample")
      : { data: [] };
    const sampleLines = (sampleRows ?? []).map(s => ({ title: s.title, qty: s.qty, unit: 0, slug: "sample" }));
    await saveCheckoutCustomer(admin, orderId, orderData, body);

    // Customer communication starts when staff confirm the order.
    const orderPath=await getOrderAccessPath(admin,orderId).catch(()=>null);
    if(orderPath)await rememberOrderAccess(orderPath.split("/").at(-1)!).catch(()=>{});
    after(async()=>{try{await processTelegramQueue();}catch{/* Staff alerts remain queued for the scheduled worker. */}});
    return NextResponse.json({
      order_no: (order as { order_no: string }).order_no,
      order_url: orderPath,
      total: quote.total,
      shipping: quote.shipping,
      discount: quote.discount,
      items: [...priced.map(l => ({ title: l.title, qty: l.qty, unit: l.unit, slug: l.slug })),...sampleLines],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    const status = msg === "checkout:price" ? 409 : /stock|invalid|empty|required|unknown|coupon|referral|min|delivery|unavailable/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
