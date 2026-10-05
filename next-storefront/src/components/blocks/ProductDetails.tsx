"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "./PriceDisplay";
import { TrustBadges } from "./TrustBadges";

import { ProductGallery } from "@/components/product/ProductGallery";

export function ProductInfo({
  product,
  layout = "standard",
}: {
  product: Product;
  layout?: "standard" | "miskalgazaal";
}) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const variant =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const stock = variant?.stock ?? 0;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {product.isBestSeller && <Badge>Best Seller</Badge>}
        {product.isNew && <Badge variant="new">New</Badge>}
        {product.compareAtPrice && <Badge variant="sale">Sale</Badge>}
      </div>
      <h1 className="mt-3 text-3xl font-bold text-stone-900">{product.title}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
        <Star className="size-4 fill-amber-400 text-amber-400" />
        {product.rating} · {product.reviewCount.toLocaleString()} reviews
      </p>
      <PriceDisplay
        price={variant?.price ?? product.price}
        compareAtPrice={product.compareAtPrice}
        size="lg"
        className="mt-4"
      />

      {product.variants.length > 1 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-stone-900">
            Size: <span className="font-normal">{variant?.title}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${v.id === variantId ? "border-emerald-900 bg-emerald-950 text-white" : "border-stone-300 hover:border-stone-500"}`}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <div className="flex items-center rounded-full border border-stone-300">
          <button
            className="p-2.5"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button
            className="p-2.5"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button className="flex-1" size="lg">
          <ShoppingBag className="size-4" /> Add to Cart
        </Button>
      </div>
      <Button variant="outline" size="lg" className="mt-2 w-full">
        Buy It Now
      </Button>
      {layout === "miskalgazaal" ? (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-stone-500">
            Vendor: Gazaal · Type: {product.categorySlugs[0]} · SKU:{" "}
            {variant?.sku ?? product.slug}
          </p>
          <div>
            <div className="flex justify-between text-xs font-medium text-stone-600">
              <span>Hurry — selling fast</span>
              <span>{stock} left</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${Math.min(100, stock * 4)}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={wished ? "default" : "outline"}
              className="flex-1"
              onClick={() => setWished((w) => !w)}
            >
              {wished ? "♥ Wishlisted" : "♡ Add to Wishlist"}
            </Button>
            <Button variant="ghost" className="flex-1" asChild>
              <span>Share</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <TrustBadges />
        </div>
      )}
    </div>
  );
}

export function ProductTabsAccordion({ product }: { product: Product }) {
  return (
    <div className="mt-10 rounded-3xl border border-stone-200 p-6">
      <h2 className="text-lg font-bold">Product Details</h2>
      <div
        className="prose mt-3 max-w-none text-sm text-stone-600"
        dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
      />
      <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-2xl bg-stone-50 p-4">
          <p className="font-semibold">Shipping Charges</p>
          <p className="mt-1 text-stone-600">
            AED 0 free delivery above AED 400 (1–3 working days). Standard AED
            26 below AED 400. Remote areas up to 5 days.
          </p>
        </div>
        <div className="rounded-2xl bg-stone-50 p-4">
          <p className="font-semibold">Assurance</p>
          <p className="mt-1 text-stone-600">
            100% authentic, 7-day returns on unopened items, cash on delivery
            within UAE.
          </p>
        </div>
      </div>
    </div>
  );
}
