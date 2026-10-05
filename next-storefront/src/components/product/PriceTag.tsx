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
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
        !available && "opacity-70",
        className
      )}
    >
      {onSale ? (
        <>
          <s className="text-stone-400">{formatAED(compareAtPrice)}</s>
          <span
            className={cn(
              "font-bold text-red-700",
              size === "sm" && "text-sm",
              size === "md" && "text-base",
              size === "lg" && "text-2xl"
            )}
          >
            {formatAED(price)}
          </span>
          {showBadges && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Sale
            </span>
          )}
        </>
      ) : (
        <span
          className={cn(
            "font-bold text-emerald-950",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-2xl"
          )}
        >
          {formatAED(price)}
        </span>
      )}
      {!available && showBadges && (
        <span className="rounded-full bg-stone-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Sold out
        </span>
      )}
    </span>
  );
}
