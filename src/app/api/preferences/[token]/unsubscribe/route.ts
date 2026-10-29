import { createAdminClient } from "@/lib/supabase/service";
import { validPreferenceToken } from "@/lib/leads";
/** RFC8058 one-click POST. GET/link scanning never unsubscribes. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!validPreferenceToken(token)) return new Response(null, { status: 404 });
  const raw = await req.text();
  if (
    raw.length > 1024 ||
    new URLSearchParams(raw).get("List-Unsubscribe") !== "One-Click"
  )
    return new Response(null, { status: 400 });
  const db = createAdminClient(),
    { data: l, error } = await db
      .from("customer_leads")
      .select("email")
      .eq("preference_token", token)
      .maybeSingle();
  if (error) return new Response(null, { status: 503 });
  if (!l) return new Response(null, { status: 404 });
  const { error: save } = await db.rpc("unsubscribe_lead_email", {
    p_token: token,
  });
  return new Response(null, {
    status: save ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
