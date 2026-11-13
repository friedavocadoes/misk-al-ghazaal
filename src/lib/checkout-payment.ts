import { DIAL_CODES, splitPhone } from "./dial-codes";
import { whatsappPhone } from "./whatsapp-shared";

export const TAP_METHODS = ["card", "apple_pay", "tabby", "tamara"] as const;
export type TapMethod = typeof TAP_METHODS[number];
export type CheckoutMethod = "cod" | TapMethod;
export type PaymentLimits = { min: number; max?: number };
export type PaymentOptions = Partial<Record<TapMethod, PaymentLimits>>;
export type PaymentRestriction = "unavailable" | "minimum" | "maximum" | "uae" | "mobile" | "apple";
export const TAP_MERCHANT_MISMATCH = "payment:merchant_mismatch";

export function isTapMethod(value: unknown): value is TapMethod {
  return TAP_METHODS.some((method) => method === value);
}

export function tapPhone(phone: string) {
  const digits = whatsappPhone(phone);
  const countryCode = digits && DIAL_CODES.find(({ code }) => digits.startsWith(code))?.code;
  if (!digits || !countryCode) return null;
  return { country_code: countryCode, number: digits.slice(countryCode.length) };
}

export function checkoutPhoneInput(value: string, dial: string) {
  const text = value.trim().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15));
  const digits = text.replace(/\D/g, "");
  const international = text.startsWith("+") ? digits : text.startsWith("00") ? digits.slice(2)
    : /^9710?5\d{8}$/.test(digits) ? digits : "";
  if (international && DIAL_CODES.some(({ code }) => international.startsWith(code) && international.length > code.length)) {
    return splitPhone(international);
  }
  return { dial, national: digits.slice(0, 12) };
}

export function paymentRestriction(
  method: TapMethod,
  limits: PaymentLimits | undefined,
  total: number,
  country: string,
  phone: string,
  appleAvailable = true,
): PaymentRestriction | undefined {
  if (!limits) return "unavailable";
  if (total < limits.min) return "minimum";
  if (limits.max !== undefined && total > limits.max) return "maximum";
  if (method === "apple_pay" && !appleAvailable) return "apple";
  if (method === "tabby" || method === "tamara") {
    if (country !== "AE") return "uae";
    const mobile = tapPhone(phone);
    if (mobile?.country_code !== "971" || !/^5\d{8}$/.test(mobile.number)) return "mobile";
  }
}

export const PAYMENT_ATTEMPT_KEY = "misk-tap-attempt";
export type PaymentProof = { id: string; key: string };
export type BrowserPayment = PaymentProof & { bag?: string; coupon?: string; samples?: string; settled?: boolean };

export function checkoutPaymentStatusPath(locale: string, id: string) {
  return `${locale === "ar" ? "/ar" : ""}/checkout/payment?attempt=${encodeURIComponent(id)}`;
}

export function paymentBag(lines: { productSlug: string; variantId?: string; qty: number }[]) {
  return JSON.stringify(lines.map(line => JSON.stringify([line.productSlug, line.variantId ?? null, line.qty])).sort());
}

export function readPaymentProof(): BrowserPayment | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(PAYMENT_ATTEMPT_KEY) ?? "null");
    return typeof value?.id === "string" && typeof value?.key === "string" ? value : null;
  } catch {
    return null;
  }
}

export function forgetPaymentProof(id: string) {
  try {
    if (readPaymentProof()?.id === id) sessionStorage.removeItem(PAYMENT_ATTEMPT_KEY);
  } catch { /* Storage can become unavailable after a redirect. */ }
}
