import type { Coupon } from "./types";
export const money = (value:number) => Math.round((value+Number.EPSILON)*100)/100;
/** Shared minor-unit calculation for both previews and authoritative checkout. */
export function couponSavings(subtotal:number,coupon:Pick<Coupon,"kind"|"amount"|"maxDiscount">):number {
 const cents=Math.max(0,Math.round(subtotal*100));
 const amount=Number(coupon.amount);
 if(!Number.isFinite(amount)||amount<0)return 0;
 const raw=coupon.kind==="percent" ? Math.round(cents*Math.min(100,amount)/100) : coupon.kind==="fixed" ? Math.round(amount*100) : 0;
 const cap=coupon.maxDiscount==null?cents:Math.max(0,Math.round(coupon.maxDiscount*100));
 return Math.min(cents,raw,cap)/100;
}
