export function analyticsCollectionEnabled(hostname?: string) {
  if (process.env.ANALYTICS_ENABLE_NON_PRODUCTION === "1") return true;
  if (hostname && ["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return false;
  return (process.env.VERCEL_ENV ?? process.env.NODE_ENV) === "production";
}
