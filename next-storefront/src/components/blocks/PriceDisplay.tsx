import { PriceTag } from "@/components/product/PriceTag";

/** @deprecated Use `PriceTag` from `@/components/product/PriceTag`. Kept for older imports. */
export function PriceDisplay({
  price,
  compareAtPrice,
  className,
  size = "md",
}: {
  price: number;
  compareAtPrice?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <PriceTag
      price={price}
      compareAtPrice={compareAtPrice}
      size={size}
      showBadges={false}
      className={className}
    />
  );
}
