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
  const rawNext = url.searchParams.get("next") ?? "/";
  // `next` comes from our own login links — accept internal paths only
  // (never protocol-relative or absolute URLs).
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

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
  // Redirect to the request's public origin, not the internal one:
  // behind a proxy/CDN `url.origin` can be the internal host (or a stale
  // default), which bounces freshly-logged-in shoppers to the wrong domain.
  const headers = (req as unknown as { headers: Headers }).headers;
  const proto =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host") || url.host;
  return NextResponse.redirect(new URL(next, `${proto}://${host}`));
}
