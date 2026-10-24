import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { RetailStoreFields } from "@/components/admin/retail-store-fields";
import { StoreProductAssignment, type AssignableProduct } from "@/components/admin/store-product-assignment";
import { carriesProduct, type RetailStore, type StoreAssignment } from "@/lib/retail-store-model";
import { saveRetailStore, deleteRetailStore } from "../actions";

export default async function StoreEditor({params}:{params:Promise<{id:string}>}){
  const session=await getAdminSession();if(!session)redirect("/admin/login");if(session.role!=="super_admin")redirect("/admin/orders");
  const {id}=await params;const db=await createClient();
  const [{data:row},{data:collections},{data:lineups}]=await Promise.all([
    db.from("retail_stores").select("*").eq("id",id).maybeSingle(),
    db.from("collections").select("id,title").is("deleted_at",null).order("title"),db.from("lineups").select("id,title").order("title"),
  ]);
  if(!row)notFound();
  const assignments:StoreAssignment[]=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from("product_retail_stores").select("*").eq("store_id",id).order("product_id").range(offset,offset+499);
    if(error)throw new Error("Could not load store assignments.");
    assignments.push(...(data??[]) as StoreAssignment[]);
    if(!data||data.length<500)break;
  }
  const store=row as RetailStore;const byId=new Map(assignments.map(a=>[a.product_id,a]));
  const products:AssignableProduct[]=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from("products").select("id,title,slug,lineup_id,product_collections(collection_id)").is("deleted_at",null).order("title").order("id").range(offset,offset+499);
    if(error)throw new Error(error.message);
    for(const p of data??[])products.push({id:p.id,title:p.title,slug:p.slug,lineup_id:p.lineup_id,collectionIds:(p.product_collections as {collection_id:string}[]).map(c=>c.collection_id),assigned:carriesProduct({...store,active:true},byId.get(p.id))});
    if(!data||data.length<500)break;
  }
  return <><AdminNav email={session.email} role={session.role}/><main className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><Link href="/admin/stores" className="text-xs uppercase tracking-widest text-gold">← All stores</Link><h1 className="mt-4 text-3xl font-light tracking-tight">{store.name}</h1><p className="mt-3 text-sm text-ink/55">Changes here update every product carrying this store.</p>
    <section className="mt-7 rounded-xl border border-ink/10 bg-white p-5 sm:p-6"><h2 className="mb-5 text-xl font-light">Store details</h2><AdminForm key={JSON.stringify(store)} action={saveRetailStore} success="Store details updated" className="grid gap-5 sm:grid-cols-2"><RetailStoreFields store={store}/><SaveButton className="sm:col-span-2">Save store</SaveButton></AdminForm></section>
    <StoreProductAssignment key={JSON.stringify([store.all_products,products.map(p=>[p.id,p.assigned])])} storeId={id} allProducts={store.all_products} products={products} collections={collections??[]} lineups={lineups??[]}/>
    <details className="mt-8 rounded-lg border border-red-200 p-5"><summary className="cursor-pointer text-sm text-red-800">Delete this store</summary><p className="my-4 text-xs text-ink/55">This removes the location and its assignments from every product. Pause visibility above if you may use it again.</p><AdminForm action={deleteRetailStore}><input type="hidden" name="id" value={id}/><ActionButton danger>Delete store permanently</ActionButton></AdminForm></details>
  </main></>;
}
