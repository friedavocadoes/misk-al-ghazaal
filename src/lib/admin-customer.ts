/** Pure presentation rules shared by the order and customer workspaces. */
export function money(value: unknown): string {
  return `AED ${Number(value ?? 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function adminDate(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}
export function isAccountBanned(
  until: string | null | undefined,
  now = Date.now(),
): boolean {
  return !!until && Date.parse(until) > now;
}
export interface DeliveryRecord {
  address?: string;
  city?: string;
  emirate?: string;
  state_name?: string;
  country_code?: string;
  postcode?: string;
  address_label?: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
}
export function deliveryDetails(order: DeliveryRecord) {
  const country =
    order.country_code && /^[a-z]{2}$/i.test(order.country_code)
      ? new Intl.DisplayNames(["en"], { type: "region" }).of(
          order.country_code.toUpperCase(),
        )
      : order.country_code;
  const lines = [
    ...new Set(
      [
        order.address,
        order.city,
        order.state_name || order.emirate,
        order.postcode,
        country,
      ]
        .map((v) => v?.trim())
        .filter((v): v is string => !!v),
    ),
  ];
  const lat = order.delivery_lat,
    lng = order.delivery_lng;
  const pinned =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
  const coordinates = pinned ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : null;
  return {
    lines,
    coordinates,
    mapHref:
      coordinates || lines.length
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates ?? lines.join(", "))}`
        : null,
  };
}
export interface CustomerSummary {
  orders: number;
  previous_orders: number;
  paid_total: number;
  first_order: string | null;
  latest_order: string | null;
}
export function canManageCustomer(
  actorId: string,
  targetId: string,
  targetRole: string,
): boolean {
  return actorId !== targetId && targetRole === "customer";
}
