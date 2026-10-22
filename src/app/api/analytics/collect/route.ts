import { after, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { analyticsSession, readSmallBody, sameOrigin } from "@/lib/analytics/server";
import { EVENT_TYPES, safePath, uuid } from "@/lib/analytics/shared";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return new NextResponse(null,{status:204});
    const body = await readSmallBody(req);
    if (!body || body.event_type === "purchase" || !(body.event_type === "heartbeat" || EVENT_TYPES.includes(body.event_type as typeof EVENT_TYPES[number]))) return new NextResponse(null,{status:204});
    {
      const event = body.event_type === "heartbeat" ? null : {
        id:uuid(body.id) ? body.id : crypto.randomUUID(), event_type:body.event_type,
        page_path:safePath(typeof body.page_path === "string" ? body.page_path : "/"),
        product_id:typeof body.product_id === "string" ? body.product_id.slice(0,100) : null,
        product_name:typeof body.product_name === "string" ? body.product_name.slice(0,200) : null,
        product_price:typeof body.product_price === "number" && Number.isFinite(body.product_price) ? Math.max(0,Math.min(1000000,body.product_price)) : null,
        quantity:typeof body.quantity === "number" ? Math.min(20,Math.max(1,Math.floor(body.quantity))) : 1,
        metadata:{survey_type:typeof body.survey_type==="string"?body.survey_type.slice(0,30):null,trigger:typeof body.trigger==="string"?body.trigger.slice(0,40):null,variant_id:typeof body.variant_id === "string" ? body.variant_id.slice(0,100) : null},
      };
      after(async () => { try {
        const session = await analyticsSession(req,body.client_bot_detected === true,typeof body.active_seconds === "number" ? body.active_seconds : 0);
        if(!session)return;
        const db=createAdminClient();
        if(event?.product_id){
          const {data:product}=await db.from("products").select("id,title,price").eq("slug",event.product_id).maybeSingle();
          if(product){
            event.product_name=product.title;event.product_price=event.product_price??Number(product.price);
            if(uuid(event.metadata.variant_id)){
              const {data:variant}=await db.from("variants").select("price").eq("id",event.metadata.variant_id).eq("product_id",product.id).maybeSingle();
              if(variant)event.product_price=Number(variant.price);
            }
          }
        }
        await db.rpc("ingest_analytics_event",{p_session:session,p_event:event});
      } catch { /* non-blocking */ } });
    }
  } catch { /* best effort */ }
  const response = new NextResponse(null,{status:204});
  return response;
}
