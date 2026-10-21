import { createPublicClient } from "@/lib/supabase/public";
export async function GET() {
  const db = createPublicClient();
  const [samples, tiers, categories] = await Promise.all([
    db.from("samples").select("*").eq("active", true).order("name"),
    db.from("sample_tiers").select("*").order("min_subtotal"),
    db.from("sample_categories").select("*").order("name"),
  ]);
  if (samples.error || tiers.error || categories.error)
    return Response.json({ error: "Samples unavailable" }, { status: 503 });
  return Response.json(
    { samples: samples.data, tiers: tiers.data, categories: categories.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
