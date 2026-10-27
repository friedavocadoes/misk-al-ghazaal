/** Order status language: colors, chips, and the shopper timeline.
    Single source — admin list/detail and the account timeline share it. */

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "dispatched",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Linear journey; cancelled/returned branch off as terminal states. */
export const JOURNEY: { id: string; label: string; labelAr: string }[] = [
  { id: "new", label: "Placed", labelAr: "تم الطلب" },
  { id: "confirmed", label: "Confirmed", labelAr: "تم التأكيد" },
  { id: "dispatched", label: "Dispatched", labelAr: "تم الشحن" },
  { id: "out_for_delivery", label: "On its way", labelAr: "في الطريق" },
  { id: "delivered", label: "Delivered", labelAr: "تم التوصيل" },
];

const META: Record<OrderStatus, { chip: string; dot: string }> = {
  new: {
    chip: "border border-gold/50 bg-gold-wash/60 text-gold",
    dot: "bg-gold",
  },
  confirmed: {
    chip: "border border-ink bg-ink text-white",
    dot: "bg-ink",
  },
  dispatched: {
    chip: "border border-ink/25 bg-linen text-ink",
    dot: "bg-espresso",
  },
  out_for_delivery: {
    chip: "border border-[#1e7a46]/40 bg-[#1e7a46] text-white",
    dot: "bg-[#1e7a46]",
  },
  delivered: {
    chip: "border border-gold bg-gold-soft text-ink",
    dot: "bg-gold-soft",
  },
  cancelled: {
    chip: "border border-[#9c2b2e]/50 bg-[#9c2b2e] text-white",
    dot: "bg-[#9c2b2e]",
  },
  returned: {
    chip: "border border-ink/20 bg-sand text-fog",
    dot: "bg-fog",
  },
};

export function statusMeta(status: string): { chip: string; dot: string } {
  if(status === "packed") return META.confirmed;
  return (META as Record<string, { chip: string; dot: string }>)[status] ?? META.new;
}

export function statusLabel(status: string): string {
  // The DB value stays `new` (constraints, filters, history all key on it);
  // humans read what it means: placed and waiting for our confirmation.
  if (status === "new") return "New order";
  if (status === "packed") return "Packed (legacy)";
  return ({confirmed:"Confirmed",dispatched:"Dispatched",out_for_delivery:"Out for delivery",delivered:"Delivered",cancelled:"Cancelled",returned:"Returned"} as Record<string,string>)[status]??status.replaceAll("_", " ");
}

/** Index into JOURNEY (-1 for terminal states handled separately). */
export function journeyIndex(status: string): number {
  return JOURNEY.findIndex((s) => s.id === (status === "packed" ? "confirmed" : status));
}

export function OrderStatusChip({ status, className = "", label }: { status: string; className?: string; label?: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${meta.chip} ${className}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${meta.dot}`} />
      {label ?? statusLabel(status)}
    </span>
  );
}
