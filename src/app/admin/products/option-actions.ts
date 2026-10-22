"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { touchProduct, productsBucketPath } from "@/lib/revalidate";
import { logAdmin } from "@/lib/audit";
import { cleanupProductArt } from "@/lib/product-storage";
import { CONCENTRATIONS, variantLabel } from "@/lib/product-options";

async function staff() {
  const session=await getAdminSession();
  if(session?.role!=="super_admin")throw new Error("Administrator access required.");
  return {session,db:await createClient()};
}
export async function setProductStock(form:FormData) {
  const {session,db}=await staff();
  const id=String(form.get("product_id"));
  const value=form.get("out_of_stock")==="true";
  const {error}=await db.from("products").update({out_of_stock:value}).eq("id",id);
  if(error)throw new Error("Could not update availability. Apply migration_product_options.sql first.");
  await touchProduct(db,id);
  revalidatePath("/admin/products"); revalidatePath(`/admin/products/${id}`);
  await logAdmin(db,session,{category:"products",action:"update",entity:"product",entityId:id,summary:value?"Manually marked product out of stock":"Released manual out-of-stock override",details:{out_of_stock:value}});
}
export async function saveProductVariant(form:FormData) {
  const {session,db}=await staff();
  const productId=String(form.get("product_id"));
  const id=String(form.get("variant_id")||"");
  const concentration=String(form.get("concentration")||"");
  const capacity=form.get("capacity_ml")?Number(form.get("capacity_ml")):null;
  const price=Number(form.get("v_price")); const stock=String(form.get("v_stock")??"").trim()===""?null:Number(form.get("v_stock"));
  if(concentration && !CONCENTRATIONS.some(c=>c===concentration))throw new Error("Choose a valid concentration.");
  if(capacity!==null && (!Number.isFinite(capacity)||capacity<=0||capacity>100000))throw new Error("Capacity must be greater than zero.");
  if(concentration && !capacity)throw new Error("Add the capacity in ml for this concentration.");
  if(!Number.isFinite(price)||price<=0||(stock!==null && (!Number.isSafeInteger(stock)||stock<0)))throw new Error("Enter a positive price and a whole stock count of zero or more.");
  const {data:product,error:productError}=await db.from("products").select("id").eq("id",productId).is("deleted_at",null).single();
  if(productError||!product)throw new Error("Product no longer available.");
  const {data:existing,error:readError}=await db.from("variants").select("*").eq("product_id",productId);
  if(readError)throw new Error(readError.message);
  if(id && !existing?.some(v=>v.id===id))throw new Error("Variant does not belong to this product.");
  if(capacity!==null && existing?.some(v=>v.id!==id && v.is_active!==false && (v.concentration||"")===concentration && Number(v.capacity_ml)===capacity))throw new Error("This concentration and size already exist. Edit that option instead.");
  let images:unknown;
  try{images=JSON.parse(String(form.get("images")||"[]"));}catch{throw new Error("Invalid gallery.");}
  if(!Array.isArray(images)||images.length>12||images.some(u=>typeof u!=="string"||!productsBucketPath(u)||!u.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/`)))throw new Error("Use uploaded product images for the variant gallery.");
  const shared=form.get("use_product_images")==="true";
  if(!shared&&!images.length)throw new Error("Upload an image or choose the product gallery.");
  const custom=String(form.get("custom_label")||"").trim().slice(0,120);
  const row={product_id:productId,concentration:concentration||null,capacity_ml:capacity,
    title:variantLabel(concentration,capacity,custom),name_override:String(form.get("name_override")||"").trim().slice(0,200)||null,
    price,stock,sku:String(form.get("v_sku")||"").trim().slice(0,100)||null,images,use_product_images:shared,is_active:true};
  const result=id?await db.from("variants").update(row).eq("id",id).eq("product_id",productId):await db.from("variants").insert(row);
  if(result.error)throw new Error(result.error.code==="23505"?"That option already exists.":`${result.error.message}. Check migration_product_options.sql is installed.`);
  const previous=existing?.find(v=>v.id===id)?.images??[];
  await cleanupProductArt(db,(previous as string[]).filter(u=>!images.includes(u)));
  // Base price is the lowest active option, so listing prices and search match the picker.
  const {data:active}=await db.from("variants").select("price").eq("product_id",productId).eq("is_active",true).order("price").limit(1);
  if(active?.[0])await db.from("products").update({price:active[0].price}).eq("id",productId);
  await touchProduct(db,productId);
  revalidatePath(`/admin/products/${productId}`); revalidatePath("/admin/products");
  await logAdmin(db,session,{category:"products",action:id?"update":"create",entity:"variant",entityId:id||productId,label:row.title,summary:`${id?"Updated":"Added"} ${row.title}`,details:row});
}
export async function archiveProductVariant(form:FormData) {
  const {session,db}=await staff();
  const productId=String(form.get("product_id")),id=String(form.get("variant_id"));
  const {data:active,error:readError}=await db.from("variants").select("id").eq("product_id",productId).eq("is_active",true);
  if(readError)throw new Error(readError.message);
  if(!active?.some(v=>v.id===id)||active.length<2)throw new Error("Keep at least one active option.");
  const {error}=await db.from("variants").update({is_active:false}).eq("id",id).eq("product_id",productId);
  if(error)throw new Error(error.message);
  const {data:cheapest}=await db.from("variants").select("price").eq("product_id",productId).eq("is_active",true).order("price").limit(1);
  if(cheapest?.[0])await db.from("products").update({price:cheapest[0].price}).eq("id",productId);
  await touchProduct(db,productId); revalidatePath(`/admin/products/${productId}`);revalidatePath("/admin/products");
  await logAdmin(db,session,{category:"products",action:"update",entity:"variant",entityId:id,summary:"Archived product option; order history preserved",details:{product_id:productId}});
}
