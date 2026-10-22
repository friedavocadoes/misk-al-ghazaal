import type { SupabaseClient } from "@supabase/supabase-js";
import { productsBucketPath } from "./revalidate";

/** Keep shared and archived galleries intact when another gallery removes an image. */
export async function cleanupProductArt(db:SupabaseClient,urls:string[]) {
  const removed:string[]=[];
  for(const url of new Set(urls)) {
    const path=productsBucketPath(url);
    if(!path || !url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/`))continue;
    const reads=await Promise.all([
      db.from("products").select("id",{count:"exact",head:true}).contains("images",[url]),
      db.from("products").select("id",{count:"exact",head:true}).eq("notes_image_desktop",url),
      db.from("products").select("id",{count:"exact",head:true}).eq("notes_image_mobile",url),
      db.from("variants").select("id",{count:"exact",head:true}).contains("images",[url]),
      db.from("notes").select("id",{count:"exact",head:true}).eq("glyph",url),
    ]);
    // A missing migration or failed read must never delete a potentially shared file.
    if(reads.some(r=>r.error || (r.count??0)>0))continue;
    const {error}=await db.storage.from("products").remove([decodeURIComponent(path)]);
    if(!error)removed.push(url);
  }
  return removed;
}
