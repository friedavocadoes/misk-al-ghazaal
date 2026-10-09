import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/keys";

/** Public read: active delivery countries for the checkout picker + map.
    Admin manages the list at /admin/countries. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("delivery_countries")
    .select("code, name_en, name_ar, states")
    .eq("active", true)
    .order("sort");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    countries: ((data as { code: string; name_en: string; name_ar: string | null; states: unknown }[] | null) ?? []).map((c) => ({
      code: c.code,
      name: c.name_en,
      ...(c.name_ar ? { nameAr: c.name_ar } : {}),
      states: Array.isArray(c.states) ? c.states : [],
    })),
  });
}
