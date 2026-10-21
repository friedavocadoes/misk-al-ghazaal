import { Crown, Gift, Percent, Sparkles, Star, Tag, Ticket, Truck } from "lucide-react";

const ICONS: Record<string, typeof Tag> = {
  tag: Tag,
  percent: Percent,
  truck: Truck,
  gift: Gift,
  sparkles: Sparkles,
  crown: Crown,
  star: Star,
  ticket: Ticket,
};

/** Curated admin icon set for coupons (keys stored in coupons.icon). */
export const COUPON_ICONS = [...Object.keys(ICONS), "aed"];

export function CouponIcon({ icon, className }: { icon: string; className?: string }) {
  if (icon === "aed") return <span className={`inline-flex items-center justify-center font-sans text-[10px] font-medium tracking-[.06em] ${className ?? ""}`}>AED</span>;
  const Cmp = ICONS[icon] ?? Tag;
  return <Cmp className={className} />;
}
