import "server-only";
import { isIP } from "node:net";
import { createHmac } from "node:crypto";
import { createAdminClient } from "../supabase/service";
import { analyticsLocation, uaeEmirate } from "./location";
export function publicIP(raw: string | null): string | null {
  const ip = (raw ?? "").trim();
  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    )
      return null;
    return ip;
  }
  if (
    isIP(ip) === 6 &&
    /^[23][0-9a-f]{3}:/i.test(ip) &&
    !/^2001:db8:/i.test(ip)
  )
    return ip.toLowerCase();
  return null;
}
export async function resolveAnalyticsLocation(req: Request) {
  const vercel = process.env.VERCEL === "1",
    proxy = process.env.ANALYTICS_TRUST_PROXY;
  const edge =
    vercel || proxy === "cloudflare"
      ? analyticsLocation({
          get: (key) =>
            key.startsWith(vercel ? "x-vercel-" : "cf-")
              ? req.headers.get(key)
              : null,
        })
      : analyticsLocation(new Headers());
  const raw = vercel
    ? (req.headers.get("x-vercel-forwarded-for") ??
      req.headers.get("x-forwarded-for"))
    : proxy === "cloudflare"
      ? req.headers.get("cf-connecting-ip")
      : proxy === "custom"
        ? req.headers.get("x-real-ip")
        : null;
  const ip = publicIP(raw);
  const secret = process.env.COMMUNICATION_PREFERENCES_SECRET;
  if (!ip || !secret || process.env.ANALYTICS_IP_LOOKUP === "0") return edge;
  try {
    const db = createAdminClient(),
      key = createHmac("sha256", secret).update(ip).digest("hex");
    const { data: cached, error } = await db
      .from("analytics_geo_cache")
      .select("location,expires_at")
      .eq("ip_hash", key)
      .maybeSingle();
    if (error) return edge;
    if (cached && Date.parse(cached.expires_at) > Date.now())
      return cached.location ?? edge;
    const { data: slot, error: slotError } = await db.rpc("geo_lookup_slot", {
      p_hash: key,
    });
    if (slotError || !slot) return edge;
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!response.ok) return edge;
    const d = await response.json();
    if (d.success !== true || !/^[A-Z]{2}$/.test(d.country_code ?? ""))
      return edge;
    const clean = (v: unknown) =>
      typeof v === "string"
        ? v
            .replace(/[\u0000-\u001f\u007f]/g, "")
            .trim()
            .slice(0, 120) || null
        : null;
    const country = d.country_code,
      region = clean(d.region_code ?? d.region),
      city = clean(d.city);
    const result = {
      country,
      region,
      city,
      emirate: country === "AE" ? uaeEmirate(region, city) : null,
      location_source: "ipwhois",
    };
    await db
      .from("analytics_geo_cache")
      .update({
        location: result,
        expires_at: new Date(Date.now() + 86400_000).toISOString(),
      })
      .eq("ip_hash", key);
    return result;
  } catch {
    return edge;
  }
}
