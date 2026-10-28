export const ORDER_ACCESS_COOKIE = "misk-order-access";
export const validOrderToken = (token: unknown): token is string =>
  typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
export function rememberedOrderTokens(raw?: string): string[] {
  try {
    const value = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter(validOrderToken))].slice(-8)
      : [];
  } catch {
    return [];
  }
}
export function orderAccessPath(token: string): string {
  if (!validOrderToken(token)) throw new Error("Invalid order access key");
  return `/orders/${token}`;
}
