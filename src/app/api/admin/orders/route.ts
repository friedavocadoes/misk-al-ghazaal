import { after,NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { ordersQuery } from "@/lib/admin-orders-query";
import { quoteBag,type BagLine } from "@/lib/pricing";
import { PAYMENT_METHODS } from "@/lib/admin-orders-model";
import { uuid } from "@/lib/analytics/shared";
import { notifyOrderUpdate } from "@/lib/order-notifications";
import { logAdmin } from "@/lib/audit";
import { revalidateHome,revalidatePagePaths,revalidateProductPaths } from "@/lib/revalidate";

export async function GET(req:Request){
 const staff=await getAdminSession();if(!staff||!["super_admin","orders"].includes(staff.role))return NextResponse.json({error:"Forbidden"},{status:403});
 try{const args=ordersQuery(new URL(req.url).searchParams);const {data,error}=await createAdminClient().rpc("admin_orders_report",args);if(error)throw Error("Orders unavailable. Apply migration_orders_workspace.sql.");return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Orders unavailable"},{status:400,headers:{"Cache-Control":"no-store"}});}
}
export async function POST(req:Request){
 const staff=await getAdminSession();if(!staff||!["super_admin","orders"].includes(staff.role))return NextResponse.json({error:"Forbidden"},{status:403});
 if(req.headers.get("origin")&&req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"Forbidden"},{status:403});
 try{
  if(Number(req.headers.get("content-length"))>32000)throw Error("Order is too large");
  const b=await req.json();if(!uuid(b.request_id))throw Error("Invalid request reference");
  const lines=b.items as BagLine[];
  if(!Array.isArray(lines)||!lines.length||lines.length>50||lines.some(l=>typeof l.slug!=="string"||!Number.isInteger(l.qty)||l.qty<1||l.qty>20))throw Error("Choose valid products and quantities");
  if(!PAYMENT_METHODS.includes(b.payment_method)||!["pending","paid"].includes(b.payment_status))throw Error("Invalid payment details");
  const customer={name:String(b.customer_name??"").trim(),phone:String(b.phone??"").trim(),email:String(b.email??"").trim(),address:String(b.address??"").trim(),city:String(b.city??"").trim(),state:String(b.state??"").trim(),country:String(b.country??"AE").toUpperCase(),postcode:String(b.postcode??"").trim(),notes:String(b.notes??"").trim()};
  if(!customer.name||!customer.phone||!customer.address||!customer.city||!customer.state||! /^[A-Z]{2}$/.test(customer.country))throw Error("Complete the customer and delivery details");
  if(customer.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))throw Error("Enter a valid email address");
  const db=createAdminClient();
  const previous=await db.from("orders").select("id,order_no,created_by").eq("admin_request_id",b.request_id).maybeSingle();
  if(previous.error)throw Error("Manual orders unavailable. Apply migration_orders_workspace.sql.");
  if(previous.data){if(previous.data.created_by!==staff.userId)throw Error("Request belongs to another administrator");return NextResponse.json({...previous.data,existing:true});}
  const {data:zone,error:zoneError}=await db.from("delivery_countries").select("id").eq("code",customer.country).eq("active",true).maybeSingle();
  if(zoneError)throw Error("Could not check delivery countries");if(!zone)throw Error("Choose an enabled delivery country");
  const {priced,quote}=await quoteBag({lines,email:customer.email});
  const shipping=b.shipping===undefined?quote.shipping:Number(b.shipping);if(!Number.isFinite(shipping)||shipping<0||shipping>100000)throw Error("Invalid shipping amount");
  const {data,error}=await db.rpc("admin_create_order",{p_actor:staff.userId,p_request:b.request_id,p_customer:customer,p_lines:priced.map(l=>({slug:l.slug,variant_id:l.variantId??null,qty:l.qty})),p_shipping:shipping,p_method:b.payment_method,p_payment:b.payment_status});
  if(error)throw Error(error.message);
  if(!data.existing){await logAdmin(db,staff,{category:"orders",action:"create",entity:"order",entityId:data.id,label:data.order_no,summary:`Created manual order ${data.order_no}`,details:{payment_method:b.payment_method,payment_status:b.payment_status,request_id:b.request_id}});
   after(async()=>{if(b.notify_customer)await notifyOrderUpdate(data.id,false,"new");});
  }
  for(const slug of new Set(priced.map(l=>l.slug)))revalidateProductPaths(slug);revalidateHome();revalidatePagePaths("/collection/[slug]");
  return NextResponse.json(data);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not create order"},{status:400});}
}
