import { createPublicClient } from "@/lib/supabase/public";
export async function GET() {
  const db = createPublicClient();
  const [samples, tiers, categories] = await Promise.all([
    db
      .from("samples")
      .select("*,sample_notes(notes(id,slug,name,name_ar,color,glyph,description,description_ar))")
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
        noteDetails: (s.sample_notes || []).flatMap((r: { notes: { id: string; slug: string; name: string; name_ar: string | null; color: string; glyph: string | null; description: string | null; description_ar: string | null } | null }) => r.notes ? [{
          id: r.notes.id, slug: r.notes.slug, name: r.notes.name, nameAr: r.notes.name_ar ?? undefined,
          color: r.notes.color, glyph: r.notes.glyph ?? undefined,
          description: r.notes.description ?? undefined, descriptionAr: r.notes.description_ar ?? undefined,
        }] : []),
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
