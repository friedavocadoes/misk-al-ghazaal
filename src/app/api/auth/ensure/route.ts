import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { ensureProfile } from "@/lib/auth-profile";
import { buildWelcomeEmail, sendMail } from "@/lib/mailer";

/** Backfill the shopper profile after client-side email auth.
    Brand-new accounts also get the welcome mail (once). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const { ref } = ((await req.json().catch(() => ({}))) as { ref?: string });
  const admin = await createAdminClient();
  const { created } = await ensureProfile(admin, user.id, user.email ?? null, ref);
  if (created && user.email) {
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
    const name = meta.full_name || meta.name || user.email.split("@")[0] || "";
    await sendMail({ to: user.email, ...buildWelcomeEmail(name) });
  }
  return NextResponse.json({ ok: true });
}
