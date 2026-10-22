"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { LiveData } from "@/lib/analytics/dashboard";
export function LiveAnalytics(){
 const [data,setData]=useState<LiveData|null>(null);
 useEffect(()=>{
  let live=true;let pending=false;const controller=new AbortController();
  const update=async()=>{if(pending || document.visibilityState!=="visible")return;pending=true;try{const r=await fetch("/api/admin/analytics?kind=live",{cache:"no-store",signal:controller.signal});if(r.ok&&live)setData(await r.json());}catch{}finally{pending=false;}};
  void update();const timer=setInterval(update,30000);document.addEventListener("visibilitychange",update);
  return()=>{live=false;controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",update);};
 },[]);
 return <Link href="/admin/analytics" className="analytics-live-strip" aria-label="Open analytics">
  <span><i aria-hidden className={data?.live?"analytics-live-dot":""}/><strong>{data?data.live.toLocaleString():"—"}</strong> live visitors</span>
  <span><strong>{data?`${data.conversion.toFixed(2)}%`:"—"}</strong> conversion this month</span>
  <span><strong>{data?data.orders.toLocaleString():"—"}</strong> total orders</span>
  <span><strong>{data?data.visitors.toLocaleString():"—"}</strong> total tracked visitors</span>
 </Link>;
}
