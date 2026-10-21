// ---------------------------------------------------------------------------
// Pricing engine: single source of truth for coupons + referral discounts.
// Used by POST /api/quote (live cart/checkout UI) and POST /api/checkout
// (order placement). All reads go through the service client — coupon
// visibility rules live here, never in RLS-dependent queries.
// ---------------------------------------------------------------------------

import { createAdminClient } from "./supabase/service";
import { FLAT_SHIPPING, FREE_SHIP_THRESHOLD } from "./pricing-client";
import type { Coupon, CouponKind, Quote } from "./types";

export interface BagLine {
  slug: string;
  variantId?: string;
  qty: number;
}

export interface CartStockIssue {
  slug: string;
  variantId?: string;
  title: string;
  requested: number;
  available: number;
}

interface PricedLine extends BagLine {
  unit: number;
  title: string;
}

async function priceLines(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  lines: BagLine[],
  previewStock = false,
): Promise<{
  priced: PricedLine[];
  subtotal: number;
  stockIssues: CartStockIssue[];
}> {
  const slugs = [...new Set(lines.map((l) => l.slug))];
  const { data: prods, error: productError } = await supabase
    .from("products")
    .select("id, slug, title, price")
    .in("slug", slugs)
    .is("deleted_at", null);
  if (productError) throw productError;
  const stockIssues: CartStockIssue[] = [];
  const bySlug = new Map(
    (
      (prods as
        { id: string; slug: string; title: string; price: number }[] | null) ??
      []
    ).map((p) => [p.slug, p]),
  );
  const variantIds = [
    ...new Set(lines.map((l) => l.variantId).filter(Boolean)),
  ] as string[];
  let byVariant = new Map<
    string,
    {
      id: string;
      product_id: string;
      title: string;
      price: number;
      stock: number;
    }
  >();
  if (variantIds.length) {
    const { data: vars, error: variantError } = await supabase
      .from("variants")
      .select("id, product_id, title, price, stock")
      .in("id", variantIds);
    if (variantError) throw variantError;
    byVariant = new Map(
      (
        (vars as
          | {
              id: string;
              product_id: string;
              title: string;
              price: number;
              stock: number;
            }[]
          | null) ?? []
      ).map((v) => [v.id, v]),
    );
  }
  const priced: PricedLine[] = [];
  let subtotal = 0;
  for (const l of lines) {
    const p = bySlug.get(l.slug);
    if (!p) throw new Error(`Unknown product: ${l.slug}`);
    let unit = Number(p.price);
    let title = p.title;
    if (l.variantId) {
      const v = byVariant.get(l.variantId);
      if (!v) throw new Error(`Unknown variant: ${l.variantId}`);
      if (v.product_id !== p.id)
        throw new Error(
          `This option no longer belongs to ${p.title}. Please select it again from the product page.`,
        );
      const requested = lines
        .filter((x) => x.slug === l.slug && x.variantId === l.variantId)
        .reduce((n, x) => n + x.qty, 0);
      if (v.stock < requested) {
        if (!previewStock) throw new Error(`Out of stock: ${p.title}`);
        if (
          !stockIssues.some(
            (x) => x.slug === l.slug && x.variantId === l.variantId,
          )
        )
          stockIssues.push({
            slug: l.slug,
            variantId: l.variantId,
            title: p.title,
            requested,
            available: Math.max(0, v.stock),
          });
      }
      unit = Number(v.price);
      title = `${p.title} — ${v.title}`;
    }
    priced.push({ ...l, unit, title });
    subtotal += unit * l.qty;
  }
  return { priced, subtotal, stockIssues };
}

async function hasPriorOrder(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  email: string,
  userId?: string,
): Promise<boolean> {
  if (userId) {
    const { count, error } = await supabase.from("orders").select("id", {count:"exact",head:true}).eq("user_id", userId);
    if (error) throw new Error("Could not verify order history. Please try again.");
    return (count ?? 0) > 0;
  }
  if (!email) return false;
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .ilike("email", email)
    .not("status", "in", "(cancelled,returned)")
    .is("deleted_at", null);
  return (count ?? 0) > 0;
}

export interface CouponCheck {
  ok: boolean;
  reason?: string;
  coupon?: Coupon;
}

/** Validate a code without pricing (for inline UI errors). */
export async function checkCoupon(
  code: string,
  email: string,
  userId?: string,
): Promise<CouponCheck> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, reason: "empty" };
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", clean)
    .single();
  if (!data) return { ok: false, reason: "unknown" };
  const c = data as {
    id: string;
    code: string;
    kind: CouponKind;
    amount: number;
    min_subtotal: number;
    max_discount: number | null;
    once_per_account: boolean | null;
    first_order_only: boolean;
    active: boolean;
    icon: string;
    gift_title: string | null;
    gift_title_ar: string | null;
    is_public: boolean;
    owner_id: string | null;
    starts_at: string | null;
    ends_at: string | null;
    usage_limit: number | null;
    used_count: number;
  };
  if (!c.active) return { ok: false, reason: "inactive" };
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now)
    return { ok: false, reason: "early" };
  if (c.ends_at && new Date(c.ends_at).getTime() < now)
    return { ok: false, reason: "expired" };
  if (c.owner_id && c.owner_id !== userId)
    return { ok: false, reason: "personal" };
  if (c.first_order_only && (await hasPriorOrder(supabase, email, userId)))
    return { ok: false, reason: "repeat" };
  const limit = c.once_per_account ? 1 : c.usage_limit;
  if (limit != null) {
    if (!userId) return { ok: false, reason: "login" };
    const { count, error } = await supabase.from("coupon_redemptions")
      .select("id", { count: "exact", head: true }).eq("coupon_id", c.id).eq("user_id", userId);
    if (error) throw new Error("Could not verify coupon usage. Please try again.");
    if ((count ?? 0) >= limit) return { ok: false, reason: "used" };
  }
  return {
    ok: true,
    coupon: {
      id: c.id,
      code: c.code,
      kind: c.kind,
      amount: Number(c.amount ?? 0),
      minSubtotal: Number(c.min_subtotal ?? 0),
      ...(c.max_discount != null
        ? { maxDiscount: Number(c.max_discount) }
        : {}),
      ...(limit != null ? { usageLimit: limit } : {}),
      firstOrderOnly: c.first_order_only,
      active: c.active,
      icon: c.icon ?? "tag",
      ...(c.gift_title ? { giftTitle: c.gift_title } : {}),
      ...(c.gift_title_ar ? { giftTitleAr: c.gift_title_ar } : {}),
      isPublic: c.is_public,
      ...(c.owner_id ? { ownerId: c.owner_id } : {}),
      usedCount: c.used_count ?? 0,
    },
  };
}

