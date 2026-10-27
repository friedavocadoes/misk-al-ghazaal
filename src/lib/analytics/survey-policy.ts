import type { AnalyticsItem } from "./shared";
export const SURVEY_TRIGGERS = ["cart_return","checkout_abandonment","cart_removal","cart_exit","cart_idle","product_dwell"] as const;
export type SurveyTrigger=typeof SURVEY_TRIGGERS[number];
export interface SurveyContext {type:"cart"|"checkout"|"product";trigger:SurveyTrigger;items:AnalyticsItem[];product_id?:string;product_name?:string}
export interface SurveyHistory {shownAt?:number;dismissedAt?:number;answeredAt?:number;purchasedAt?:number;checkoutAt?:number;checkoutAttemptAt?:number}
export function surveyEligible(now:number,history:SurveyHistory,seenSession:boolean,purchased:boolean):boolean {
 if(seenSession||purchased)return false;
 if(history.answeredAt&&now-history.answeredAt<30*86400000)return false;
 if(history.purchasedAt&&now-history.purchasedAt<7*86400000)return false;
 if(history.dismissedAt&&now-history.dismissedAt<7*86400000)return false;
 if(history.shownAt&&now-history.shownAt<86400000)return false;
 if(history.checkoutAt&&now-history.checkoutAt<2*3600000)return false;
 if(history.checkoutAttemptAt&&now-history.checkoutAttemptAt<86400000)return false;
 return true;
}
export function isShoppingPath(path:string){return /^\/(?:ar\/)?(?:checkout|cart)\/?$/.test(path);}
export function productSlug(path:string){return path.match(/^\/(?:ar\/)?product\/([^/]+)\/?$/)?.[1]??null;}
export function surveyRouteAllowed(path:string){
 const clean=path.replace(/^\/ar(?=\/|$)/,"")||"/";
 return clean==="/"||/^\/(?:product|collection)\/[^/]+\/?$/.test(clean)||/^\/(?:search)\/?$/.test(clean);
}
export const SURVEY_TRIGGER_LABELS:Record<SurveyTrigger,string>={cart_return:"Returned to an unfinished bag",checkout_abandonment:"Left checkout",cart_removal:"Removed a scent",cart_exit:"Exit intent",cart_idle:"Idle on bag / checkout",product_dwell:"Product interest, no cart add"};
