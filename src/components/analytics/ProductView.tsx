"use client";
import { useEffect } from "react";
import { trackProduct } from "@/lib/analytics/client";
export function ProductView({slug,title,price}:{slug:string;title:string;price:number}) {
  useEffect(()=>{const timer=setTimeout(()=>trackProduct({product_id:slug,product_name:title,product_price:price}),0);return()=>clearTimeout(timer);},[slug,title,price]);
  return null;
}
