import { cn, formatAED } from "@/lib/utils";

// Converted from snippets/price.liquid:
//  - .price__regular when no sale, .price__sale (compare <s> + sale price) on discount
//  - .price--sold-out state, optional Sale / Sold Out badges.
export function PriceTag({
  price,
  compareAtPrice,
  available = true,
  showBadges = true,
  size = "md",
  className,
}: {
  price: number;
  compareAtPrice?: number;
  available?: boolean;
  showBadges?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const onSale =
    compareAtPrice !== undefined && compareAtPrice > price && available;

  return (
    <span
      data-lens-sharp
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
        !available && "opacity-70",
        className,
      )}
    >
      {onSale ? (
        <>
          <s className="text-fog">{formatAED(compareAtPrice)}</s>
          <span
            className={cn(
              "font-medium text-[#9c2b2e]",
              size === "sm" && "text-sm",
              size === "md" && "text-base",
              size === "lg" && "text-2xl",
            )}
          >
            {formatAED(price)}
          </span>
          {showBadges && (
            <span className="bg-[#9c2b2e] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
              Sale
            </span>
          )}
        </>
      ) : (
        <span
          className={cn(
            "font-medium text-ink",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-2xl",
          )}
        >
          {formatAED(price)}
        </span>
      )}
      {!available && showBadges && (
        <span className="bg-ink px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
          Sold out
        </span>
      )}
    </span>
  );
}
