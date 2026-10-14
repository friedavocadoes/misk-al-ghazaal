import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { logAdmin } from "@/lib/audit";

/** POST /api/admin/log — audit events that happen browser-side (admin
    login/logout run through supabase-js, not server actions). Session-gated;
    writes go through the staff INSERT policy. Never fails the caller.
    (Failed sign-ins stay in Supabase Dashboard → Authentication → Logs —
    this endpoint takes no unauthenticated writes by design.) */
export async function POST(req: Request) {
  try {
    const s = await getAdminSession();
    if (!s) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const body = (await req.json().catch(() => null)) as {
      action?: string;
      details?: Record<string, unknown>;
    } | null;
    const action = String(body?.action ?? "");
    if (!["login", "logout"].includes(action)) {
      return NextResponse.json({ error: "bad action" }, { status: 400 });
    }
    const supabase = await createClient();
    await logAdmin(supabase, s, {
      category: "auth",
      action,
      entity: "session",
      label: s.email,
      summary: action === "login" ? `${s.email} signed in (${s.role})` : `${s.email} signed out`,
      details: body?.details && typeof body.details === "object" ? body.details : {},
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