export interface ReferralCheck {
  ok: boolean;
  reason?: string;
  referrerId?: string;
  percent?: number;
  cap?: number;
}

export interface ReferralTerms {
  active: boolean;
  referrerPercent: number;
  referrerCap: number;
  refereePercent: number;
  refereeCap: number;
}

/** Live referral economics with pending-migration fallbacks (missing
    columns read as undefined → legacy percent → spec defaults). */
export async function getReferralTerms(): Promise<ReferralTerms> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("referral_settings")
    .select("*")
    .eq("id", 1)
    .single();
  const s = (data ?? {}) as {
    active?: boolean;
    percent?: number;
    referrer_percent?: number;
    referee_percent?: number;
    referrer_cap?: number;
    referee_cap?: number;
  };
  const legacy = Number(s.percent ?? 25);
  return {
    active: s.active ?? true,
    referrerPercent: Number(s.referrer_percent ?? legacy),
    referrerCap: Number(s.referrer_cap ?? 50),
    refereePercent: Number(s.referee_percent ?? legacy),
    refereeCap: Number(s.referee_cap ?? 50),
  };
}

/** Validate a referral code: settings on, referrer exists, newcomer email. */
export async function checkReferral(
  code: string,
  email: string,
  userId?: string,
): Promise<ReferralCheck> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, reason: "empty" };
  const supabase = await createAdminClient();
  const terms = await getReferralTerms();
  if (!terms.active) return { ok: false, reason: "off" };
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", clean)
    .single();
  if (!referrer) return { ok: false, reason: "unknown" };
  if (userId && (referrer as { id: string }).id === userId)
    return { ok: false, reason: "self" };
  if (await hasPriorOrder(supabase, email))
    return { ok: false, reason: "repeat" };
  const { data: used } = await supabase
    .from("referrals")
    .select("id")
    .ilike("referee_email", email)
    .limit(1);
  if (used?.length) return { ok: false, reason: "repeat" };
  return {
    ok: true,
    referrerId: (referrer as { id: string }).id,
    percent: terms.refereePercent,
    cap: terms.refereeCap,
  };
}

export async function quoteBag(input: {
  lines: BagLine[];
  email?: string;
  couponCode?: string;
  referralCode?: string;
  userId?: string;
  previewStock?: boolean;
}): Promise<{
  quote: Quote;
  priced: PricedLine[];
  stockIssues: CartStockIssue[];
}> {
  const email = (input.email ?? "").trim();
  const supabase = await createAdminClient();
  const { priced, subtotal, stockIssues } = await priceLines(
    supabase,
    input.lines,
    input.previewStock,
  );

  let discount = 0;
  let shipping =
    subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : FLAT_SHIPPING;
  let couponCode = "";
  let couponKind: CouponKind | undefined;
  let giftTitle: string | undefined;
  let freeShipping = subtotal >= FREE_SHIP_THRESHOLD;

  const code = (input.couponCode ?? "").trim();
  if (code) {
    const check = await checkCoupon(code, email, input.userId);
    if (!check.ok || !check.coupon)
      throw new Error(`coupon:${check.reason ?? "invalid"}`);
    const c = check.coupon;
    if (subtotal < c.minSubtotal) throw new Error("coupon:min");
    couponCode = c.code;
    couponKind = c.kind;
    const cap = (n: number) =>
      c.maxDiscount != null ? Math.min(n, c.maxDiscount) : n;
    if (c.kind === "percent")
      discount += Math.min(
        subtotal,
        cap(Math.round((subtotal * Number(c.amount)) / 100)),
      );
    else if (c.kind === "fixed")
      discount += Math.min(subtotal, cap(Number(c.amount)));
    else if (c.kind === "free_shipping") {
      shipping = 0;
      freeShipping = true;
    } else if (c.kind === "gift") {
      giftTitle = c.giftTitle || "Complimentary gift";
    }
  }

  let referralCode = "";
  let referralDiscount = 0;
  const ref = (input.referralCode ?? "").trim();
  if (ref) {
    const check = await checkReferral(ref, email, input.userId);
    if (!check.ok) throw new Error(`referral:${check.reason ?? "invalid"}`);
    referralCode = ref.toUpperCase();
    const rawReferral = Math.round(
      (subtotal * Number(check.percent ?? 20)) / 100,
    );
    referralDiscount = Math.min(rawReferral, Number(check.cap ?? 50));
    discount += Math.min(subtotal - discount, referralDiscount);
  }

  discount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - discount + shipping);
  return {
    priced,
    stockIssues,
    quote: {
      subtotal,
      discount,
      shipping,
      total,
      couponCode,
      ...(couponKind ? { couponKind } : {}),
      ...(giftTitle ? { giftTitle } : {}),
      referralCode,
      referralDiscount,
      freeShipping,
    },
  };
}
