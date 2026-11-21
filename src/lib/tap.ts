import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { TAP_METHODS, type PaymentOptions, type TapMethod } from "./checkout-payment";

const sources: Record<TapMethod, string> = {
  card: "src_card",
  apple_pay: "src_apple_pay",
  tabby: "src_tabby.installement",
  tamara: "src_tamara",
};

const TAP_SHARED_TEST_MERCHANT_ID = "599424";

function limit(value: string | undefined) {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

export function tapConfig(requestOrigin = process.env.TAP_SITE_URL?.trim() ?? "") {
  if (!URL.canParse(requestOrigin)) return null;
  const requested = new URL(requestOrigin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(requested.hostname);
  const mode = local ? "test" : "live";
  const secret = (process.env[local ? "TAP_TEST_SECRET_KEY" : "TAP_LIVE_SECRET_KEY"] ?? process.env.TAP_SECRET_KEY ?? "").trim();
  const publicKey = (process.env[local ? "TAP_TEST_PUBLIC_KEY" : "TAP_LIVE_PUBLIC_KEY"] ?? process.env.TAP_PUBLIC_KEY ?? "").trim();
  const merchant = process.env.TAP_MERCHANT_ID?.trim() ?? "";
  const origin = requested.origin;
  if (!new RegExp(`^sk_${mode}_\\S+$`).test(secret) || !/^\d+$/.test(merchant)) return null;
  if (local) {
    if (!["http:", "https:"].includes(requested.protocol)) return null;
  } else {
    const site = process.env.TAP_SITE_URL?.trim() ?? "";
    if (requested.protocol !== "https:" || !URL.canParse(site) || new URL(site).origin !== origin ||
        !/^pk_live_\S+$/.test(publicKey) || merchant === TAP_SHARED_TEST_MERCHANT_ID) return null;
  }
  const live = !local;
  const account = merchant;
  const merchantScope = local ? `localhost:${account}` : account;

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
  return { secret, publicKey, merchant, merchantScope, origin, methods, live, local };
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
  response?: { code?: string; message?: string };
  gateway?: { response?: { code?: string; message?: string } };
  reference?: { transaction?: string; order?: string; gateway?: string; payment?: string };
  transaction?: { url?: string; created?: string };
};

export const validChargeId = (id: unknown): id is string => typeof id === "string" && /^chg_[a-zA-Z0-9_-]{1,100}$/.test(id);

export class TapRequestError extends Error {
  constructor(readonly rejected: boolean, readonly httpStatus: number, readonly code?: string, readonly methodUnavailable = false) { super("Tap request failed"); }
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
    const code = String(result?.errors?.[0]?.code ?? "");
    throw new TapRequestError(
      Boolean(payload && [400, 422].includes(response.status) && Array.isArray(result?.errors)),
      response.status,
      /^\d{1,6}$/.test(code) ? code : undefined,
      code === "1125" || /not enabled|not supported|merchant.code|channel.partner|invalid source|source.*invalid/i.test(String(result?.errors?.[0]?.description ?? "")),
    );
  }
  return result as TapCharge;
}

export function createTapCharge(config: TapConfig, attempt: {
  id: string; method: TapMethod; amount: number; locale: "en" | "ar"; token?: string;
  customer: { first_name: string; last_name?: string; email?: string; phone: { country_code: string; number: string } };
}) {
  const { id, method, locale } = attempt;
  const redirect = new URL(`${locale === "ar" ? "/ar" : ""}/checkout/payment`, config.origin);
  redirect.searchParams.set("attempt", id);
  return tapRequest(config, "", {
    amount: attempt.amount,
    currency: "AED",
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    description: "Misk Al Ghazaal order",
    ...(config.merchant ? { merchant: { id: config.merchant } } : {}),
    customer: attempt.customer,
    reference: { order: id, transaction: id, idempotent: id },
    source: { id: attempt.token ?? sources[method] },
    ...(!config.local ? { post: { url: `${config.origin}/api/checkout/payment/webhook` } } : {}),
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
