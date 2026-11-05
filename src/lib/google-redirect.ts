export const GOOGLE_ATTEMPT_PREFIX = "__Host-mag-google-";

export function safeAuthNext(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value) || value.length > 2000) return fallback;
  return value;
}
