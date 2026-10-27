"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { X,ArrowUpRight,Check,Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCartMeta } from "@/lib/cart-meta";
import { ensureAnalyticsIdentity,lastViewedProduct,trackEvent } from "@/lib/analytics/client";
import { isShoppingPath,productSlug,surveyEligible,surveyRouteAllowed,type SurveyContext } from "@/lib/analytics/survey-policy";
import { feedbackHistory,rememberFeedback,SURVEY_HISTORY_KEY } from "@/lib/analytics/survey-memory";
import type { AnalyticsItem } from "@/lib/analytics/shared";
import { OPTIONS } from "./survey-options";
const BAG="misk-survey-bag";
type SavedBag={items:AnalyticsItem[];updatedAt:number;awayAt?:number;checkoutAt?:number};
function readBag():SavedBag{
 try{const b=JSON.parse(localStorage.getItem(BAG)??"null");if(b&&Array.isArray(b.items)&&typeof b.updatedAt==="number"&&b.items.every((i:AnalyticsItem)=>typeof i.product_id==="string"&&typeof i.product_name==="string"&&Number.isFinite(i.price)&&Number.isFinite(i.quantity)))return b;}catch{}
 return {items:[],updatedAt:0};
}
function saveBag(value:SavedBag){try{localStorage.setItem(BAG,JSON.stringify(value));}catch{}}
export function CartAbandonmentSurvey(){
 const {lines,hydrated}=useCart(),{meta}=useCartMeta(lines.map(l=>l.productSlug)),path=usePathname(),ar=useLocale()==="ar";
 const [context,setContext]=useState<SurveyContext|null>(null),[expanded,setExpanded]=useState(false),[reason,setReason]=useState(""),[comment,setComment]=useState(""),[state,setState]=useState<"idle"|"saving"|"sent"|"error">("idle");
 const cart=useRef<AnalyticsItem[]>([]),lastBag=useRef<AnalyticsItem[]>([]),product=useRef<AnalyticsItem|null>(null),active=useRef<SurveyContext|null>(null);
 const currentPath=useRef(path),previous=useRef(path),paused=useRef(false),activeMs=useRef(0),dwell=useRef(0),lastInteraction=useRef(Date.now());
 const added=useRef(new Set<string>()),considered=useRef(new Set<string>()),version=useRef(0);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),closing=useRef<ReturnType<typeof setTimeout>|null>(null),request=useRef<AbortController|null>(null);
 const close=useCallback(()=>{version.current++;if(timer.current)clearTimeout(timer.current);request.current?.abort();active.current=null;setContext(null);setExpanded(false);},[]);
 const eligible=useCallback(()=>{
  if(paused.current||document.hidden||!surveyRouteAllowed(currentPath.current))return false;
  try{const sid=ensureAnalyticsIdentity();return surveyEligible(Date.now(),feedbackHistory(),!!sessionStorage.getItem(`analytics-survey:${sid}`),!!sessionStorage.getItem(`analytics-purchased:${sid}`));}catch{return false;}
 },[]);
 const relevant=useCallback((next:SurveyContext)=>next.type==="product"?productSlug(currentPath.current)===next.product_id&&!added.current.has(next.product_id??"")&&!cart.current.some(i=>i.product_id===next.product_id):next.trigger!=="cart_return"||cart.current.length>0,[]);
 const schedule=useCallback((next:SurveyContext,delay=45000)=>{
  if(!next.items.length||active.current||!eligible())return;
  if(timer.current)clearTimeout(timer.current);const generation=++version.current;
  trackEvent("survey_opportunity",{survey_type:next.type,trigger:next.trigger,product_id:next.product_id});
  timer.current=setTimeout(async()=>{
   if(generation!==version.current||!eligible()||!relevant(next)||document.querySelector('[role="dialog"][data-state="open"]')||Date.now()-lastInteraction.current<15000)return;
   request.current?.abort();const controller=new AbortController();request.current=controller;
   try{
    const response=await fetch("/api/analytics/survey",{cache:"no-store",signal:controller.signal});const result=await response.json();
    if(!response.ok||!result.allowed||controller.signal.aborted||generation!==version.current||!eligible()||!relevant(next))return;
    const sid=ensureAnalyticsIdentity();sessionStorage.setItem(`analytics-survey:${sid}`,"1");rememberFeedback({shownAt:Date.now()});
    active.current=next;setContext(next);setExpanded(false);setReason("");setComment("");setState("idle");
    trackEvent("survey_shown",{survey_type:next.type,trigger:next.trigger,product_id:next.product_id});
   }catch{/* An unavailable eligibility check means no invitation. */}
  },delay);
 },[eligible,relevant]);
 useEffect(()=>{
  if(!hydrated)return;
  cart.current=lines.map(l=>({product_id:l.productSlug,product_name:meta[l.productSlug]?.title??l.productSlug,price:meta[l.productSlug]?.variants?.find(v=>v.id===l.variantId)?.price??meta[l.productSlug]?.price??0,quantity:l.qty}));
  if(cart.current.length)lastBag.current=cart.current;
  // Keep a valid away snapshot until return eligibility has been evaluated.
  const old=readBag();saveBag({...old,items:cart.current,updatedAt:Date.now()});
 },[lines,meta,hydrated]);
 useEffect(()=>{
  const old=previous.current;previous.current=path;currentPath.current=path;close();dwell.current=0;product.current=null;
  if(/^\/(?:ar\/)?checkout\/?$/.test(path)){paused.current=true;rememberFeedback({checkoutAt:Date.now()});const b=readBag();saveBag({...b,checkoutAt:Date.now()});}
  if(old!==path&&isShoppingPath(old)&&lastBag.current.length&&activeMs.current>=180000)schedule({type:/checkout/.test(old)?"checkout":"cart",trigger:"checkout_abandonment",items:lastBag.current},60000);
 },[path,close,schedule]);
 useEffect(()=>{
  const maybeReturn=()=>{const saved=readBag();if(saved.items.length&&saved.awayAt&&Date.now()-saved.awayAt>=30*60000&&Date.now()-saved.updatedAt<14*86400000){lastBag.current=saved.items;schedule({type:saved.checkoutAt?"checkout":"cart",trigger:"cart_return",items:saved.items});}};
  maybeReturn();
  const away=()=>{if(cart.current.length)saveBag({...readBag(),items:cart.current,updatedAt:Date.now(),awayAt:Date.now()});};
  const visible=()=>{if(document.hidden){away();return;}maybeReturn();const b=readBag();saveBag({...b,awayAt:undefined});};
  const viewed=(event:Event)=>{product.current=(event as CustomEvent<AnalyticsItem>).detail;dwell.current=0;};
  const changed=(event:Event)=>{const detail=(event as CustomEvent<{type?:string;slug?:string}>).detail;
   if(detail?.type==="add"){if(detail.slug)added.current.add(detail.slug);close();return;}
   if(activeMs.current<180000)return;
   const items=detail?.slug?lastBag.current.filter(i=>i.product_id===detail.slug):lastBag.current;
   if(items.length)schedule({type:"cart",trigger:"cart_removal",items},60000);
  };
  const pause=()=>{paused.current=true;rememberFeedback({checkoutAttemptAt:Date.now()});close();};
  const stop=()=>{paused.current=true;rememberFeedback({purchasedAt:Date.now()});lastBag.current=[];cart.current=[];saveBag({items:[],updatedAt:Date.now()});close();};
  const storage=(event:StorageEvent)=>{if(event.key===SURVEY_HISTORY_KEY&&!eligible())close();};
  const interaction=()=>{lastInteraction.current=Date.now();};
  let previousTick=Date.now();const ticker=setInterval(()=>{
   const now=Date.now(),elapsed=Math.min(5000,Math.max(0,now-previousTick));previousTick=now;
   if(document.hidden||paused.current)return;activeMs.current+=elapsed;
   if(!product.current){const viewed=lastViewedProduct();if(viewed?.product_id===productSlug(currentPath.current))product.current={product_id:viewed.product_id,product_name:viewed.product_name??viewed.product_id,price:viewed.product_price??0,quantity:1};}
   const p=product.current;
   if(p&&p.product_id===productSlug(currentPath.current)&&!added.current.has(p.product_id)&&!cart.current.some(i=>i.product_id===p.product_id)){
    dwell.current+=elapsed;if(dwell.current>=240000&&!considered.current.has(p.product_id)&&now-lastInteraction.current>=15000){considered.current.add(p.product_id);schedule({type:"product",trigger:"product_dwell",items:[p],product_id:p.product_id,product_name:p.product_name});}
   }
  },5000);
  window.addEventListener("pagehide",away);document.addEventListener("visibilitychange",visible);window.addEventListener("storage",storage);
  window.addEventListener("analytics-product-view",viewed);window.addEventListener("analytics-cart-change",changed);window.addEventListener("analytics-purchased",stop);window.addEventListener("analytics-checkout-attempt",pause);
  for(const name of ["pointerdown","keydown","scroll"] as const)window.addEventListener(name,interaction,{passive:true});
  return()=>{clearInterval(ticker);if(timer.current)clearTimeout(timer.current);if(closing.current)clearTimeout(closing.current);request.current?.abort();window.removeEventListener("pagehide",away);document.removeEventListener("visibilitychange",visible);window.removeEventListener("storage",storage);window.removeEventListener("analytics-product-view",viewed);window.removeEventListener("analytics-cart-change",changed);window.removeEventListener("analytics-purchased",stop);window.removeEventListener("analytics-checkout-attempt",pause);for(const name of ["pointerdown","keydown","scroll"] as const)window.removeEventListener(name,interaction);};
 },[close,eligible,schedule]);
 const dismiss=useCallback(()=>{if(active.current){rememberFeedback({dismissedAt:Date.now()});trackEvent("survey_dismissed",{survey_type:active.current.type,trigger:active.current.trigger});}close();},[close]);
 useEffect(()=>{if(!context)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")dismiss();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[context,dismiss]);
 if(!context||!surveyRouteAllowed(path))return null;
 if(!expanded)return <aside aria-label={ar?"ملاحظات التسوق":"Shopping feedback"} className="analytics-survey-prompt" dir={ar?"rtl":"ltr"}><button type="button" data-haptic="selection" className="min-w-0 flex-1 px-4 py-3 text-start" aria-expanded={false} onClick={()=>setExpanded(true)}><span className="block text-xs">{ar?"هل نساعدك في الاختيار؟":"A little help choosing?"}</span><span className="mt-1 block text-[10px] text-fog">{ar?"شاركنا رأيك إذا أحببت":"Share a thought, if you like"}</span></button><button type="button" onClick={dismiss} aria-label={ar?"إغلاق":"Dismiss feedback"} className="me-2 rounded-full p-2 text-fog"><X size={14}/></button></aside>;
 const keys=context.type==="product"?["scent_unsure","need_more_details","price_too_high","just_browsing","other"]:context.trigger==="cart_removal"?["scent_unsure","price_too_high","stock_issue","just_browsing","other"]:["shipping_cost","just_browsing","price_too_high","delivery_time","payment_issue","other"];
 const submit=async()=>{setState("saving");try{const response=await fetch("/api/analytics/survey",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({reason,custom_comment:comment,cart_items:context.items,survey_type:context.type,trigger:context.trigger,product_id:context.product_id,product_name:context.product_name})});const data=await response.json().catch(()=>null);if(!response.ok||!data?.saved)throw Error("Not saved");setState("sent");rememberFeedback({answeredAt:Date.now()});closing.current=setTimeout(close,2000);}catch{setState("error");}};
 return <aside aria-label={ar?"ملاحظات التسوق":"Shopping feedback"} className="analytics-survey" dir={ar?"rtl":"ltr"}>
 <button type="button" onClick={dismiss} aria-label={ar?"إغلاق":"Dismiss feedback"} className="absolute end-3 top-3 p-2 text-fog"><X size={17}/></button>
 {state==="sent"?<div className="py-8 text-center" role="status"><Check className="mx-auto mb-4 text-gold"/><p>{ar?"شكراً لملاحظاتك.":"Thank you. We’re listening."}</p></div>:<><p className="text-[9px] uppercase tracking-[.18em] text-gold">{ar?"رأيك يهمنا":"Your perspective"}</p><h2 className="mt-3 text-xl font-light">{ar?"ما الذي يمكننا تحسينه؟":"What could we make better?"}</h2>{context.product_name&&<p className="mt-2 text-xs text-fog">{context.product_name}</p>}<fieldset disabled={state==="saving"} className="mt-4 grid gap-1"><legend className="sr-only">What held you back?</legend>{keys.map(key=><label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-xs hover:bg-sand/50"><input type="radio" name="abandonment-reason" value={key} checked={reason===key} onChange={()=>setReason(key)} className="accent-[#8a6d2f]"/>{OPTIONS[key][ar?1:0]}</label>)}</fieldset>{reason&&<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} rows={2} aria-label="Optional feedback" placeholder={ar?"تفاصيل إضافية (اختياري)":"A few words, if you like (optional)"} className="mt-3 w-full rounded-lg border border-ink/15 p-3 text-xs"/>}{state==="error"&&<p role="alert" className="mt-2 text-xs text-red-700">{ar?"تعذر الحفظ. حاول لاحقاً.":"Couldn’t save just now. Please try later."}</p>}<button type="button" disabled={!reason||state==="saving"} onClick={()=>void submit()} className="mt-4 flex w-full items-center justify-between rounded-lg bg-ink px-4 py-3 text-xs text-white disabled:opacity-40">{ar?"إرسال":"Share feedback"}{state==="saving"?<Loader2 size={15} className="animate-spin"/>:<ArrowUpRight size={15}/>}</button></>}
 </aside>;
}
