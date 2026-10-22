import { getProductsBySlugs } from "@/lib/store";
import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/keys";

// Public read: resolve product slugs → minimal card fields.
// Used by client components (CartDrawer) that can't call async store getters.
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const slugs = (searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (!slugs.length) return NextResponse.json({ products: [] });
  if(searchParams.get("view")==="cards"){
    try{return NextResponse.json({products:await getProductsBySlugs(slugs)});}
    catch{return NextResponse.json({error:"Products are temporarily unavailable"},{status:503});}
  }
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug,title,title_ar,price,images,variants(*)")
    .is("deleted_at", null)
    .in("slug", slugs);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}
