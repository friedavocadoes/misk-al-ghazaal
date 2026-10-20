"use client";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Check, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { WishHeart } from "@/components/product/WishHeart";
import { flyToBag } from "@/lib/fly-to-bag";
import type { Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/product/PriceTag";
import { TrustBadges } from "./TrustBadges";
import { PdpOffers } from "./PdpOffers";
import type { Coupon } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";

export { ProductGallery };

/** A brief of the notes, in plain customer words: an interactive
    composition bar (hover a segment or a name — the pair lights up) over
    tiered dot-lists. Compact enough for the buy box. */
export function NotesStrip({ product, locale }: { product: Product; locale: Locale }) {
  const t = useTranslations("Product");
  const [lit, setLit] = useState<string | null>(null);
  if (!product.notes.length) return null;
  const order = ["top", "heart", "base"] as const;
  const groups = order
    .map((k) => ({ kind: k, items: product.notes.filter((n) => n.kind === k) }))
    .filter((g) => g.items.length);
  const kindLabel = (k: string) =>
    k === "top" ? t("noteTop") : k === "heart" ? t("noteHeart") : t("noteBase");
  const nameOf = (n: { name: string; nameAr?: string }) => tx(n.name, n.nameAr, locale);
  return (
    <div className="mt-6 border-y border-ink/10 py-4">
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
          {t("notesGlance")}
        </span>
        {(product.notesImageDesktop || product.notesImageMobile) && (
          <Link href="#detailed-notes" className="link-underline shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            {t("notesExplore")}
          </Link>
        )}
      </p>
      {/* Composition bar: every note owns a segment in pyramid order. */}
      <div
        className="mt-3 flex h-2 w-full gap-px overflow-hidden rounded-full bg-ink/10"
        onMouseLeave={() => setLit(null)}
      >
        {product.notes.map((n) => (
          <span
            key={n.id}
            title={nameOf(n)}
            onMouseEnter={() => setLit(n.id)}
            className="h-full cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              backgroundColor: n.color,
              flexGrow: lit === n.id ? 4 : 1,
              flexBasis: 0,
              opacity: lit && lit !== n.id ? 0.35 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-3 space-y-2" onMouseLeave={() => setLit(null)}>
        {groups.map((g) => (
          <p key={g.kind} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-fog">
              {kindLabel(g.kind)}
            </span>
            {g.items.map((n) => (
              <span
                key={n.id}
                onMouseEnter={() => setLit(n.id)}
                className="inline-flex cursor-default items-center gap-1.5 text-ink transition-opacity"
                style={{ opacity: lit && lit !== n.id ? 0.35 : 1 }}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full ring-1 ring-ink/20 transition-transform"
                  style={{
                    backgroundColor: n.color,
                    transform: lit === n.id ? "scale(1.5)" : undefined,
                  }}
                />
                {nameOf(n)}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ProductInfo({
  product,
  layout = "standard",
  locale,
  categoryName,
  rating,
  reviewCount,
  coupons,
  heading,
}: {
  product: Product;
  layout?: "standard" | "miskalgazaal";
  locale: Locale;
  categoryName?: string;
  /** Real aggregates (approved reviews only) — fall back to catalog values. */
  rating?: number;
  reviewCount?: number;
  /** Public offers for the buy-box coupon picker. */
  coupons?: Coupon[];
  /** SEO H1 override — replaces the visible title as the single H1. */
  heading?: string;
}) {
  const t = useTranslations("Product");
  const router = useRouter();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const wished = has(product.slug);
  const onWish = async () => {
    const r = await toggle(product.slug);
    if (r === "login") router.push(`/account/login?next=/product/${product.slug}`);
    return r;
  };
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const stock = variant?.stock ?? 0;
  const maxQty = Math.max(1, Math.min(stock > 0 ? stock : 10, 20));
  // Always clamped at the point of use — no settle effects needed.
  const safeQty = Math.min(Math.max(1, qty), maxQty);
  // Real aggregates only: seeded catalog numbers never stand in.
  const liveRating = rating ?? product.rating;
  const liveCount = reviewCount ?? product.reviewCount;
  const title = tx(product.title, product.titleAr, locale);
  const catName =
    categoryName ?? product.categorySlugs[0]?.replace(/-/g, " ");

  const addToBag = (e?: React.MouseEvent) => {
    add({ productSlug: product.slug, variantId: variant?.id, qty: safeQty });
    if (e?.currentTarget instanceof HTMLElement) flyToBag(e.currentTarget, product.images[0]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };
  const [couponLogin,setCouponLogin]=useState(false);
  const buyNow = async () => {
    add({ productSlug: product.slug, variantId: variant?.id, qty: safeQty });
    if(localStorage.getItem("misk-coupon")){
      const {data:{user}}=await createBrowserClient().auth.getUser();
      if(!user){setCouponLogin(true);return;}
    }
    router.push("/checkout");
  };

  return (
    <div>
      <p className="eyebrow text-gold">{catName}</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-[2.75rem]">
        {heading ?? title}
      </h1>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-fog">
        <span className="flex gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "size-3.5",
                i < Math.round(liveRating)
                  ? "fill-gold text-gold"
                  : "text-ink/20"
              )}
            />
          ))}
        </span>
        {liveCount > 0 ? (
          <>{liveRating.toFixed(1)} · {liveCount.toLocaleString("en-US")} {t("reviews")}</>
        ) : (
          <Link href="#reviews" className="link-underline text-gold">
            {t("reviewCta")}
          </Link>
        )}
      </p>
      <PriceTag
        price={variant?.price ?? product.price}
        compareAtPrice={product.compareAtPrice}
        size="lg"
        className="mt-5"
      />

      <NotesStrip product={product} locale={locale} />

      {product.variants.length > 1 && (
        <div className="mt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
            {t("size")} — <span className="text-ink">{variant?.title}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                aria-pressed={v.id === variantId}
                className={cn(
                  "border px-5 py-2.5 text-[13px] transition",
                  v.id === variantId
                    ? "border-ink bg-ink text-white"
                    : "border-ink/20 text-espresso hover:border-ink"
                )}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 flex items-stretch gap-2">
        <span className="flex items-center border border-ink/20 bg-white">
          <button
            className="self-stretch px-3.5 text-espresso transition hover:text-ink disabled:opacity-30"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={safeQty <= 1}
            aria-label={t("decrease")}
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center font-display text-lg text-ink" aria-live="polite">
            {safeQty}
          </span>
          <button
            className="self-stretch px-3.5 text-espresso transition hover:text-ink disabled:opacity-30"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={safeQty >= maxQty}
            aria-label={t("increase")}
          >
            <Plus className="size-4" />
          </button>
        </span>
        <Button className="h-[52px] flex-1" size="lg" onClick={addToBag}>
          {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}{" "}
          {added ? t("added") : t("addToBag")}
        </Button>
        <WishHeart
          wished={wished}
          onToggle={onWish}
          label={t("wishlist")}
          className={cn(
            "flex w-[52px] items-center justify-center border transition",
            wished
              ? "border-[#9c2b2e]"
              : "border-ink/20 hover:border-ink",
          )}
          heartClassName="size-4"
        />
      </div>
      <Button variant="outline" size="lg" className="mt-2 w-full" onClick={buyNow}>
        {t("buyNow")}
      </Button>
      {couponLogin && <div role="status" className="mt-4 rounded-2xl border border-gold/30 bg-gold-wash p-5 text-sm"><p>{locale === "ar" ? "سجّل الدخول لاسترداد القسيمة. تم حفظ حقيبتك." : "Sign in to redeem this coupon. Your bag and selected code are saved."}</p><Link href="/account/login?next=%2Fcheckout" className="mt-3 inline-block underline">{locale === "ar" ? "تسجيل الدخول" : "Sign in & continue"}</Link><button className="ms-5 underline" onClick={() => { localStorage.removeItem("misk-coupon"); router.push("/checkout"); }}>{locale === "ar" ? "المتابعة بدون قسيمة" : "Continue without coupon"}</button></div>}
      {!!coupons?.length && (
        <PdpOffers slug={product.slug} price={variant?.price ?? product.price} coupons={coupons} locale={locale} />
      )}

      {layout === "miskalgazaal" ? (
        <div className="mt-8 border-t border-ink/10 pt-6">
          <p className="text-xs text-fog">
            Maison Misk Al Ghazaal · {product.categorySlugs[0]} · SKU{" "}
            {variant?.sku ?? product.slug}
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span className="text-[#9c2b2e]">{t("sellingFast")}</span>
              <span className="text-fog">{stock} {t("left")}</span>
            </div>
            <div className="mt-2 h-[3px] overflow-hidden bg-ink/10">
              <div
                className="h-full bg-gold"
                style={{ width: `${Math.min(100, stock * 4)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <TrustBadges locale={locale} />
        </div>
      )}
    </div>
  );
}

export function ProductTabsAccordion({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const t = useTranslations("Product");
  return (
    <div className="mt-12 border-t border-ink/10 pt-10">
      <p className="eyebrow text-gold">{t("detailsEyebrow")}</p>
      <h2 className="mt-2.5 font-display text-3xl text-ink">{t("detailsTitle")}</h2>
      <div
        className="mt-4 max-w-3xl text-[15px] leading-relaxed text-espresso"
        dangerouslySetInnerHTML={{
          __html: tx(product.descriptionHtml, product.descriptionAr, locale),
        }}
      />
      <div className="mt-8 grid gap-px border border-ink/10 bg-ink/10 text-sm md:grid-cols-2">
        <div className="bg-cream p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
            {t("shippingTitle")}
          </p>
          <p className="mt-2 leading-relaxed text-espresso">
            {t("shippingBody")}
          </p>
        </div>
        <div className="bg-cream p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
            {t("assuranceTitle")}
          </p>
          <p className="mt-2 leading-relaxed text-espresso">
            {t("assuranceBody")}
          </p>
        </div>
      </div>
    </div>
  );
}
