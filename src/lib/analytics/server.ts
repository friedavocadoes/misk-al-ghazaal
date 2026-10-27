import "server-only";
import { refreshDemandRanking } from "@/lib/demand-ranking";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { botReason, cleanAttribution, uuid, type AnalyticsItem } from "./shared";
import { analyticsLocation } from "./location";

export async function analyticsSession(req: Request, clientBot = false, activeSeconds = 0, userId?: string | null) {
  const jar = await cookies();
  const parse = (key: string) => { try { return cleanAttribution(JSON.parse(decodeURIComponent(jar.get(key)?.value ?? "{}"))); } catch { return {}; } };
  const sid = jar.get("_as_id")?.value; const vid = jar.get("_av_id")?.value;
  if (!uuid(sid) || !uuid(vid)) return null;
  const first = parse("_utm_first"), last = parse("_utm_last");
  const ua = req.headers.get("user-agent") ?? "";
  const reason = botReason(ua) ?? (clientBot ? "webdriver_detected" : jar.get("_is_bot")?.value === "1" ? "ua_crawler" : null);
  let owner = userId;
  if (owner === undefined) {
    const {data:{user}} = await (await createClient()).auth.getUser(); owner = user?.id ?? null;
  }
  return { id:sid, visitor_id:vid, user_id:owner, is_bot:!!reason, bot_reason:reason,
    first_touch_utm:first, last_touch_utm:last, referrer_domain:first.referrer ?? "direct",
    device_type:/ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop",
    ...analyticsLocation(req.headers),
    active_seconds:Math.min(60,Math.max(0,Math.floor(activeSeconds))) };
}
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  return !origin || origin === new URL(req.url).origin;
}
export async function readSmallBody(req: Request): Promise<Record<string, unknown> | null> {
  if (Number(req.headers.get("content-length")) > 16000) return null;
  const reader=req.body?.getReader(); if(!reader)return null;
  const decoder=new TextDecoder();let bytes=0,raw="";
  try {
    while(true){
      const chunk=await reader.read();if(chunk.done)break;
      bytes+=chunk.value.byteLength;
      if(bytes>16000){await reader.cancel();return null;}
      raw+=decoder.decode(chunk.value,{stream:true});
    }
    raw+=decoder.decode();
  }finally{reader.releaseLock();}
  const value: unknown = JSON.parse(raw);
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : null;
}
export async function recordPurchase(req: Request, orderId: string, revenue: number, items: AnalyticsItem[], userId: string | null) {
  try {
    const session = await analyticsSession(req,false,0,userId); if (!session) { await refreshDemandRanking(); return; }
    await createAdminClient().rpc("ingest_analytics_event",{p_session:session,p_event:{event_type:"purchase",page_path:"/checkout",order_id:orderId,revenue,metadata:{items,verified:true,payment_method:"cod"}}});
    await refreshDemandRanking();
  } catch { /* Analytics never changes the outcome of an order. */ }
}
