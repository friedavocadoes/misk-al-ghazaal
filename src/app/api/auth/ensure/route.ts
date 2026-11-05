import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bootstrapShopper } from "@/lib/auth-bootstrap";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const ref = typeof body?.ref === "string" ? body.ref.trim().slice(0, 100) : undefined;
  await bootstrapShopper(user, new URL(req.url).origin, ref);
  return NextResponse.json({ ok: true });
}
