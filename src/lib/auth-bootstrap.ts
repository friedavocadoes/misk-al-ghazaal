import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/service";
import { ensureProfile, claimGuestOrders } from "@/lib/auth-profile";
import { buildHelloEmail, sendMailboxMail } from "@/lib/mailer";
import { getHelloProducts, getHelloSettings } from "@/lib/email-settings";

export async function bootstrapShopper(user: User, origin: string, ref?: string) {
  const admin = createAdminClient();
  const { created } = await ensureProfile(
    admin, user.id, user.email ?? null, ref,
    user.app_metadata.provider === "email" && user.user_metadata.signup_promo_opt_in === true,
  );
  if (user.email) await claimGuestOrders(admin, user.id, user.email);
  if (created && user.email) {
    const meta = user.user_metadata as { full_name?: string; name?: string };
    const name = meta.full_name || meta.name || user.email.split("@")[0] || "";
    const settings = await getHelloSettings();
    const products = await getHelloProducts(settings.productSlugs);
    await sendMailboxMail("hello", {
      to: user.email, subject: settings.subject,
      ...buildHelloEmail({ name, heading: settings.heading, bodyHtml: settings.bodyHtml, products, origin }),
    });
  }
}
