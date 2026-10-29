import { createAdminClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductBySlug, getProductsByCollection } from "@/lib/store";

export interface HelloSettings {
  subject: string;
  heading: string;
  bodyHtml: string;
  productSlugs: string[];
}

/** Null-safe read (pre-migration DBs return the default template). */
export async function getHelloSettings(): Promise<HelloSettings> {
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("hello_mail_settings")
      .select("subject, heading, body_html, product_slugs")
      .eq("id", 1)
      .single();
    const row = data as {
      subject?: string;
      heading?: string;
      body_html?: string;
      product_slugs?: string[];
    } | null;
    if (!row) throw new Error("missing");
    return {
      subject: row.subject || "Welcome to the Maison — Misk Al Ghazaal",
      heading: row.heading || "Ahlan wa sahlan, {name}.",
      bodyHtml: row.body_html || "<p>Your maison account is ready.</p>",
      productSlugs: Array.isArray(row.product_slugs)
        ? row.product_slugs.filter(Boolean).slice(0, 3)
        : [],
    };
  } catch {
    return {
      subject: "Welcome to the Maison — Misk Al Ghazaal",
      heading: "Ahlan wa sahlan, {name}.",
      bodyHtml:
        "<p>Your maison account is ready. From here you can track every parcel, keep a wishlist, hold reward coupons — and invite friends: you both earn on their first order.</p><p>Start with the icons below — every order leaves with complimentary samples.</p>",
      productSlugs: [],
    };
  }
}

export interface HelloProduct {
  title: string;
  price: number;
  image?: string;
  href: string;
}

/** Admin-picked slugs first, then live best sellers to fill up to 3. */
export async function getHelloProducts(
  slugs: string[],
): Promise<HelloProduct[]> {
  const out: HelloProduct[] = [];
  for (const slug of slugs.slice(0, 3)) {
    try {
      const p = await getProductBySlug(slug);
      if (p)
        out.push({
          title: p.title,
          price: Number(p.price),
          image: p.images[0] ?? "",
          href: `/product/${p.slug}`,
        });
    } catch {
      /* skip missing */
    }
  }
  if (out.length < 3) {
    try {
      const best = await getProductsByCollection("best-sellers");
      for (const p of best) {
        if (out.length >= 3) break;
        if (out.some((o) => o.href.endsWith(p.slug))) continue;
        out.push({
          title: p.title,
          price: Number(p.price),
          image: p.images[0] ?? "",
          href: `/product/${p.slug}`,
        });
      }
    } catch {
      /* storefront still renders without products */
    }
  }
  return out;
}

/** Promo subscriber list (opted-in shoppers with an email). */
export async function getPromoSubscribers(
  source = "all",
): Promise<{ id: string; email: string; created_at: string }[]> {
  if (
    source !== "all" &&
    !["account", "guest_order", "newsletter", "manual"].includes(source)
  )
    throw Error("Choose a valid campaign audience.");
  const db = createAdminClient(),
    out: { id: string; email: string; created_at: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = db
      .from("marketing_lead_audience")
      .select("id,email,created_at")
      .order("id")
      .range(offset, offset + 999);
    if (["account", "guest_order", "newsletter", "manual"].includes(source))
      query = query.contains("sources", [source]);
    if(source==="account")query=query.eq("has_account",true);
    if(source==="guest_order")query=query.eq("has_account",false);
    const { data, error } = await query;
    if (error) throw Error("Apply migration_leads_preferences.sql.");
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Essential order email is mandatory; the sitewide staff master switch still applies. */
export async function wantsOrderMail(
  _client: SupabaseClient,
  _userId: string | null,
): Promise<boolean> {
  void _client;
  void _userId;
  return true;
}
