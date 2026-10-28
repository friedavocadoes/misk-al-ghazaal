import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { attentionKind } from "@/lib/admin-attention";
import { uuid } from "@/lib/analytics/shared";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const staff = await getAdminSession();
  if (!staff || !["super_admin", "orders"].includes(staff.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  const { data, error } = await createAdminClient().rpc(
    "admin_attention_feed",
    { p_actor: staff.userId },
  );
  return error
    ? NextResponse.json(
        {
          error:
            "Notifications unavailable. Apply migration_admin_attention.sql for a new setup.",
        },
        { status: 503, headers },
      )
    : NextResponse.json(data, { headers });
}
export async function POST(req: Request) {
  const staff = await getAdminSession();
  if (!staff || !["super_admin", "orders"].includes(staff.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin)
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  try {
    if (Number(req.headers.get("content-length")) > 1024)
      throw Error("Invalid request");
    const raw = await req.text();
    if (raw.length > 1024) throw Error("Invalid request");
    const body = JSON.parse(raw);
    if (
      !attentionKind(body.kind) ||
      !uuid(body.id) ||
      typeof body.read !== "boolean"
    )
      throw Error("Invalid read state");
    if (body.kind === "review" && staff.role !== "super_admin")
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers },
      );
    const { error } = await createAdminClient().rpc("admin_attention_mark", {
      p_actor: staff.userId,
      p_kind: body.kind,
      p_id: body.id,
      p_read: body.read,
    });
    if (error)
      return NextResponse.json(
        { error: "This item could not be updated." },
        { status: 400, headers },
      );
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400, headers },
    );
  }
}
