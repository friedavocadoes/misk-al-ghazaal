import { queueWhatsAppOrder,processWhatsAppQueue } from "@/lib/whatsapp";
import { after,NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { uuid } from "@/lib/analytics/shared";
import { logAdmin } from "@/lib/audit";
import { notifyOrderUpdate } from "@/lib/order-notifications";
import { revalidatePagePaths } from "@/lib/revalidate";
import { revalidatePath } from "next/cache";
export async function POST(req:Request){
 const staff=await getAdminSession();if(!staff||!["super_admin","orders"].includes(staff.role))return NextResponse.json({error:"Forbidden"},{status:403});
 if(req.headers.get("origin")&&req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"Forbidden"},{status:403});
 try{
  const b=await req.json();if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>200||b.ids.some((id:unknown)=>!uuid(id)))throw Error("Select 1–200 orders");
  const db=createAdminClient();const {data,error}=await db.rpc("admin_bulk_orders",{p_actor:staff.userId,p_ids:b.ids,p_status:b.status||null,p_payment:b.payment_status||null,p_bin:b.bin===true});if(error)throw Error(error.message);
  await logAdmin(db,staff,{category:"orders",action:b.bin?"delete":"bulk_update",entity:"order",summary:`Updated ${data.length} selected orders`,details:{changes:data}});
  revalidatePath("/admin/orders");for(const id of b.ids)revalidatePath(`/admin/orders/${id}`);revalidatePagePaths("/account/orders");revalidatePagePaths("/account/orders/[id]");
  if(b.notify_customer&&!b.bin)after(async()=>{for(const change of data)if(change.from_status!==change.to_status)await notifyOrderUpdate(change.id,false,change.to_status);});
  if(b.notify_whatsapp===true && !b.bin) {
    let whatsappError=false;
    for(const change of data) if(change.from_status!==change.to_status) { try {await queueWhatsAppOrder(change.id);} catch {whatsappError=true;} }
    after(async()=>{try{await processWhatsAppQueue();}catch{/* Durable jobs remain pending. */}});
    if(whatsappError)return NextResponse.json({updated:data.length,warning:"Orders saved, but some WhatsApp notifications could not be queued. Check WhatsApp setup."});
  }
  return NextResponse.json({updated:data.length});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not update orders"},{status:400});}
}
