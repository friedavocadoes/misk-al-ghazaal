"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, Heart, ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriceTag } from "./PriceTag";

// Consolidates snippets/product-card-grid.liquid,
// product-card-grid-style2.liquid and product-card-left.liquid.
//  - grid   → classic card: hover secondary image, sale flag, wishlist +
//             quickview/add-to-cart hover buttons, title, review badge, price
//  - style2 → overlay style: image with bottom gradient info panel
//  - left   → horizontal: thumbnail left, info right (cart/search/upsell rows)
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
          "flex gap-4 rounded-2xl border border-stone-100 bg-white p-3",
          className
        )}
      >
        <Link
          href={`/product/${product.slug}`}
          className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100"
        >
          <Image
            src={primary}
            alt={product.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={`/product/${product.slug}`}
            className="truncate text-sm font-semibold text-stone-900 hover:text-emerald-900"
          >
            {product.title}
          </Link>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
            <Star className="size-3 fill-amber-400 text-amber-400" />
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
              className="rounded-full bg-emerald-950 p-2 text-white hover:bg-emerald-800"
              aria-label={`Add ${product.title} to cart`}
            >
              <ShoppingBag className="size-3.5" />
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
        className={cn(
          "group relative block overflow-hidden rounded-2xl bg-stone-100",
          className
        )}
      >
        <span className="block aspect-[3/4]">
          <Image
            src={primary}
            alt={product.title}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </span>
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-10">
          {onSale && (
            <span className="mb-1 inline-block rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Sale
            </span>
          )}
          <span className="block truncate text-sm font-semibold text-white">
            {product.title}
          </span>
          <span className="mt-0.5 block text-sm font-bold text-amber-300">
            <PriceTag
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              size="sm"
              showBadges={false}
              className="[&_s]:text-white/60 [&_span]:!text-amber-300"
            />
          </span>
        </span>
      </Link>
    );
  }

  // grid (default) — mirrors product-card-grid.liquid structure
  return (
    <div
      className={cn(
        "card-wrapper group overflow-hidden rounded-2xl border border-stone-100 bg-white transition hover:shadow-lg",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <Link href={`/product/${product.slug}`} aria-label={product.title}>
          <Image
            src={primary}
            alt={product.title}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className={cn(
              "object-cover transition duration-300",
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
              className="object-cover opacity-0 transition duration-300 group-hover:opacity-100"
            />
          )}
        </Link>
        {onSale && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Sale
          </span>
        )}
        {product.isNew && (
          <span className="absolute left-2 top-8 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            New
          </span>
        )}
        <button
          onClick={() => setWished((w) => !w)}
          aria-label="Add to wishlist"
          className={cn(
            "absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow hover:text-red-600",
            wished ? "text-red-600" : "text-stone-500"
          )}
        >
          <Heart className={cn("size-4", wished && "fill-red-600")} />
        </button>
        <span className="absolute inset-x-2 bottom-2 hidden gap-2 group-hover:flex">
          <span className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white/95 py-2 text-xs font-semibold text-stone-900 shadow">
            <Eye className="size-3.5" /> Quick view
          </span>
          <button
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-950 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-800"
            aria-label={`Add ${product.title} to cart`}
          >
            <ShoppingBag className="size-3.5" /> Add to cart
          </button>
        </span>
      </div>
      <div className="p-4">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 min-h-10 text-sm font-semibold text-stone-900 hover:text-emerald-900"
        >
          {product.title}
        </Link>
        <span className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          {product.rating.toFixed(1)} ({product.reviewCount.toLocaleString()})
        </span>
        <PriceTag
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          size="sm"
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
