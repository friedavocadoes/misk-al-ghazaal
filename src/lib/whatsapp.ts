import { trackingLink } from "./order-tracking";
import "server-only";
import { createAdminClient } from "./supabase/service";
import { getOrderAccessPath } from "./order-access";
import { getSiteUrl } from "./site-url";
import { statusLabel } from "./order-status";
import { templateParameters, whatsappTemplate } from "./whatsapp-shared";

export function whatsappConfigured() {
  return (
    process.env.WHATSAPP_ENABLED === "1" &&
    Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      /^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID ?? "") &&
      /^v\d+\.\d+$/.test(process.env.WHATSAPP_API_VERSION ?? "") &&
      process.env.WHATSAPP_ORDER_TEMPLATE,
    )
  );
}

export async function queueWhatsAppOrder(id: string) {
  const { error } = await createAdminClient().rpc("whatsapp_queue_order", {
    p_id: id,
  });
  if (error)
    throw Error("WhatsApp queue unavailable. Apply migration_whatsapp.sql.");
}

/** Durable queue; no customer data or provider errors are printed to logs. */
export async function processWhatsAppQueue() {
  if (!whatsappConfigured()) return { processed: 0, disabled: true };
  const db = createAdminClient();
  const { data: jobs, error } = await db.rpc("whatsapp_claim", { p_limit: 5 });
  if (error)
    throw Error("WhatsApp queue unavailable. Apply migration_whatsapp.sql.");
  for (const job of jobs ?? []) {
    const settle = async (state: string, code: string | null = null) => {
      const { error } = await db
        .from("whatsapp_messages")
        .update({
          state,
          error_code: code,
          updated_at: new Date().toISOString(),
          ...(state === "pending"
            ? {
                available_at: new Date(
                  Date.now() + 60_000 * 2 ** job.attempts,
                ).toISOString(),
              }
            : {}),
        })
        .eq("id", job.id)
        .eq("state", "sending");
      if (error) throw Error("Could not record WhatsApp attempt.");
    };
    let attempted = false;
    try {
      const { data: contact, error: contactError } = await db
        .from("whatsapp_contacts")
        .select("orders_opt_in,marketing_opt_in,stopped_at")
        .eq("phone", job.phone)
        .maybeSingle();
      if (contactError) throw Error("Consent unavailable");
      if (
        !contact ||
        contact.stopped_at ||
        !(job.kind === "order"
          ? contact.orders_opt_in
          : contact.marketing_opt_in)
      ) {
        await settle("skipped", "opted_out");
        continue;
      }
      let template;
      if (job.kind === "order") {
        const { data: o, error: orderError } = await db
          .from("orders")
          .select(
            "id,order_no,customer_name,status,total,deleted_at,whatsapp_opt_in,whatsapp_revision,tracking_no,tracking_url",
          )
          .eq("id", job.order_id)
          .maybeSingle();
        if (orderError) throw Error("Order unavailable");
        if (
          !o ||
          o.status === "new" ||
          o.deleted_at ||
          !o.whatsapp_opt_in ||
          o.whatsapp_revision !== job.revision
        ) {
          await settle("skipped", "order_changed_or_removed");
          continue;
        }
        const path = await getOrderAccessPath(db, o.id);
        if (!path) throw Error("Order link unavailable");
        const origin = getSiteUrl();
        if (!/^https?:\/\//.test(origin))
          throw Error("Set the public site URL");
        if (
          !origin.startsWith("https://") &&
          process.env.NODE_ENV === "production"
        )
          throw Error("Set production site URL");
        const name = String(o.customer_name).slice(0, 80),
          ref = String(o.order_no),
          orderUrl = `${origin}${path}`;
        const hasTracking =
          !!o.tracking_no?.trim() &&
          !["cancelled", "returned"].includes(o.status);
        const templateName = hasTracking
          ? process.env.WHATSAPP_TRACKING_TEMPLATE
          : o.status === "confirmed"
            ? process.env.WHATSAPP_CONFIRMATION_TEMPLATE
            : process.env.WHATSAPP_ORDER_TEMPLATE;
        if (!templateName)
          throw Error("Configure the approved order template for this update");
        const values = hasTracking
          ? [
              name,
              ref,
              statusLabel(o.status),
              o.tracking_no.trim(),
              trackingLink(o.tracking_url, o.tracking_no),
              orderUrl,
            ]
          : o.status === "confirmed"
            ? [name, ref, orderUrl]
            : [name, ref, statusLabel(o.status), orderUrl];
        template = whatsappTemplate(
          templateName,
          process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en",
          templateParameters(values),
        );
      } else {
        const { data: c, error: campaignError } = await db
          .from("whatsapp_campaigns")
          .select("template,language,parameters,queued_at")
          .eq("id", job.campaign_id)
          .maybeSingle();
        if (campaignError) throw Error("Campaign unavailable");
        if (!c?.queued_at) {
          await settle("skipped", "campaign_removed");
          continue;
        }
        template = whatsappTemplate(
          c.template,
          c.language,
          templateParameters(c.parameters),
        );
      }
      attempted = true;
      const res = await fetch(
        `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: job.phone,
            type: "template",
            template,
            biz_opaque_callback_data: job.id,
          }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        },
      );
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.messages?.[0]?.id) {
        const { error } = await db.rpc("whatsapp_receipt_status", {
          p_id: job.id,
          p_provider: result.messages[0].id,
          p_state: "accepted",
          p_error: null,
        });
        if (error) throw Error("Receipt unavailable");
      } else if (res.status === 429 && job.attempts < 4)
        await settle("pending", String(result.error?.code ?? "rate_limit"));
      else
        await settle(
          res.status >= 500 || res.ok ? "unknown" : "failed",
          String(result.error?.code ?? res.status),
        );
    } catch {
      await settle(
        attempted ? "unknown" : job.attempts < 4 ? "pending" : "failed",
        attempted ? "ambiguous_attempt" : "preparation_failed",
      );
    }
  }
  return { processed: jobs?.length ?? 0, disabled: false };
}
