import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { whatsappPhone } from "@/lib/whatsapp-shared";
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user || !user.email_confirmed_at)
    return Response.json(
      { error: "Please sign in with a verified account." },
      { status: 401 },
    );
  try {
    if (Number(req.headers.get("content-length")) > 2048)
      throw Error("Request too large");
    const b = await req.json(),
      phone = typeof b.phone === "string" ? whatsappPhone(b.phone) : null;
    if (
      !phone ||
      typeof b.orders !== "boolean" ||
      typeof b.marketing !== "boolean"
    )
      throw Error("Enter an international number, e.g. +971 50 123 4567.");
    const db = createAdminClient();
    const { data: profile, error: pe } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (pe)
      throw Error("Apply migration_whatsapp.sql before saving preferences.");
    if (profile.role !== "customer")
      return Response.json(
        { error: "Customer accounts only" },
        { status: 403 },
      );
    const { error } = await db.rpc("whatsapp_save_preferences", {
      p_user: user.id,
      p_phone: phone,
      p_orders: b.orders,
      p_marketing: b.marketing,
    });
    if (error) throw Error("Could not save WhatsApp preferences.");
    return Response.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not save" },
      { status: 400 },
    );
  }
}
