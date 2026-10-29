import "server-only";
import { createAdminClient } from "./supabase/service";
import { sendMailboxMail, smtpConnectionSettings } from "./mailer";
import { systemEmailAllowed } from "./notification-settings";
export async function processEmailCampaignQueue() {
  if (
    !smtpConnectionSettings().host ||
    !(process.env.PROMO_SMTP_USER || process.env.SMTP_USER) ||
    !(process.env.PROMO_SMTP_PASS || process.env.SMTP_PASS) ||
    !(await systemEmailAllowed("promotions"))
  )
    return { processed: 0, disabled: true };
  const db = createAdminClient(),
    { data: jobs, error } = await db.rpc("claim_email_deliveries");
  if (error)
    throw Error(
      "Email queue unavailable. Apply migration_leads_preferences.sql.",
    );
  await Promise.all(
    (jobs ?? []).map(
      async (job: { id: string; campaign_id: string; lead_id: string }) => {
        let state = "unknown";
        try {
          const [{ data: lead, error: le }, { data: c, error: ce }] =
            await Promise.all([
              db
                .from("customer_leads")
                .select("email,marketing_email,unsubscribed_at")
                .eq("id", job.lead_id)
                .maybeSingle(),
              db
                .from("promo_campaigns")
                .select("subject,preheader,body_html,queued_at")
                .eq("id", job.campaign_id)
                .maybeSingle(),
            ]);
          if (le || ce) state = "pending";
          else if (
            !lead?.marketing_email ||
            lead.unsubscribed_at ||
            !c?.queued_at
          )
            state = "skipped";
          else {
            const sent = await sendMailboxMail("promo", {
              to: lead.email,
              subject: c.subject,
              title: c.subject,
              preheader: c.preheader ?? "",
              bodyHtml: c.body_html ?? "",
            });
            state = sent.sent
              ? "sent"
              : sent.disabled
                ? (await systemEmailAllowed("promotions"))
                  ? "skipped"
                  : "pending"
                : "unknown";
          }
        } catch {
          /* An SMTP timeout can be ambiguous; never blindly resend. */
        }
        const { error } = await db
          .from("promo_deliveries")
          .update({ state, updated_at: new Date().toISOString() })
          .eq("id", job.id)
          .eq("state", "sending");
        if (error) throw Error("Could not record campaign delivery.");
      },
    ),
  );
  for (const id of new Set<string>(
    (jobs ?? []).map((j: { campaign_id: string }) => j.campaign_id),
  )) {
    const { error } = await db.rpc("finish_email_campaign", { p_id: id });
    if (error) throw Error("Could not update campaign progress.");
  }
  return { processed: jobs?.length ?? 0, disabled: false };
}
