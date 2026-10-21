import { createPublicClient } from "@/lib/supabase/public";
export async function GET() {
  const db = createPublicClient();
  const [samples, tiers, categories] = await Promise.all([
    db
      .from("samples")
      .select("*,sample_notes(notes(id,name))")
      .eq("active", true)
      .order("name"),
    db.from("sample_tiers").select("*").order("min_subtotal"),
    db.from("sample_categories").select("*").order("name"),
  ]);
  if (samples.error || tiers.error || categories.error)
    return Response.json({ error: "Samples unavailable" }, { status: 503 });
  return Response.json(
    {
      samples: samples.data?.map((s) => ({
        ...s,
        notes: (s.sample_notes || [])
          .map((r: { notes: { name: string } }) => r.notes?.name)
          .filter(Boolean)
          .join(" · "),
      })),
      tiers: tiers.data,
      categories: categories.data,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
