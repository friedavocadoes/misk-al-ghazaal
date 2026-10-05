"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriceTag } from "./PriceTag";

// Consolidates snippets/product-card-grid.liquid,
// product-card-grid-style2.liquid and product-card-left.liquid.
// Quiet-luxury styling: sharp edges, hairline borders, restrained badges.
export function ProductCard({
  product,
  layoutVariant = "grid",
  className,
}: {
  product: Product;
  layoutVariant?: "grid" | "style2" | "left";
  className?: string;
}) {
  const [wished, setWished] = useState(false);
  const [primary, secondary] = product.images;
  const onSale =
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > product.price;

  if (layoutVariant === "left") {
    return (
      <div
        className={cn(
          "flex gap-4 border border-ink/10 bg-white p-3",
          className
        )}
      >
        <Link
          href={`/product/${product.slug}`}
          className="relative h-28 w-24 shrink-0 overflow-hidden bg-sand"
        >
          <Image
            src={primary}
            alt={product.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col py-1">
          <Link
            href={`/product/${product.slug}`}
            className="truncate text-sm font-medium text-ink hover:text-gold"
          >
            {product.title}
          </Link>
          <span className="mt-1 flex items-center gap-1 text-xs text-fog">
            <Star className="size-3 fill-gold text-gold" />
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
          <span className="mt-auto flex items-center justify-between">
            <PriceTag
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              size="sm"
              showBadges={false}
            />
            <button
              className="border border-ink px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition hover:bg-ink hover:text-white"
              aria-label={`Add ${product.title} to cart`}
            >
              Add
            </button>
          </span>
        </div>
      </div>
    );
  }

  if (layoutVariant === "style2") {
    return (
      <Link
        href={`/product/${product.slug}`}
        className={cn("group relative block overflow-hidden bg-sand", className)}
      >
        <span className="block aspect-[3/4]">
          <Image
            src={primary}
            alt={product.title}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        </span>
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 pt-12">
          {onSale && (
            <span className="mb-1.5 inline-block bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
              Sale
            </span>
          )}
          <span className="block truncate text-sm font-medium text-white">
            {product.title}
          </span>
          <span className="mt-0.5 block">
            <PriceTag
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              size="sm"
              showBadges={false}
              className="[&_s]:text-white/60 [&_span]:!text-gold-wash"
            />
          </span>
        </span>
      </Link>
    );
  }

  // grid (default) — mirrors product-card-grid.liquid structure
  return (
    <div className={cn("group bg-transparent", className)}>
      <div className="relative aspect-[3/4] overflow-hidden bg-sand">
        <Link href={`/product/${product.slug}`} aria-label={product.title}>
          <Image
            src={primary}
            alt={product.title}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className={cn(
              "object-cover transition duration-500 group-hover:scale-[1.04]",
              secondary && "group-hover:opacity-0"
            )}
          />
          {secondary && (
            <Image
              src={secondary}
              alt=""
              aria-hidden
              fill
              sizes="(min-width:1024px) 25vw, 50vw"
              className="object-cover opacity-0 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
            />
          )}
        </Link>
        <span className="absolute left-0 top-3 flex flex-col gap-1">
          {onSale && (
            <span className="bg-[#9c2b2e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              Sale
            </span>
          )}
          {product.isNew && (
            <span className="bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              New
            </span>
          )}
        </span>
        <button
          onClick={() => setWished((w) => !w)}
          aria-label="Add to wishlist"
          aria-pressed={wished}
          className="absolute right-3 top-3 border border-ink/10 bg-white p-2 text-espresso shadow-sm transition hover:border-ink hover:text-ink"
        >
          <Heart className={cn("size-4", wished && "fill-[#9c2b2e] text-[#9c2b2e]")} />
        </button>
        <button
          className="absolute inset-x-0 bottom-0 translate-y-full bg-ink/95 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-transform duration-300 group-hover:translate-y-0"
          aria-label={`Add ${product.title} to cart`}
        >
          Add to Cart
        </button>
      </div>
      <div className="pt-3 text-center">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-1 text-[13px] font-medium uppercase tracking-[0.08em] text-ink hover:text-gold"
        >
          {product.title}
        </Link>
        <span className="mt-1 flex items-center justify-center gap-1 text-[11px] text-fog">
          <Star className="size-3 fill-gold text-gold" />
          {product.rating.toFixed(1)} · {product.reviewCount.toLocaleString()} reviews
        </span>
        <PriceTag
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          size="sm"
          className="mt-1 justify-center"
        />
      </div>
    </div>
  );
}
