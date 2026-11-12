import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { TAP_METHODS, type PaymentOptions, type TapMethod } from "./checkout-payment";

const sources: Record<TapMethod, string> = {
  card: "src_card",
  apple_pay: "src_apple_pay",
  tabby: "src_tabby.installement",
  tamara: "src_tamara",
};

function limit(value: string | undefined) {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

export function tapConfig() {
  const secret = process.env.TAP_SECRET_KEY?.trim() ?? "";
  const merchant = process.env.TAP_MERCHANT_ID?.trim() ?? "";
  const site = process.env.TAP_SITE_URL?.trim() ?? "";
  const origin = URL.canParse(site) ? new URL(site).origin : "";
  if (!/^sk_(test|live)_\S+$/.test(secret) || (merchant && !/^\d+$/.test(merchant)) || !origin.startsWith("https://")) return null;
  const live = secret.startsWith("sk_live_");
  if (!live && process.env.VERCEL_ENV === "production") return null;
  // Keep retries scoped to the original credentials when Tap selects the merchant.
  const merchantScope = merchant || `key:${createHash("sha256").update(secret).digest("hex")}`;

  const methods: PaymentOptions = {};
  const enabled = (process.env.TAP_PAYMENT_METHODS ?? "").split(",").map((method) => method.trim());
  for (const method of TAP_METHODS) {
    if (!enabled.includes(method)) continue;
    const prefix = `TAP_${method.toUpperCase()}`;
    const min = limit(process.env[`${prefix}_MIN_AED`]);
    const max = limit(process.env[`${prefix}_MAX_AED`]);
    if ((process.env[`${prefix}_MIN_AED`] && min === undefined) || (process.env[`${prefix}_MAX_AED`] && max === undefined)) continue;
    if (method === "tamara" && (min === undefined || max === undefined)) continue;
    const minimum = Math.max(min ?? 0, method === "tabby" ? 10 : 0.1);
    if (max !== undefined && max < minimum) continue;
    methods[method] = { min: minimum, max };
  }
  return { secret, merchant, merchantScope, origin, methods, live };
}

export type TapConfig = NonNullable<ReturnType<typeof tapConfig>>;
export type TapCharge = {
  id: string;
  object?: string;
  status: string;
  amount: number;
  currency: string;
  live_mode: boolean;
  merchant?: { id?: string };
  merchant_id?: string;
  reference?: { transaction?: string; order?: string; gateway?: string; payment?: string };
  transaction?: { url?: string; created?: string };
};

export const validChargeId = (id: unknown): id is string => typeof id === "string" && /^chg_[a-zA-Z0-9_-]{1,100}$/.test(id);

export class TapRequestError extends Error {
  constructor(readonly rejected: boolean) { super("Tap request failed"); }
}

async function tapRequest(config: TapConfig, path: string, payload?: object, locale = "en") {
  const response = await fetch(`https://api.tap.company/v2/charges${path}`, {
    method: payload ? "POST" : "GET",
    headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json", lang_code: locale },
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !validChargeId(result?.id)) {
    throw new TapRequestError(Boolean(payload && [400, 422].includes(response.status) && Array.isArray(result?.errors)));
  }
  return result as TapCharge;
}

export function createTapCharge(config: TapConfig, attempt: {
  id: string; method: TapMethod; amount: number; locale: "en" | "ar";
  customer: { first_name: string; last_name?: string; email?: string; phone: { country_code: string; number: string } };
}) {
  const { id, method, locale } = attempt;
  const redirect = new URL(`${locale === "ar" ? "/ar" : ""}/checkout/payment`, config.origin);
  redirect.searchParams.set("attempt", id);
  return tapRequest(config, "", {
    amount: attempt.amount,
    currency: "AED",
    customer_initiated: true,
    threeDSecure: method === "card" || method === "apple_pay",
    save_card: false,
    description: "Misk Al Ghazaal order",
    ...(config.merchant ? { merchant: { id: config.merchant } } : {}),
    customer: attempt.customer,
    reference: { order: id, transaction: id, idempotent: id },
    source: { id: sources[method] },
    post: { url: `${config.origin}/api/checkout/payment/webhook` },
    redirect: { url: redirect.toString() },
  }, locale);
}

export async function retrieveTapCharge(config: TapConfig, id: string) {
  if (!validChargeId(id)) throw new Error("Invalid Tap charge ID");
  const charge = await tapRequest(config, `/${id}`);
  if (charge.id !== id) throw new Error("Tap returned a different charge ID");
  return charge;
}

export function tapPaymentUrl(url: string | undefined, method: TapMethod = "card") {
  if (!url || !URL.canParse(url)) return undefined;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return undefined;
  const domains = method === "tabby" ? ["tap.company", "tabby.ai", "tabby.dev"]
    : method === "tamara" ? ["tap.company", "tamara.co"] : ["tap.company"];
  if (domains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) return parsed.href;
}

export function verifyTapWebhook(charge: TapCharge, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature) || charge.object !== "charge" ||
      !validChargeId(charge.id) || charge.currency !== "AED" || !Number.isFinite(charge.amount) ||
      typeof charge.status !== "string" || !charge.transaction?.created) return false;
  const { gateway, payment } = charge.reference ?? {};
  const payload = `x_id${charge.id}x_amount${charge.amount.toFixed(2)}x_currencyAEDx_gateway_reference${gateway ?? ""}x_payment_reference${payment ?? ""}x_status${charge.status}x_created${charge.transaction.created}`;
  const expected = createHmac("sha256", secret).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
