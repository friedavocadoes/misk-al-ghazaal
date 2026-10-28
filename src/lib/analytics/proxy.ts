import type { NextRequest, NextResponse } from "next/server";
import { privateOrderPath, attributionCookie, attributionFromUrl, botReason, uuid } from "./shared";

/** Extend the existing locale/auth response without replacing its cookies. */
export function analyticsCookies(req: NextRequest, response: NextResponse): NextResponse {
  if(privateOrderPath(req.nextUrl.pathname))return response;
  if (req.headers.has("next-router-prefetch") || /prefetch/i.test(req.headers.get("purpose") ?? "")) return response;
  const options = { path: "/", sameSite: "lax" as const, secure: req.nextUrl.protocol === "https:" };
  const set = (key: string, value: string, maxAge: number) => response.cookies.set(key, value, {...options,maxAge});
  if (!uuid(req.cookies.get("_av_id")?.value)) set("_av_id",crypto.randomUUID(),31536000);
  const session = req.cookies.get("_as_id")?.value;
  set("_as_id",uuid(session) ? session : crypto.randomUUID(),1800);
  const touch = attributionFromUrl(req.nextUrl,req.headers.get("referer") ?? "");
  const campaign = ["source","medium","campaign","content","term","ref"].some(k => k in touch);
  const external = !!touch.referrer;
  if (!req.cookies.has("_utm_last") || campaign || external) set("_utm_last",attributionCookie(touch),2592000);
  if (!req.cookies.has("_utm_first")) set("_utm_first",attributionCookie(touch),31536000);
  if (botReason(req.headers.get("user-agent") ?? "")) set("_is_bot","1",1800);
  return response;
}
