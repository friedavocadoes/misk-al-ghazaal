"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { X, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCartMeta } from "@/lib/cart-meta";
import { ensureAnalyticsIdentity, lastViewedProduct, trackEvent } from "@/lib/analytics/client";
import { isShoppingPath, productSlug, surveyEligible, type SurveyContext, type SurveyHistory } from "@/lib/analytics/survey-policy";
import type { AnalyticsItem } from "@/lib/analytics/shared";
const BAG="misk-survey-bag",HISTORY="misk-survey-history";
type SavedBag={items:AnalyticsItem[];updatedAt:number;awayAt?:number;checkoutAt?:number};
function read<T>(key:string,fallback:T):T {
 try {
  const value:unknown=JSON.parse(localStorage.getItem(key)??"null");
  if(!value||typeof value!=="object"||Array.isArray(value))return fallback;
  if(key===BAG){
   const items=(value as {items?:unknown}).items;
   if(!Array.isArray(items)||items.some((item:unknown)=>{if(!item||typeof item!=="object")return true;const row=item as Partial<AnalyticsItem>;return typeof row.product_id!=="string"||typeof row.product_name!=="string"||typeof row.price!=="number"||!Number.isFinite(row.price)||typeof row.quantity!=="number"||!Number.isFinite(row.quantity);}))return fallback;
  }
  return value as T;
 }catch{return fallback;}
}
function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
const OPTIONS:Record<string,[string,string]>={shipping_cost:["Shipping or extra fees","الشحن أو الرسوم الإضافية"],just_browsing:["Just browsing / comparing","أتصفح وأقارن فقط"],price_too_high:["The price","السعر"],delivery_time:["Delivery time","مدة التوصيل"],payment_issue:["My preferred payment method","طريقة الدفع المفضلة"],scent_unsure:["Not sure this scent is for me","لست متأكداً أن هذا العطر يناسبني"],need_more_details:["I need more product details","أحتاج إلى مزيد من التفاصيل"],stock_issue:["Availability or quantity","التوفر أو الكمية"],not_ready:["I’m not ready to order yet","لست مستعداً للطلب بعد"],other:["Something else","سبب آخر"]};
export function CartAbandonmentSurvey(){
 const {lines,hydrated}=useCart();const {meta}=useCartMeta(lines.map(l=>l.productSlug));const path=usePathname();const ar=useLocale()==="ar";
 const [context,setContext]=useState<SurveyContext|null>(null);const [reason,setReason]=useState("");const [comment,setComment]=useState("");const [state,setState]=useState<"idle"|"saving"|"sent"|"error">("idle");
 const cart=useRef<AnalyticsItem[]>([]),lastBag=useRef<AnalyticsItem[]>([]),product=useRef<AnalyticsItem|null>(null);
 const currentPath=useRef(path),previous=useRef(path),activeContext=useRef<SurveyContext|null>(null),paused=useRef(false),cartSince=useRef(0),dwell=useRef(0);
 const scheduleTimer=useRef<ReturnType<typeof setTimeout>|null>(null),closingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const added=useRef(new Set<string>());
 const schedule=useCallback((next:SurveyContext,delay=6000)=>{
  if(!next.items.length)return;
  trackEvent("survey_opportunity",{survey_type:next.type,trigger:next.trigger,product_id:next.product_id});
  if(scheduleTimer.current)clearTimeout(scheduleTimer.current);
  scheduleTimer.current=setTimeout(()=>{
   if(activeContext.current||paused.current||document.hidden||document.querySelector('[role="dialog"][data-state="open"]'))return;
   if(next.trigger==="cart_return"&&!cart.current.length)return;
   if(next.type==="product"&&(productSlug(currentPath.current)!==next.product_id||added.current.has(next.product_id??"")||cart.current.some(i=>i.product_id===next.product_id)))return;
   try{
    const sid=ensureAnalyticsIdentity(),key=`analytics-survey:${sid}`;
    const history=read<SurveyHistory>(HISTORY,{});
    if(!surveyEligible(Date.now(),history,!!sessionStorage.getItem(key),!!sessionStorage.getItem(`analytics-purchased:${sid}`)))return;
    sessionStorage.setItem(key,"1");write(HISTORY,{...history,shownAt:Date.now()});
   }catch{return;}
   activeContext.current=next;setContext(next);setReason("");setComment("");setState("idle");
   trackEvent("survey_shown",{survey_type:next.type,trigger:next.trigger,product_id:next.product_id});
  },delay);
 },[]);
 useEffect(()=>{
  if(!hydrated)return;
  cart.current=lines.map(l=>({product_id:l.productSlug,product_name:meta[l.productSlug]?.title??l.productSlug,price:meta[l.productSlug]?.variants?.find(v=>v.id===l.variantId)?.price??meta[l.productSlug]?.price??0,quantity:l.qty}));
  if(cart.current.length){lastBag.current=cart.current;if(!cartSince.current)cartSince.current=Date.now();}else cartSince.current=0;
  const old=read<SavedBag>(BAG,{items:[],updatedAt:0});write(BAG,{...old,items:cart.current,updatedAt:Date.now()});
 },[lines,meta,hydrated]);
 useEffect(()=>{
  const old=previous.current;previous.current=path;currentPath.current=path;paused.current=false;
  if(old!==path){dwell.current=0;product.current=null;}
  if(old!==path&&isShoppingPath(old)&&lastBag.current.length)schedule({type:/checkout/.test(old)?"checkout":"cart",trigger:"checkout_abandonment",items:lastBag.current},6000);
  window.dispatchEvent(new Event("analytics-survey-reset"));
  if(/checkout/.test(path)){const oldBag=read<SavedBag>(BAG,{items:[],updatedAt:0});write(BAG,{...oldBag,checkoutAt:Date.now()});}
 },[path,schedule]);
 useEffect(()=>{
  const saved=read<SavedBag>(BAG,{items:[],updatedAt:0});
  if(saved.items?.length&&saved.awayAt&&Date.now()-saved.awayAt>15000&&Date.now()-saved.updatedAt<14*86400000){lastBag.current=saved.items;schedule({type:saved.checkoutAt?"checkout":"cart",trigger:"cart_return",items:saved.items},7000);}
  const away=()=>{const old=read<SavedBag>(BAG,{items:[],updatedAt:0});if(cart.current.length)write(BAG,{...old,items:cart.current,updatedAt:Date.now(),awayAt:Date.now()});};
  const visible=()=>{if(document.hidden){away();return;}const old=read<SavedBag>(BAG,{items:[],updatedAt:0});if(old.items.length&&old.awayAt&&Date.now()-old.awayAt>15000)schedule({type:old.checkoutAt?"checkout":"cart",trigger:"cart_return",items:old.items});write(BAG,{...old,awayAt:undefined});};
  const viewed=(event:Event)=>{product.current=(event as CustomEvent<AnalyticsItem>).detail;dwell.current=0;};
  const changed=(event:Event)=>{
   const detail=(event as CustomEvent<{type?:string;slug?:string;empty:boolean}>).detail;
   if(detail?.type==="add"){if(detail.slug)added.current.add(detail.slug);if(scheduleTimer.current)clearTimeout(scheduleTimer.current);return;}
   const items=detail?.slug?lastBag.current.filter(i=>i.product_id===detail.slug):lastBag.current;
   if(items.length)schedule({type:"cart",trigger:"cart_removal",items},7000);
  };
  const exit=(event:MouseEvent)=>{if(event.relatedTarget||event.clientY>0)return;if(lastBag.current.length&&(isShoppingPath(currentPath.current)||(cart.current.length&&Date.now()-cartSince.current>60000)))schedule({type:/checkout/.test(currentPath.current)?"checkout":"cart",trigger:"cart_exit",items:cart.current.length?cart.current:lastBag.current},1200);};
  let idle:ReturnType<typeof setTimeout>|undefined;
  const reset=()=>{if(idle)clearTimeout(idle);if(isShoppingPath(currentPath.current)&&cart.current.length&&matchMedia("(pointer: coarse)").matches)idle=setTimeout(()=>schedule({type:/checkout/.test(currentPath.current)?"checkout":"cart",trigger:"cart_idle",items:cart.current},500),45000);};
  const stop=()=>{paused.current=true;activeContext.current=null;setContext(null);if(idle)clearTimeout(idle);if(scheduleTimer.current)clearTimeout(scheduleTimer.current);const history=read<SurveyHistory>(HISTORY,{});write(HISTORY,{...history,purchasedAt:Date.now()});write(BAG,{items:[],updatedAt:Date.now()});};
  const pause=()=>{paused.current=true;if(idle)clearTimeout(idle);if(scheduleTimer.current)clearTimeout(scheduleTimer.current);};
  let lastTick=Date.now();
  const ticker=setInterval(()=>{
   if(!cart.current.length&&idle){clearTimeout(idle);idle=undefined;}if(!idle&&!paused.current)reset();
   if(!product.current){const viewed=lastViewedProduct();if(viewed?.product_id===productSlug(currentPath.current))product.current={product_id:viewed.product_id,product_name:viewed.product_name??viewed.product_id,price:viewed.product_price??0,quantity:1};}
   const now=Date.now(),elapsed=Math.min(2000,now-lastTick);lastTick=now;
   if(!document.hidden&&product.current&&productSlug(currentPath.current)===product.current.product_id&&!added.current.has(product.current.product_id)&&!cart.current.some(i=>i.product_id===product.current?.product_id)){
    dwell.current+=elapsed;if(dwell.current>=120000){dwell.current=-Infinity;schedule({type:"product",trigger:"product_dwell",items:[product.current],product_id:product.current.product_id,product_name:product.current.product_name},1000);}
   }
  },1000);
  reset();window.addEventListener("pagehide",away);document.addEventListener("visibilitychange",visible);document.addEventListener("mouseout",exit);
  window.addEventListener("analytics-survey-reset",reset);window.addEventListener("analytics-product-view",viewed);window.addEventListener("analytics-cart-change",changed);window.addEventListener("analytics-purchased",stop);window.addEventListener("analytics-checkout-attempt",pause);
  for(const name of ["pointerdown","keydown","scroll"] as const)window.addEventListener(name,reset,{passive:true});
  return()=>{clearInterval(ticker);if(idle)clearTimeout(idle);if(scheduleTimer.current)clearTimeout(scheduleTimer.current);if(closingTimer.current)clearTimeout(closingTimer.current);window.removeEventListener("pagehide",away);document.removeEventListener("visibilitychange",visible);document.removeEventListener("mouseout",exit);window.removeEventListener("analytics-survey-reset",reset);window.removeEventListener("analytics-product-view",viewed);window.removeEventListener("analytics-cart-change",changed);window.removeEventListener("analytics-purchased",stop);window.removeEventListener("analytics-checkout-attempt",pause);for(const name of ["pointerdown","keydown","scroll"] as const)window.removeEventListener(name,reset);};
 },[schedule]);
 const dismiss=useCallback(()=>{const current=activeContext.current;if(current){trackEvent("survey_dismissed",{survey_type:current.type,trigger:current.trigger,product_id:current.product_id});write(HISTORY,{...read<SurveyHistory>(HISTORY,{}),dismissedAt:Date.now()});}activeContext.current=null;setContext(null);},[]);
 useEffect(()=>{if(!context)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")dismiss();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[context,dismiss]);
 if(!context)return null;
 const keys=context.type==="product"?["scent_unsure","need_more_details","price_too_high","just_browsing","other"]:context.trigger==="cart_removal"?["scent_unsure","price_too_high","stock_issue","just_browsing","other"]:["shipping_cost","just_browsing","price_too_high","delivery_time","payment_issue","other"];
 const title=context.type==="product"?(ar?"هل تحتاج مساعدة في الاختيار؟":"Need a little help choosing?"):context.trigger==="cart_return"?(ar?"أهلاً بعودتك. ما الذي يشغلك؟":"Welcome back. Anything holding you back?"):context.trigger==="cart_removal"?(ar?"ما الذي جعلك تغير رأيك؟":"What made you change your mind?"):(ar?"هل يمكننا تسهيل طلبك؟":"Could we make ordering easier?");
 const submit=async()=>{
  setState("saving");try{
   const response=await fetch("/api/analytics/survey",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({reason,custom_comment:comment,cart_items:context.items,survey_type:context.type,trigger:context.trigger,product_id:context.product_id,product_name:context.product_name})});
   const data=await response.json().catch(()=>null);if(!response.ok||!data?.saved)throw Error("Not saved");
   setState("sent");write(HISTORY,{...read<SurveyHistory>(HISTORY,{}),answeredAt:Date.now()});closingTimer.current=setTimeout(()=>{activeContext.current=null;setContext(null);},2000);
  }catch{setState("error");}
 };
 return <aside aria-label={ar?"ملاحظات التسوق":"Shopping feedback"} className="analytics-survey" dir={ar?"rtl":"ltr"}>
  <button type="button" onClick={dismiss} aria-label={ar?"إغلاق":"Dismiss feedback"} className="absolute end-3 top-3 p-2 text-fog"><X size={17}/></button>
  {state==="sent"?<div className="py-8 text-center" role="status"><Check className="mx-auto mb-4 text-gold"/><p>{ar?"شكراً لملاحظاتك.":"Thank you. We’re listening."}</p></div>:<>
   <p className="text-[9px] uppercase tracking-[.18em] text-gold">{ar?"لحظة من وقتك":"A moment of your time"}</p><h2 className="mt-3 text-xl font-light">{title}</h2>
   {context.product_name&&<p className="mt-2 text-xs font-medium">{context.product_name}</p>}
   <p className="mt-2 text-xs leading-5 text-fog">{ar?"ملاحظة سريعة، إذا أحببت.":"One quick answer, only if you’d like."}</p>
   <fieldset disabled={state==="saving"} className="mt-4 grid gap-1"><legend className="sr-only">What held you back?</legend>{keys.map(key=><label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-xs hover:bg-sand/50"><input type="radio" name="abandonment-reason" value={key} checked={reason===key} onChange={()=>setReason(key)} className="accent-[#8a6d2f]"/>{OPTIONS[key][ar?1:0]}</label>)}</fieldset>
   {reason&&<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} rows={2} aria-label="Optional feedback" placeholder={ar?"تفاصيل إضافية (اختياري)":"A few words, if you like (optional)"} className="mt-3 w-full rounded-lg border border-ink/15 p-3 text-xs"/>}
   {state==="error"&&<p role="alert" className="mt-2 text-xs text-red-700">{ar?"تعذر الحفظ. حاول مرة أخرى.":"Couldn’t save just now. Please try again."}</p>}
   <button type="button" disabled={!reason||state==="saving"} onClick={()=>void submit()} className="mt-4 flex w-full items-center justify-between rounded-lg bg-ink px-4 py-3 text-xs text-white disabled:opacity-40">{ar?"إرسال":"Share feedback"}{state==="saving"?<Loader2 size={15} className="animate-spin"/>:<ArrowUpRight size={15}/>}</button>
  </>}
 </aside>;
}
