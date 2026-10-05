import Link from "next/link";
import { Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "./PriceDisplay";

// Unified card replacing product-card-grid, -style2, -search, -left, -placeholder*.
export function ProductCard({
  product,
  variant = "default",
}: {
  product: Product;
  variant?: "default" | "compact" | "search" | "list";
}) {
  const onSale =
    product.compareAtPrice && product.compareAtPrice > product.price;

  if (variant === "compact") {
    return (
      <Link
        href={`/product/${product.slug}`}
        className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 hover:shadow-md"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={product.title}
          className="size-14 rounded-xl object-cover"
          loading="lazy"
        />
        <span>
          <span className="block text-sm font-semibold text-stone-900">
            {product.title}
          </span>
          <PriceDisplay
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="sm"
          />
        </span>
      </Link>
    );
  }

  if (variant === "list" || variant === "search") {
    return (
      <Link
        href={`/product/${product.slug}`}
        className="flex gap-4 rounded-2xl border border-stone-100 bg-white p-4 hover:shadow-md"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={product.title}
          className="h-28 w-24 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
        <span className="flex flex-col">
          <span className="font-semibold text-stone-900">{product.title}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {product.rating} ({product.reviewCount})
          </span>
          <PriceDisplay
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="sm"
            className="mt-auto"
          />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        "group overflow-hidden rounded-2xl border border-stone-100 bg-white transition hover:shadow-lg"
      )}
    >
      <span className="relative block aspect-square overflow-hidden bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={product.title}
          className="size-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-2 top-2 flex gap-1">
          {onSale && <Badge variant="sale">Sale</Badge>}
          {product.isNew && <Badge variant="new">New</Badge>}
        </span>
      </span>
      <span className="block p-4">
        <span className="line-clamp-2 min-h-10 text-sm font-semibold text-stone-900">
          {product.title}
        </span>
        <span className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          {product.rating} ({product.reviewCount.toLocaleString()})
        </span>
        <PriceDisplay
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          size="sm"
          className="mt-2"
        />
      </span>
    </Link>
  );
}
