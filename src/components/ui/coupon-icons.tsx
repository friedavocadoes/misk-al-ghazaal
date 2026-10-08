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
export const COUPON_ICONS = Object.keys(ICONS);

export function CouponIcon({ icon, className }: { icon: string; className?: string }) {
  const Cmp = ICONS[icon] ?? Tag;
  return <Cmp className={className} />;
}
