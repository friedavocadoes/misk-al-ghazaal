"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { X, ArrowUpRight, Check } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCartMeta } from "@/lib/cart-meta";
import { cookieValue, ensureAnalyticsIdentity } from "@/lib/analytics/client";
import type { AnalyticsItem } from "@/lib/analytics/shared";

const OPTIONS = [
  ["shipping_cost","Shipping or extra fees","الشحن أو الرسوم الإضافية"],
  ["just_browsing","Just browsing / comparing","أتصفح وأقارن فقط"],
  ["price_too_high","The price","السعر"],
  ["delivery_time","Delivery time","مدة التوصيل"],
  ["payment_issue","My preferred payment method","طريقة الدفع المفضلة"],
  ["other","Something else","سبب آخر"],
] as const;
export function CartAbandonmentSurvey() {
  const {lines}=useCart();const {meta}=useCartMeta(lines.map(l=>l.productSlug));
  const path=usePathname();const ar=useLocale()==="ar";
  const [open,setOpen]=useState(false);const [reason,setReason]=useState("");const [comment,setComment]=useState("");const [sent,setSent]=useState(false);
  const snapshot=useRef<AnalyticsItem[]>([]); const previous=useRef(path);const entered=useRef(0);
  useEffect(()=>{if(lines.length && !entered.current)entered.current=Date.now();if(!lines.length)entered.current=0;if(lines.length) snapshot.current=lines.map(l=>({product_id:l.productSlug,product_name:meta[l.productSlug]?.title??l.productSlug,price:meta[l.productSlug]?.variants?.find(v=>v.id===l.variantId)?.price??meta[l.productSlug]?.price??0,quantity:l.qty}));},[lines,meta]);
  useEffect(()=>{
    const shopping=/^\/(?:ar\/)?(?:checkout|cart)\/?$/.test(path);
    const old=previous.current; previous.current=path;
    function purchased(){try{return !!sessionStorage.getItem(`analytics-purchased:${cookieValue("_as_id")}`);}catch{return false;}}
    function show() {
      if(paused || purchased() || !snapshot.current.length || document.visibilityState!=="visible" || document.querySelector('[role="dialog"][data-state="open"]'))return;
      try {const sid=ensureAnalyticsIdentity();const key=`analytics-survey:${sid}`;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");}catch{return;}
      setOpen(true);
    }
    let paused=false;
    const pause=()=>{paused=true;if(idle)clearTimeout(idle);};
    let routeTimer: ReturnType<typeof setTimeout> | undefined;
    if(old!==path && /^\/(?:ar\/)?(?:checkout|cart)\/?$/.test(old)) routeTimer=setTimeout(show,800);
    const cartChange=(event: Event)=>{
      const detail=(event as CustomEvent<{empty:boolean}>).detail;
      if(detail?.empty) setTimeout(show,800);
    };
    const exit=(event: MouseEvent)=>{if(event.clientY<=0 && (shopping || (lines.length && Date.now()-entered.current>60000)))show();};
    let idle: ReturnType<typeof setTimeout> | undefined;
    const reset=()=>{if(idle)clearTimeout(idle);if(shopping && lines.length && matchMedia("(pointer: coarse)").matches)idle=setTimeout(show,45000);};
    const stop=()=>{setOpen(false);if(idle)clearTimeout(idle);};
    reset(); document.addEventListener("mouseout",exit);window.addEventListener("analytics-cart-change",cartChange);window.addEventListener("analytics-purchased",stop);window.addEventListener("analytics-checkout-attempt",pause);
    for(const event of ["pointerdown","keydown","scroll"] as const)window.addEventListener(event,reset,{passive:true});
    return()=>{if(idle)clearTimeout(idle);if(routeTimer)clearTimeout(routeTimer);document.removeEventListener("mouseout",exit);window.removeEventListener("analytics-cart-change",cartChange);window.removeEventListener("analytics-purchased",stop);window.removeEventListener("analytics-checkout-attempt",pause);for(const event of ["pointerdown","keydown","scroll"] as const)window.removeEventListener(event,reset);};
  },[path,lines.length]);
  useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false);};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[open]);
  if(!open)return null;
  const submit=()=>{
    setSent(true);
    void fetch("/api/analytics/survey",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({reason,custom_comment:reason==="other"?comment:"",cart_items:snapshot.current})}).catch(()=>{});
    setTimeout(()=>setOpen(false),1800);
  };
  return <aside aria-label={ar?"ملاحظات التسوق":"Shopping feedback"} className="analytics-survey" dir={ar?"rtl":"ltr"}>
    <button type="button" onClick={()=>setOpen(false)} aria-label={ar?"إغلاق":"Dismiss feedback"} className="absolute end-3 top-3 p-2 text-fog"><X size={17}/></button>
    {sent?<div className="py-8 text-center" role="status"><Check className="mx-auto mb-4 text-gold"/><p>{ar?"شكراً لملاحظاتك.":"Thank you. We’re listening."}</p></div>:<>
      <p className="text-[9px] uppercase tracking-[.18em] text-gold">{ar?"لحظة من وقتك":"A moment of your time"}</p>
      <h2 className="mt-3 text-xl font-light">{ar?"أجلت طلبك اليوم؟":"Decided not to order today?"}</h2>
      <p className="mt-2 text-xs leading-5 text-fog">{ar?"ما الذي جعلك تتردد؟ يستغرق ثانيتين.":"Tell us what held you back. It takes two seconds."}</p>
      <fieldset className="mt-4 grid gap-1"><legend className="sr-only">{ar?"السبب":"What held you back?"}</legend>{OPTIONS.map(([value,en,arabic])=><label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-xs hover:bg-sand/50"><input type="radio" name="abandonment-reason" value={value} checked={reason===value} onChange={()=>setReason(value)} className="accent-[#8a6d2f]"/>{ar?arabic:en}</label>)}</fieldset>
      {reason==="other"&&<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} rows={2} aria-label={ar?"تفاصيل اختيارية":"Optional feedback"} placeholder={ar?"أخبرنا أكثر (اختياري)":"A few words, if you like"} className="mt-3 w-full rounded-lg border border-ink/15 p-3 text-xs"/>}
      <button type="button" disabled={!reason} onClick={submit} className="mt-4 flex w-full items-center justify-between rounded-lg bg-ink px-4 py-3 text-xs text-white disabled:opacity-40">{ar?"إرسال":"Share feedback"}<ArrowUpRight size={15}/></button>
    </>}
  </aside>;
}
