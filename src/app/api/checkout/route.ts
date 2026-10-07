import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

// COD-first checkout. Anonymous shoppers POST here; the handler validates
// against live catalog prices (service_role) so totals can't be spoofed,
// creates orders + order_items + history, and decrements stock via RPC.
// Shipping: free ≥ AED 200, else flat AED 26 (matches announcement bar).
const FREE_OVER = 200;
const FLAT_SHIP = 26;

interface CheckoutItem {
  slug: string;
  variantId?: string;
  qty: number;
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
      items?: CheckoutItem[];
    };
    const name = (body.customer_name ?? "").trim();
    const phone = (body.phone ?? "").trim();
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
    const slugs = [...new Set(items.map((i) => i.slug))];
    const { data: products, error: pErr } = await admin
      .from("products")
      .select("id,slug,title,price")
      .is("deleted_at", null) // binned products can't be ordered (service_role bypasses RLS)
      .in("slug", slugs);
    if (pErr || !products) throw pErr ?? new Error("catalog lookup failed");
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[];
    let byVariant = new Map<string, { id: string; product_id: string; title: string; price: number; stock: number }>();
    if (variantIds.length) {
      const { data: vars, error: vErr } = await admin
        .from("variants")
        .select("id,product_id,title,price,stock")
        .in("id", variantIds);
      if (vErr) throw vErr;
      byVariant = new Map((vars ?? []).map((v) => [v.id, v]));
    }

    let subtotal = 0;
    const lines = items.map((it) => {
      const p = bySlug.get(it.slug) as { title: string; price: number } | undefined;
      if (!p) throw new Error(`Unknown product: ${it.slug}`);
      const v = it.variantId ? byVariant.get(it.variantId) : undefined;
      const unit = v ? Number(v.price) : Number(p.price);
      if (v && v.stock < it.qty) throw new Error(`Out of stock: ${p.title}`);
      subtotal += unit * it.qty;
      return {
        slug: it.slug,
        variantId: it.variantId ?? null,
        title: v ? `${p.title} — ${v.title}` : p.title,
        qty: it.qty,
        unit,
      };
    });

    const shipping = subtotal >= FREE_OVER ? 0 : FLAT_SHIP;
    const total = subtotal + shipping;

    const { data: order, error: oErr } = await admin
      .from("orders")
      .insert({
        order_no: "", // trigger assigns MG-0001…
        customer_name: name,
        phone,
        email: (body.email ?? "").trim() || null,
        address,
        city: (body.city ?? "Dubai").trim() || "Dubai",
        emirate: (body.emirate ?? "Dubai").trim() || "Dubai",
        notes: (body.notes ?? "").trim() || null,
        subtotal,
        shipping,
        total,
        payment_method: "cod",
        status: "new",
      })
      .select("id,order_no")
      .single();
    if (oErr || !order) throw oErr ?? new Error("order insert failed");

    await admin.from("order_items").insert(
      lines.map((l) => ({
        order_id: (order as { id: string }).id,
        product_slug: l.slug,
        variant_id: l.variantId,
        title: l.title,
        qty: l.qty,
        unit_price: l.unit,
      })),
    );
    await admin.from("order_status_history").insert({
      order_id: (order as { id: string }).id,
      from_status: null,
      to_status: "new",
    });
    for (const l of lines) {
      if (l.variantId) await admin.rpc("decrement_stock", { p_variant_id: l.variantId, p_qty: l.qty });
    }

    return NextResponse.json({
      order_no: (order as { order_no: string }).order_no,
      total,
      shipping,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    const status = /stock|invalid|empty|required|unknown/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
