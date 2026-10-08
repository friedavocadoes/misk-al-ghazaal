import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { ensureProfile } from "@/lib/auth-profile";

/** Backfill the shopper profile after client-side email auth. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const { ref } = ((await req.json().catch(() => ({}))) as { ref?: string });
  const admin = await createAdminClient();
  await ensureProfile(admin, user.id, user.email ?? null, ref);
  return NextResponse.json({ ok: true });
}
