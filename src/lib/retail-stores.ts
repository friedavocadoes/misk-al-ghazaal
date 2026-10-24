import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { carriesProduct, type RetailStore, type StoreAssignment } from "./retail-store-model";

/** Optional below-fold content: missing migration never blocks a product purchase. */
export const getProductRetailStores=unstable_cache(async(productId:string):Promise<RetailStore[]>=>{
  try {
    const db=createPublicClient();
    const [stores,assignments]=await Promise.all([
      db.from("retail_stores").select("*").eq("active",true).order("sort").order("name"),
      db.from("product_retail_stores").select("store_id,product_id,available").eq("product_id",productId),
    ]);
    if(stores.error || assignments.error){
      const error=stores.error??assignments.error;
      if(error && !["PGRST205","42P01"].includes(error.code))console.error("Stockists lookup failed:",error.message);
      return [];
    }
    const byStore=new Map((assignments.data as StoreAssignment[]).map(a=>[a.store_id,a]));
    return (stores.data as RetailStore[]).filter(s=>carriesProduct(s,byStore.get(s.id)));
  } catch {return [];}
},["product-retail-stores-v1"],{tags:["retail-stores"],revalidate:60});
