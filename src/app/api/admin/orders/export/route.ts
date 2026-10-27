import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { ordersQuery } from "@/lib/admin-orders-query";
import { csvCell } from "@/lib/analytics/shared";
import { paymentMethodLabel,paymentStatusLabel,type AdminOrderRow } from "@/lib/admin-orders-model";
import { statusLabel } from "@/lib/order-status";
import { logAdmin } from "@/lib/audit";
export async function GET(req:Request){
 const staff=await getAdminSession();if(!staff||!["super_admin","orders"].includes(staff.role))return new Response("Forbidden",{status:403});
 try{
  const args={...ordersQuery(new URL(req.url).searchParams,500),page_offset:0};const db=createAdminClient();
  const first=await db.rpc("admin_orders_report",args);if(first.error)throw Error("Orders export unavailable. Apply migration_orders_workspace.sql.");
  await logAdmin(db,staff,{category:"orders",action:"export",entity:"order",summary:`Exported ${first.data.total} matching orders`,details:{filters:args,total:first.data.total}});
  const encoder=new TextEncoder();
  const stream=new ReadableStream({async start(controller){try{
   controller.enqueue(encoder.encode("\uFEFF"+["Order","Date (Dubai)","Customer","Email","Phone","Amount AED","Payment status","Payment type","Order status","Units","Items","Tracking number"].map(csvCell).join(",")+"\r\n"));
   let page=first.data,offset=0;
   while(true){
    for(const o of page.rows as AdminOrderRow[])controller.enqueue(encoder.encode([o.order_no,new Date(o.created_at).toLocaleString("en-GB",{timeZone:"Asia/Dubai"}),o.customer_name,o.email,o.phone,o.total,paymentStatusLabel(o.payment_status),paymentMethodLabel(o.payment_method),statusLabel(o.status),o.order_items.reduce((n,i)=>n+i.qty,0),o.order_items.map(i=>`${i.qty} × ${i.title}`).join("; "),o.tracking_no].map(csvCell).join(",")+"\r\n"));
    offset+=page.rows.length;if(!page.rows.length||offset>=first.data.total)break;
    const next=await db.rpc("admin_orders_report",{...args,page_offset:offset});if(next.error)throw next.error;page=next.data;
   }controller.close();
  }catch(error){controller.error(error);}}});
  return new Response(stream,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="misk-orders.csv"',"Cache-Control":"private, no-store"}});
 }catch(e){return new Response(e instanceof Error?e.message:"Export unavailable",{status:503,headers:{"Cache-Control":"no-store"}});}
}
