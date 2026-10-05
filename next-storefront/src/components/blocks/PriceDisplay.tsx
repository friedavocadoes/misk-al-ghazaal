import { cn, formatAED } from "@/lib/utils";

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
    <p
      className={cn(
        "flex items-baseline gap-2",
        size === "sm" && "text-sm",
        size === "md" && "text-base",
        size === "lg" && "text-2xl",
        className
      )}
    >
      <span className="font-bold text-emerald-950">{formatAED(price)}</span>
      {compareAtPrice && compareAtPrice > price && (
        <s className="text-stone-400">{formatAED(compareAtPrice)}</s>
      )}
    </p>
  );
}
