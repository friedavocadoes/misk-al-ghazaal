import {
  ProductCard as CanonicalCard,
} from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

const VARIANT_MAP = {
  default: "grid",
  compact: "left",
  search: "left",
  list: "left",
} as const;

/** @deprecated Use `ProductCard` from `@/components/product/ProductCard`
 *  with `layoutVariant="grid" | "style2" | "left"`. Thin adapter. */
export function ProductCard({
  product,
  variant = "default",
}: {
  product: Product;
  variant?: keyof typeof VARIANT_MAP;
}) {
  return <CanonicalCard product={product} layoutVariant={VARIANT_MAP[variant]} />;
}
