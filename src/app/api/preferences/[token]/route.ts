import { createAdminClient } from "@/lib/supabase/service";
import { validPreferenceToken } from "@/lib/leads";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const { token } = await params;
  if (!validPreferenceToken(token))
    return Response.json({ error: "Invalid link" }, { status: 404 });
  try {
    const raw = await req.text();
    if (raw.length > 1024) throw Error("Request too large");
    const b = JSON.parse(raw);
    if (
      [b.emailPromo, b.waOrders, b.waPromo].some((v) => typeof v !== "boolean")
    )
      throw Error("Choose your preferences");
    const { error } = await createAdminClient().rpc(
      "save_communication_preferences",
      {
        p_token: token,
        p_email_promo: b.emailPromo,
        p_wa_orders: b.waOrders,
        p_wa_promo: b.waPromo,
      },
    );
    if (error) throw Error("Could not save preferences. Try again.");
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not save" },
      { status: 400 },
    );
  }
}
