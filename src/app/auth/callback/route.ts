import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { ensureProfile } from "@/lib/auth-profile";
import { buildWelcomeEmail, sendMail } from "@/lib/mailer";

/** OAuth + email-confirm landing: exchanges the code, bootstraps the
    profile (referral code + optional ?ref= attribution), welcomes brand-new
    accounts by mail, then sends the shopper home in their locale. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const ref = url.searchParams.get("ref") ?? undefined;
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const admin = await createAdminClient();
      const { created } = await ensureProfile(admin, data.user.id, data.user.email ?? null, ref);
      if (created && data.user.email) {
        const meta = (data.user.user_metadata ?? {}) as { full_name?: string; name?: string };
        const name = meta.full_name || meta.name || data.user.email.split("@")[0] || "";
        await sendMail({ to: data.user.email, ...buildWelcomeEmail(name) });
      }
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
