"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { ProductGallery } from "@/components/product/ProductGallery";
import type { Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/product/PriceTag";
import { TrustBadges } from "./TrustBadges";

export { ProductGallery };

export function ProductInfo({
  product,
  layout = "standard",
  locale,
  categoryName,
}: {
  product: Product;
  layout?: "standard" | "miskalgazaal";
  locale: Locale;
  categoryName?: string;
}) {
  const t = useTranslations("Product");
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const variant =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const stock = variant?.stock ?? 0;
  const title = tx(product.title, product.titleAr, locale);
  const catName =
    categoryName ?? product.categorySlugs[0]?.replace(/-/g, " ");

  return (
    <div>
      <p className="eyebrow text-gold">{catName}</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-[2.75rem]">
        {title}
      </h1>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-fog">
        <span className="flex gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "size-3.5",
                i < Math.round(product.rating)
                  ? "fill-gold text-gold"
                  : "text-ink/20"
              )}
            />
          ))}
        </span>
        {product.rating.toFixed(1)} · {product.reviewCount.toLocaleString("en-US")} {t("reviews")}
      </p>
      <PriceTag
        price={variant?.price ?? product.price}
        compareAtPrice={product.compareAtPrice}
        size="lg"
        className="mt-5"
      />

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
        <span className="flex items-center border border-ink/20">
          <button
            className="px-3 py-2 text-espresso transition hover:text-ink"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label={t("decrease")}
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            className="px-3 py-2 text-espresso transition hover:text-ink"
            onClick={() => setQty((q) => q + 1)}
            aria-label={t("increase")}
          >
            <Plus className="size-4" />
          </button>
        </span>
        <Button className="h-[52px] flex-1" size="lg">
          <ShoppingBag className="size-4" /> {t("addToBag")}
        </Button>
        <button
          onClick={() => setWished((w) => !w)}
          aria-label={t("wishlist")}
          aria-pressed={wished}
          className={cn(
            "border px-4 transition",
            wished
              ? "border-[#9c2b2e] text-[#9c2b2e]"
              : "border-ink/20 text-espresso hover:border-ink hover:text-ink"
          )}
        >
          <Heart className={cn("size-4", wished && "fill-[#9c2b2e]")} />
        </button>
      </div>
      <Button variant="outline" size="lg" className="mt-2 w-full">
        {t("buyNow")}
      </Button>

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
