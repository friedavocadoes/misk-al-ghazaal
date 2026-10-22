export const EVENT_TYPES = ["page_view", "product_view", "add_to_cart", "remove_from_cart", "checkout_started", "purchase", "survey_opportunity", "survey_shown", "survey_dismissed"] as const;
export type AnalyticsEventType = typeof EVENT_TYPES[number];
export type Attribution = Partial<Record<"source" | "medium" | "campaign" | "content" | "term" | "ref" | "landing_page" | "referrer", string>>;
export interface AnalyticsItem { product_id: string; product_name: string; price: number; quantity: number }
export interface EventInput {
  product_id?: string; product_name?: string; product_price?: number; quantity?: number;
  order_id?: string; revenue?: number; items?: AnalyticsItem[]; variant_id?: string; survey_type?:string; trigger?:string;
}
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function botReason(ua: string): string | null {
  if (/headless/i.test(ua)) return "headless";
  return /bot|crawler|spider|crawling|lighthouse|gtmetrix|pingdom|python|curl|wget|axios|facebookexternalhit|whatsapp|slackbot|gptbot|claudebot|bytespider/i.test(ua) ? "ua_crawler" : null;
}
export function cleanAttribution(value: unknown): Attribution {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Attribution = {};
  for (const key of ["source", "medium", "campaign", "content", "term", "ref", "landing_page", "referrer"] as const) {
    const text = (value as Record<string, unknown>)[key];
    if (typeof text === "string") result[key] = text.slice(0, 250);
  }
  return result;
}
export function attributionFromUrl(url: URL, referrer: string): Attribution {
  const values: Attribution = { landing_page: url.pathname.slice(0,250) };
  for (const key of ["source", "medium", "campaign", "content", "term"] as const) {
    const value = url.searchParams.get(`utm_${key}`);
    if (value) values[key] = value.slice(0,250);
  }
  const ref = url.searchParams.get("ref"); if (ref) values.ref = ref.slice(0,250);
  try { const origin = new URL(referrer); if (origin.hostname !== url.hostname) values.referrer = origin.hostname; } catch { /* direct */ }
  return values;
}
export function attributionCookie(touch: Attribution): string {
  const result = cleanAttribution(touch);
  // Bound the encoded cookie, including non-Latin campaign names, below 4 KB.
  while (encodeURIComponent(JSON.stringify(result)).length > 3000) {
    const key = (Object.keys(result) as (keyof Attribution)[]).sort((a,b)=>(result[b]?.length??0)-(result[a]?.length??0))[0];
    if (!key || !result[key]) break;
    result[key] = result[key]!.slice(0,Math.floor(result[key]!.length/2));
  }
  return JSON.stringify(result);
}
export function safePath(path: string): string { return path.split(/[?#]/)[0].slice(0,500) || "/"; }
export function csvCell(value: unknown): string {
  let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"','""')}"`;
}
