export const PAYMENT_METHODS = ["cod","card","wallet","tabby","tamara"] as const;
export const PAYMENT_STATUSES = ["pending","authorized","paid","partially_paid","refunded","partially_refunded","voided","failed"] as const;
export const paymentMethodLabel=(value:string)=>({cod:"Cash on delivery",card:"Card",wallet:"Wallet",tabby:"Tabby",tamara:"Tamara"}[value]??value);
export const paymentStatusLabel=(value:string)=>value.replaceAll("_"," ").replace(/^./,v=>v.toUpperCase());
export function readableOrderDate(value:string,now=new Date()) {
 const date=new Date(value);
 const day=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dubai"}).format(d);
 const time=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",hour:"numeric",minute:"2-digit",hour12:true}).format(date);
 if(day(date)===day(now))return `Today at ${time}`;
 if(day(date)===day(new Date(now.getTime()-86400000)))return `Yesterday at ${time}`;
 return `${new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dubai",day:"numeric",month:"short",year:day(date).slice(0,4)!==day(now).slice(0,4)?"numeric":undefined}).format(date)} at ${time}`;
}
export interface AdminOrderRow {id:string;order_no:string;created_at:string;customer_name:string;email:string|null;phone:string;total:number;status:string;payment_method:string;payment_status:string;tracking_no:string|null;order_items:{title:string;qty:number}[]}
