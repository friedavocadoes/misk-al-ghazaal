import "server-only";
import { createAdminClient } from "./supabase/service";
import { buildOrderEmail,sendMailboxMail } from "./mailer";
import { statusLabel } from "./order-status";
import { paymentMethodLabel } from "./admin-orders-model";
import { getSiteUrl } from "./site-url";
import { wantsOrderMail } from "./email-settings";
import { resolveInvoiceAttachment } from "./invoice-attach";
const h=(v:unknown)=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

export async function notifyOrderUpdate(id:string,attachInvoice=false,expectedStatus?:string) {
 try{
  const db=createAdminClient();const {data:o,error}=await db.from("orders").select("*").eq("id",id).is("deleted_at",null).single();
  if(error||!o?.email||(expectedStatus&&o.status!==expectedStatus))return false;
  let owner=o.user_id as string|null;
  if(!owner){const {data:profile}=await db.from("profiles").select("id").eq("email",o.email.toLowerCase()).limit(1).maybeSingle();owner=profile?.id??null;}
  if(!await wantsOrderMail(db,owner))return false;
  const {data:items}=await db.from("order_items").select("title,qty,unit_price,product_slug").eq("order_id",id);
  const slugs=[...new Set((items??[]).map(i=>i.product_slug))];
  const {data:products}=slugs.length?await db.from("products").select("slug,images").in("slug",slugs):{data:[]};
  const images=new Map((products??[]).map(p=>[p.slug,p.images?.[0] as string|undefined]));
  const mail=buildOrderEmail({orderNo:o.order_no,date:new Date(o.created_at).toLocaleDateString("en-GB",{timeZone:"Asia/Dubai",day:"numeric",month:"long",year:"numeric"}),status:o.status,statusLabel:statusLabel(o.status),
   customerName:h(o.customer_name),origin:getSiteUrl(),lines:(items??[]).map(i=>({title:h(i.title),qty:i.qty,unit:Number(i.unit_price),image:images.get(i.product_slug),href:i.product_slug!=="gift"&&i.product_slug!=="sample"?`/product/${encodeURIComponent(i.product_slug)}`:undefined})),
   subtotal:Number(o.subtotal),discount:Number(o.discount),shipping:Number(o.shipping),total:Number(o.total),addressHtml:[o.address,o.city,o.state_name||o.emirate,o.country_code].filter(Boolean).map(h).join(" · "),
   trackingNo:o.tracking_no??undefined,trackingUrl:o.tracking_url??undefined,paymentLabel:paymentMethodLabel(o.payment_method),couponCode:o.coupon_code||undefined});
  const attachment=attachInvoice?await resolveInvoiceAttachment(db,id):null;
  return (await sendMailboxMail("noreply",{to:o.email,...mail,...(attachment?{attachments:[attachment]}:{})})).sent;
 }catch{return false;}
}
