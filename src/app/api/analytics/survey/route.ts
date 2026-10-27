import { SURVEY_TRIGGERS } from "@/lib/analytics/survey-policy";
import { NextResponse } from "next/server";
import { analyticsSession, readSmallBody, sameOrigin } from "@/lib/analytics/server";
import { createAdminClient } from "@/lib/supabase/service";
const reasons = new Set(["shipping_cost","just_browsing","price_too_high","payment_issue","delivery_time","other","scent_unsure","need_more_details","stock_issue","not_ready"]);
export async function GET(req:Request){
 try{
  if(!sameOrigin(req))return NextResponse.json({allowed:false},{headers:{"Cache-Control":"private, no-store"}});
  const session=await analyticsSession(req);if(!session||session.is_bot)return NextResponse.json({allowed:false},{headers:{"Cache-Control":"private, no-store"}});
  const {data,error}=await createAdminClient().rpc("analytics_survey_allowed",{p_session:session.id,p_visitor:session.visitor_id,p_user:session.user_id??null,p_submitting:false});
  if(error)throw error;
  return NextResponse.json({allowed:data===true},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({allowed:false},{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return new NextResponse(null,{status:204});
    const body=await readSmallBody(req); if (!body || !reasons.has(String(body.reason))) return new NextResponse(null,{status:204});
    const session=await analyticsSession(req); if (!session || session.is_bot) return new NextResponse(null,{status:204});
    const db=createAdminClient();
    const existing=await db.from("analytics_abandonment_surveys").select("id").eq("session_id",session.id).maybeSingle();
    if(existing.error)throw existing.error;
    if(existing.data)return NextResponse.json({saved:true});
    const eligibility=await db.rpc("analytics_survey_allowed",{p_session:session.id,p_visitor:session.visitor_id,p_user:session.user_id??null,p_submitting:true});
    if(eligibility.error)throw eligibility.error;
    if(eligibility.data!==true)return NextResponse.json({saved:false,reason:"ineligible"},{status:409});
    const ingested=await db.rpc("ingest_analytics_event",{p_session:session,p_event:null});
    if(ingested.error)throw ingested.error;
    const {data:purchases}=await db.from("analytics_events").select("id").eq("session_id",session.id).eq("event_type","purchase").limit(1);
    if (purchases?.length) return new NextResponse(null,{status:204});
    const items=Array.isArray(body.cart_items) ? body.cart_items.slice(0,50).flatMap((value: unknown)=>{
      if (!value || typeof value!=="object") return [];
      const item=value as Record<string,unknown>;
      return typeof item.product_id==="string" && typeof item.product_name==="string" && typeof item.price==="number" && typeof item.quantity==="number" && Number.isFinite(item.price) && Number.isFinite(item.quantity) ? [{product_id:item.product_id.slice(0,100),product_name:item.product_name.slice(0,200),price:Math.max(0,Math.min(1000000,item.price)),quantity:Math.max(1,Math.min(20,Math.floor(item.quantity)))}] : [];
    }) : [];
    const saved=await db.from("analytics_abandonment_surveys").upsert({survey_type:["cart","checkout","product"].includes(String(body.survey_type))?body.survey_type:"cart",trigger:SURVEY_TRIGGERS.includes(body.trigger as typeof SURVEY_TRIGGERS[number])?body.trigger:"unknown",product_id:typeof body.product_id==="string"?body.product_id.slice(0,100):null,product_name:typeof body.product_name==="string"?body.product_name.slice(0,200):null,session_id:session.id,reason:body.reason,custom_comment:typeof body.custom_comment==="string" ? body.custom_comment.slice(0,500) : null,cart_items:items,cart_total:items.reduce((sum,item)=>sum+item.price*item.quantity,0)},{onConflict:"session_id",ignoreDuplicates:true});
    if(saved.error)throw saved.error;
    return NextResponse.json({saved:true});
  } catch { return NextResponse.json({saved:false,error:"Feedback unavailable"},{status:503}); }

}
