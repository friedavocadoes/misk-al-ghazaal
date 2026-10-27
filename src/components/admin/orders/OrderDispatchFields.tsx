"use client";
import { useState } from "react";
import { ORDER_STATUSES,statusLabel } from "@/lib/order-status";
import { DEFAULT_TRACKING_URL } from "@/lib/order-tracking";
import { PAYMENT_STATUSES,paymentStatusLabel } from "@/lib/admin-orders-model";
export function OrderDispatchFields({status,trackingNo,trackingUrl,paymentStatus}:{status:string;trackingNo:string|null;trackingUrl:string|null;paymentStatus:string}){
 const [selected,setSelected]=useState(status);const [custom,setCustom]=useState(!!trackingUrl&&trackingUrl!==DEFAULT_TRACKING_URL);
 const shipping=selected==="dispatched"||selected==="out_for_delivery";
 return <><label className="block text-sm">Order status<select name="status" value={selected} onChange={e=>setSelected(e.target.value)} className="mt-1 w-full border border-ink/20 bg-white px-3 py-2">{status==="packed"&&<option value="packed">Packed (legacy)</option>}{ORDER_STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
 <label className="block text-sm">Payment status<select name="payment_status" defaultValue={paymentStatus} className="mt-1 w-full border border-ink/20 bg-white px-3 py-2">{PAYMENT_STATUSES.map(p=><option key={p} value={p}>{paymentStatusLabel(p)}</option>)}</select><span className="mt-1 block text-[10px] text-fog">Records payment state only. It does not charge, refund or contact a payment gateway.</span></label>
 <div className={`space-y-3 rounded-lg border p-4 ${shipping?"border-gold/40 bg-gold-wash/30":"border-ink/10 bg-sand/20"}`}><p className="text-xs font-medium">Courier handover</p><p className="text-[11px] leading-5 text-fog">Dispatched means the parcel has been handed to the courier. Add its tracking number before saving this status.</p>
 <label className="block text-xs">Tracking number{shipping?" · required":""}<input name="tracking_no" defaultValue={trackingNo??""} required={shipping} maxLength={200} placeholder="Courier tracking / reference number" className="mt-1 w-full border border-ink/20 bg-white px-3 py-2"/></label>
 <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={custom} onChange={e=>setCustom(e.target.checked)}/>Use another courier or tracking link</label>
 {custom?<label className="block text-xs">Courier tracking URL<input name="tracking_url" defaultValue={trackingUrl===DEFAULT_TRACKING_URL?"":trackingUrl??""} required maxLength={2048} placeholder="https://courier.example/track?number={tracking}" className="mt-1 w-full border border-ink/20 bg-white px-3 py-2"/><span className="mt-1 block text-[10px] text-fog">Optional {"{tracking}"} placeholder inserts the tracking number into a carrier-supported URL.</span></label>:<><input type="hidden" name="tracking_url" value={DEFAULT_TRACKING_URL}/><p className="break-all text-[10px] text-fog">Max Express · {DEFAULT_TRACKING_URL}</p></>}
 </div></>;
}
