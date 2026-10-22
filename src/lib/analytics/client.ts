"use client";
import { attributionCookie, attributionFromUrl, uuid, type AnalyticsEventType, type EventInput } from "./shared";

let lastRoute = "";
let recentEvent = "";
let recentAt = 0;
let viewedProduct: EventInput | null = null;
export function lastViewedProduct(){ return viewedProduct; }
export const cookieValue = (name: string) => {
  try { return document.cookie.split("; ").find(s=>s.startsWith(name+"="))?.slice(name.length+1) ?? ""; } catch { return ""; }
};
function setCookie(name: string,value: string,age: number) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${age}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
export function ensureAnalyticsIdentity(): string {
  let sid = cookieValue("_as_id");
  if (!uuid(cookieValue("_av_id"))) setCookie("_av_id",crypto.randomUUID(),31536000);
  if (!uuid(sid)) { sid=crypto.randomUUID(); setCookie("_as_id",sid,1800); }
  setCookie("_as_id",sid,1800);
  // Fallback for cached pages / cookies expiring during a long SPA visit.
  const touch = encodeURIComponent(attributionCookie(attributionFromUrl(new URL(location.href),document.referrer)));
  if (!cookieValue("_utm_first")) setCookie("_utm_first",touch,31536000);
  if (!cookieValue("_utm_last")) setCookie("_utm_last",touch,2592000);
  return sid;
}
function clientBot() { return navigator.webdriver === true || (window.outerWidth === 0 && window.outerHeight === 0) || /HeadlessChrome/i.test(navigator.userAgent); }
export function trackEvent(type: AnalyticsEventType | "heartbeat",data: EventInput & {active_seconds?:number} = {}) {
  try {
    if (/^\/(admin|auth|api)(\/|$)/.test(location.pathname)) return;
    ensureAnalyticsIdentity();
    const payload = JSON.stringify({ ...data,id:crypto.randomUUID(),event_type:type,page_path:location.pathname,client_bot_detected:clientBot() });
    if (!navigator.sendBeacon?.("/api/analytics/collect",new Blob([payload],{type:"application/json"}))) {
      void fetch("/api/analytics/collect",{method:"POST",body:payload,headers:{"Content-Type":"application/json"},keepalive:true}).catch(()=>{});
    }
    if (type === "purchase") {
      sessionStorage.setItem(`analytics-purchased:${cookieValue("_as_id")}`,"1");
      window.dispatchEvent(new Event("analytics-purchased"));
    }
  } catch { /* analytics must never break an action */ }
}
export function trackRoute(path: string) {
  if (path === lastRoute) return;
  lastRoute=path; trackEvent("page_view");
  if (/^\/(?:ar\/)?checkout\/?$/.test(path.split("?")[0])) trackEvent("checkout_started");
}
export function trackProduct(data: EventInput) {
  viewedProduct=data;
  const key = `${cookieValue("_as_id")}:${location.pathname}:${data.product_id}`;
  if (key === recentEvent && Date.now()-recentAt<1000) return;
  recentEvent=key; recentAt=Date.now(); trackEvent("product_view",data);
}
export function markPurchase(orderId: string) {
  // UI suppression only. Revenue is recorded by the checkout server, not this call.
  try { ensureAnalyticsIdentity();sessionStorage.setItem(`analytics-purchased:${cookieValue("_as_id")}`,orderId);window.dispatchEvent(new Event("analytics-purchased")); } catch {}
}
