"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { privateOrderPath, attributionCookie, attributionFromUrl } from "@/lib/analytics/shared";
import { trackEvent, trackRoute } from "@/lib/analytics/client";

export function AnalyticsProvider() {
  const pathname = usePathname(); const query = useSearchParams();
  useEffect(() => {
    if(privateOrderPath(pathname))return;
    if (/^\/(admin|auth|api)(\/|$)/.test(pathname)) return;
    try {
      const touch=attributionFromUrl(new URL(location.href),document.referrer);
      if (["source","medium","campaign","content","term","ref"].some(k=>k in touch)) document.cookie=`_utm_last=${encodeURIComponent(attributionCookie(touch))}; Path=/; Max-Age=2592000; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;
      trackRoute(pathname + (query.toString() ? `?${query}` : ""));
    } catch {}
  },[pathname,query]);
  useEffect(() => {
    if (/^\/(admin|auth|api)(\/|$)/.test(location.pathname)) return;
    let last=Date.now(); let activeAt=Date.now();
    const activity=()=>{activeAt=Date.now();};
    const beat=()=>{
      const now=Date.now();
      if (document.visibilityState==="visible" && now-activeAt<60000) trackEvent("heartbeat",{active_seconds:Math.min(30,Math.round((now-last)/1000))});
      last=now;
    };
    const visibility=()=>{last=Date.now();if(document.visibilityState==="visible"){activeAt=last;trackEvent("heartbeat");}};
    const timer=setInterval(beat,30000);
    for(const event of ["pointerdown","pointermove","keydown","scroll"] as const) window.addEventListener(event,activity,{passive:true});
    document.addEventListener("visibilitychange",visibility);
    let previousUser: string | null | undefined;
    const {data:{subscription}}=createClient().auth.onAuthStateChange((event,session)=>{
      const current=session?.user.id??null;
      if(event==="SIGNED_OUT" || (previousUser && current && previousUser!==current))document.cookie="_as_id=; Path=/; Max-Age=0; SameSite=Lax";
      previousUser=current;
      if(document.visibilityState==="visible")trackEvent("heartbeat");
    });
    return ()=>{clearInterval(timer);subscription.unsubscribe();document.removeEventListener("visibilitychange",visibility);for(const event of ["pointerdown","pointermove","keydown","scroll"] as const) window.removeEventListener(event,activity);};
  },[]);
  return null;
}
