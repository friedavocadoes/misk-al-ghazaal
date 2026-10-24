"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePagePaths } from "@/lib/revalidate";
import { validGoogleMapsUrl } from "@/lib/retail-store-model";
import { logAdmin } from "@/lib/audit";

async function staff(){
  const session=await getAdminSession();
  if(session?.role!=="super_admin")throw new Error("Administrator access required.");
  return {session,db:await createClient()};
}
function refresh(id:string){
  revalidateTag("retail-stores",{expire:0});
  revalidatePagePaths("/product/[slug]");
  revalidatePath("/admin/stores");revalidatePath(`/admin/stores/${id}`);
}
export async function saveRetailStore(form:FormData){
  const {session,db}=await staff();
  const id=String(form.get("id")||"");
  const text=(name:string,max=300)=>String(form.get(name)||"").trim().slice(0,max);
  const name=text("name",180),maps=text("maps_url",2000),sort=Number(form.get("sort")||0);
  if(!name)throw new Error("Enter the store name.");
  if(!validGoogleMapsUrl(maps))throw new Error("Use a secure Google Maps link, or leave it blank to use the address.");
  if(!Number.isSafeInteger(sort)||Math.abs(sort)>100000)throw new Error("Enter a valid display order.");
  const row={name,name_ar:text("name_ar",180)||null,location:text("location",120),location_ar:text("location_ar",120)||null,
    address:text("address",500),address_ar:text("address_ar",500)||null,maps_url:maps,phone:text("phone",40),hours:text("hours",180),hours_ar:text("hours_ar",180)||null,
    active:form.get("active")==="on",all_products:form.get("all_products")==="on",sort};
  const query=id?db.from("retail_stores").update(row).eq("id",id):db.from("retail_stores").insert(row);
  const {data,error}=await query.select("id").single();
  if(error||!data)throw new Error(error?.message||"Could not save the store. Apply migration_retail_stores.sql first.");
  await logAdmin(db,session,{category:"stores",action:id?"update":"create",entity:"retail_store",entityId:data.id,label:name,summary:`${id?"Updated":"Created"} stockist ${name}`,details:row});
  refresh(data.id);
  if(!id)redirect(`/admin/stores/${data.id}`);
}
export async function assignRetailStore(form:FormData){
  const {session,db}=await staff();
  const id=String(form.get("store_id"));
  let ids:unknown;try{ids=JSON.parse(String(form.get("product_ids")||"[]"));}catch{throw new Error("Invalid selection.");}
  if(!Array.isArray(ids)||!ids.length||ids.length>5000||ids.some(v=>typeof v!=="string"||! /^[0-9a-f-]{36}$/i.test(v)))throw new Error("Select one or more products.");
  const available=String(form.get("available"));
  if(!["true","false"].includes(available))throw new Error("Choose add or remove.");
  const {data,error}=await db.rpc("assign_retail_store",{p_store_id:id,p_product_ids:ids,p_available:available==="true"});
  if(error)throw new Error(error.message);
  await logAdmin(db,session,{category:"stores",action:"assign",entity:"retail_store",entityId:id,summary:`${available==="true"?"Added":"Removed"} ${data} products ${available==="true"?"to":"from"} stockist`,details:{product_ids:ids,available:available==="true"}});
  refresh(id);
}
export async function deleteRetailStore(form:FormData){
  const {session,db}=await staff();const id=String(form.get("id"));
  const {data,error}=await db.from("retail_stores").delete().eq("id",id).select("name").single();
  if(error)throw new Error(error.message);
  await logAdmin(db,session,{category:"stores",action:"delete",entity:"retail_store",entityId:id,label:data.name,summary:`Deleted stockist ${data.name}; product assignments removed`});
  refresh(id);redirect("/admin/stores");
}
