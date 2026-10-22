"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";
import type { CartStockIssue } from "@/lib/pricing";

export function stockBlockReason(issues:CartStockIssue[]) {
 const empty=issues.filter(i=>i.available===0).length,limited=issues.length-empty;
 return [empty?`${empty} ${empty===1?"item is":"items are"} out of stock`:"",limited?`${limited} ${limited===1?"item exceeds":"items exceed"} available stock`:""].filter(Boolean).join("; ")+". Update your bag to continue.";
}
export function StockCheckoutGuard({issues,children}:{issues:CartStockIssue[];children:ReactNode}){
 const [show,setShow]=useState(false);const blocked=issues.length>0;
 return <span className="stock-checkout-guard relative block" tabIndex={blocked?0:undefined} role="group" aria-label={blocked?stockBlockReason(issues):undefined}
   onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onFocus={()=>setShow(true)} onBlur={()=>setShow(false)}
   onClick={e=>{if(blocked){e.preventDefault();setShow(true);}}} onKeyDown={e=>{if(blocked&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setShow(v=>!v);}}}>
   {children}
   {blocked&&show&&<span role="tooltip" className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs leading-5 text-red-800 shadow-lg">{stockBlockReason(issues)}</span>}
 </span>;
}
export function CartStockNotice({issues,loading=false}:{issues:CartStockIssue[];loading?:boolean}){
 const {remove,setQty}=useCart();const ar=useLocale()==="ar";
 const [pending,setPending]=useState<string[]>([]);const [open,setOpen]=useState(false);const seen=useRef(new Set<string>());
 const signature=issues.map(i=>`${i.slug}:${i.variantId}:${i.available}:${i.requested}`).join("|");
 useEffect(()=>{const keys=signature?signature.split("|"):[];const fresh=keys.some(key=>!seen.current.has(key));keys.forEach(key=>seen.current.add(key));if(fresh)queueMicrotask(()=>setOpen(true));},[signature]);
 useEffect(()=>{if(!loading&&pending.length){const timer=setTimeout(()=>setPending([]),350);return()=>clearTimeout(timer);}},[loading,pending]);
 if(!issues.length)return null;
 const update=(issue:CartStockIssue,quantity?:number)=>{
  const key=`${issue.slug}:${issue.variantId}`;setPending(p=>[...p,key]);
  if(quantity===undefined)remove(issue.slug,issue.variantId);else setQty(issue.slug,issue.variantId,quantity);
 };
 const list=()=>issues.map(issue=>{const busy=pending.includes(`${issue.slug}:${issue.variantId}`);return <div key={`${issue.slug}:${issue.variantId}`} className="mt-4 border-t border-red-200 pt-3">
   <p className="text-sm font-semibold">{issue.title}</p><p className="mt-1 text-xs leading-5">{issue.available?`You selected ${issue.requested}; only ${issue.available} available.`:"This item is out of stock. Remove it to continue."}</p>
   <div className="mt-3 flex flex-wrap gap-4 text-xs">{issue.available>0&&<button type="button" disabled={busy} className="underline disabled:opacity-60" onClick={()=>update(issue,issue.available)}>Change quantity to {issue.available}</button>}
   <button type="button" disabled={busy} onClick={()=>update(issue)} className="inline-flex items-center gap-2 font-medium underline disabled:opacity-60">{busy&&<Loader2 className="size-3 animate-spin"/>}{busy?"Updating bag…":"Remove from bag"}</button></div>
 </div>;});
 return <>
  <div role="alert" className="my-5 rounded-xl border-2 border-red-400 bg-red-50 p-4 text-red-800">
   <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={18}/>{ar?"بعض المنتجات غير متوفرة":"Some items need your attention"}</p>
   <p className="mt-2 text-xs leading-5">{stockBlockReason(issues)}</p>{list()}
  </div>
  <Dialog open={open&&issues.length>0} onOpenChange={setOpen}><DialogContent className="border border-red-200">
   <AlertTriangle className="mb-4 size-8 text-red-600"/><DialogTitle className="text-xl text-red-800">{ar?"يرجى تحديث حقيبتك":"Before you continue"}</DialogTitle>
   <DialogDescription className="mt-3 text-sm leading-6 text-red-700">{stockBlockReason(issues)}</DialogDescription><div className="text-red-800">{list()}</div>
   <button type="button" onClick={()=>setOpen(false)} className="mt-6 w-full rounded-lg bg-red-800 px-4 py-3 text-sm text-white">{ar?"مراجعة الحقيبة":"Review my bag"}</button>
  </DialogContent></Dialog>
 </>;
}
