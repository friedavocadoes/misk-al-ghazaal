"use client";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { trackingLink } from "@/lib/order-tracking";

export function TrackOrderButton({number,url,locale="en",label}:{number:string|null;url?:string|null;locale?:string;label?:string}) {
 const [message,setMessage]=useState("");
 let href:string;try{href=trackingLink(url,number);}catch{return <p className="text-xs text-red-700">{locale==="ar"?"رابط التتبع غير متاح. يرجى التواصل معنا.":"Tracking link unavailable. Please contact us."}</p>;}
 return <div className="max-w-xs"><a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[.15em] text-white" onClick={()=>{
  if(!number)return;
  void navigator.clipboard?.writeText(number).then(()=>setMessage(locale==="ar"?"تم نسخ رقم التتبع. الصقه في صفحة شركة الشحن.":"Tracking number copied. Paste it on the courier’s page.")).catch(()=>setMessage(locale==="ar"?`انسخ رقم التتبع يدوياً: ${number}`:`Copy this number manually: ${number}`));
  if(!navigator.clipboard)setMessage(locale==="ar"?`انسخ رقم التتبع يدوياً: ${number}`:`Copy this number manually: ${number}`);
 }}>{label||(locale==="ar"?"تتبع الطلب":"Track order")}<ArrowUpRight className="size-3.5"/></a><p role="status" className="mt-2 text-[10px] leading-5 text-fog">{message||(locale==="ar"?"سننسخ رقم التتبع ونفتح صفحة شركة الشحن.":"Copies your tracking number and opens the courier’s page.")}</p></div>;
}
