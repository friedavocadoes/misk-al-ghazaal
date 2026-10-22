export interface Kpis { viewers:number; sessions:number; revenue:number; conversion_rate:number; abandonment_rate:number; dropoffs:number; real_viewers:number; bot_viewers:number; orders:number }
export interface Daily { day:string; real:number; bots:number; revenue:number }
export interface ProductMetric { product_id:string; product_name:string; views:number; cart_adds:number; cart_no_buy_count:number; purchases:number; conversion_rate:number; total_revenue:number }
export interface Acquisition { source:string; medium:string; campaign:string; referrer_domain:string; visitors:number; cart_adds:number; customers:number; conversion_rate:number; revenue:number }
export interface CountMetric { reason:string; count:number }
export interface Report {
 kpis:Kpis; daily:Daily[]; products:ProductMetric[]; acquisition:Acquisition[];
 funnel:{name:string;value:number}[]; bots:CountMetric[];surveys:CountMetric[];
 survey_activity?:{opportunities:number;shown:number;dismissed:number;responses:number;responded_shown:number};
 survey_contexts?:{survey_type:string;trigger:string;count:number}[];
 responses?:{id:string;survey_type:string;trigger:string;product_id:string|null;product_name:string|null;reason:string;custom_comment:string|null;cart_items:{product_name:string;quantity:number}[];cart_total:number;created_at:string}[];
 comments:{reason:string;custom_comment:string;cart_items:{product_name:string;quantity:number}[];cart_total:number;created_at:string}[];
}
export interface DashboardData {current:Report;previous:Report|null}
export interface CustomerRow {id:string;email:string;full_name:string|null;phone:string|null;default_address:unknown;promo_opt_in:boolean;order_updates_opt_in:boolean;sessions:number;active_seconds:number;first_seen:string|null;last_seen:string|null;orders:number;spent:number}
export interface CustomerData {rows:CustomerRow[];total:number}
export interface LiveData {live:number;visitors:number;orders:number;conversion:number}
export const ANALYTICS_SECTIONS = ["overview","traffic","products","acquisition","feedback","customers"] as const;
export type AnalyticsSection = typeof ANALYTICS_SECTIONS[number];
export const REASON_LABELS:Record<string,string> = {shipping_cost:"Shipping / extra fees",just_browsing:"Browsing / comparing",price_too_high:"Price",payment_issue:"Payment method",delivery_time:"Delivery time",other:"Something else",scent_unsure:"Unsure about the scent",need_more_details:"Needs product information",stock_issue:"Availability / quantity",not_ready:"Not ready yet"};
export function analyticsRange(params:URLSearchParams) {
 const start=params.get("start"),end=params.get("end");
 if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error("Choose a valid start and end date.");
 const a=new Date(`${start}T00:00:00+04:00`),b=new Date(new Date(`${end}T00:00:00+04:00`).getTime()+86400000);
 if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || b<=a || b.getTime()-a.getTime()>366*86400000) throw new Error("Choose a range of 1–366 days.");
 if (new Date(a.getTime()+14400000).toISOString().slice(0,10)!==start || new Date(b.getTime()-86400000+14400000).toISOString().slice(0,10)!==end) throw new Error("Choose valid calendar dates.");
 return {start_date:a.toISOString(),end_date:b.toISOString()};
}
