import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { ensureProfile } from "@/lib/auth-profile";
import { buildHelloEmail, sendMailboxMail } from "@/lib/mailer";
import { getHelloProducts, getHelloSettings } from "@/lib/email-settings";

/** Backfill the shopper profile after client-side email auth.
    Brand-new accounts also get the hello welcome mail (once). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const { ref, promoOptIn } = ((await req.json().catch(() => ({}))) as {
    ref?: string;
    promoOptIn?: boolean;
  });
  const admin = await createAdminClient();
  const { created } = await ensureProfile(
    admin,
    user.id,
    user.email ?? null,
    ref,
    promoOptIn,
  );
  if (created && user.email) {
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
    const name = meta.full_name || meta.name || user.email.split("@")[0] || "";
    const settings = await getHelloSettings();
    const products = await getHelloProducts(settings.productSlugs);
    const origin = new URL(req.url).origin;
    await sendMailboxMail("hello", {
      to: user.email,
      subject: settings.subject,
      ...buildHelloEmail({
        name,
        heading: settings.heading,
        bodyHtml: settings.bodyHtml,
        products,
        origin,
      }),
    });
  }
  return NextResponse.json({ ok: true });
}
