import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { analyticsRange, type CustomerData } from "@/lib/analytics/dashboard";
import { csvCell } from "@/lib/analytics/shared";
import { logAdmin } from "@/lib/audit";

export async function GET(req:Request){
 const session=await getAdminSession(true);
 if(session?.role!=="super_admin")return Response.json({error:"Forbidden"},{status:403});
 try {
  const params=new URL(req.url).searchParams;const range=analyticsRange(params);const db=createAdminClient();
  const filters={...range,search_text:(params.get("q")??"").slice(0,100),promo_filter:["yes","no"].includes(params.get("promo")??"")?params.get("promo"):"all",page_size:500};
  const first=await db.rpc("analytics_customers",{...filters,page_offset:0});if(first.error)throw first.error;
  await logAdmin(db,session,{category:"analytics",action:"export",entity:"customers",label:"Customer analytics export",summary:"Exported customer directory and analytics",details:{...filters,total:(first.data as CustomerData).total}});
  const columns:[string,keyof CustomerData["rows"][number]][]=[["Customer ID","id"],["Email","email"],["Name","full_name"],["Phone","phone"],["Address","default_address"],["Promotion emails enabled","promo_opt_in"],["Order updates enabled","order_updates_opt_in"],["Sessions in range","sessions"],["Active seconds in range","active_seconds"],["First seen in range","first_seen"],["Last seen in range","last_seen"],["Orders in range","orders"],["Order value AED in range","spent"]];
  let offset=0;let ended=false;const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({async pull(controller){
   try {
    if(req.signal.aborted){controller.close();return;}
    if(!offset)controller.enqueue(encoder.encode("\uFEFF"+columns.map(c=>csvCell(c[0])).join(",")+"\r\n"));
    const response=offset ? await db.rpc("analytics_customers",{...filters,page_offset:offset}) : first;
    if(response.error)throw response.error;
    const data=response.data as CustomerData;
    const text=data.rows.map(row=>columns.map(([,key])=>csvCell(row[key])).join(",")).join("\r\n");
    if(text)controller.enqueue(encoder.encode(text+"\r\n"));
    offset+=data.rows.length;
    if(data.rows.length<500 || offset>=data.total){ended=true;controller.close();}
   }catch(error){if(!ended)controller.error(error);}
  }});
  return new Response(stream,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="misk-customers-${params.get("start")}.csv"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return Response.json({error:"Export unavailable. Check the analytics migration and date range."},{status:503});}
}
