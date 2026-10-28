import { WhatsAppCampaignFields } from "@/components/admin/WhatsAppCampaignFields";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { logAdmin } from "@/lib/audit";
import { processWhatsAppQueue, whatsappConfigured } from "@/lib/whatsapp";
import { templateParameters, whatsappTemplate } from "@/lib/whatsapp-shared";
import { uuid } from "@/lib/analytics/shared";
export const maxDuration = 60;

async function staff() {
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  return s;
}
async function createCampaign(form: FormData) {
  "use server";
  const s = await staff(),
    db = createAdminClient();
  const name = String(form.get("name") ?? "")
      .trim()
      .slice(0, 150),
    template = String(form.get("template") ?? "").trim(),
    language = String(form.get("language") ?? "en").trim();
  if (!name) throw Error("Name the campaign.");
  const parameters = templateParameters(form.getAll("parameter"));
  whatsappTemplate(template, language, parameters);
  const { data, error } = await db
    .from("whatsapp_campaigns")
    .insert({ name, template, language, parameters, created_by: s.userId })
    .select("id")
    .single();
  if (error)
    throw Error("Could not create campaign. Apply migration_whatsapp.sql.");
  await logAdmin(db, s, {
    category: "promo",
    action: "create",
    entity: "whatsapp_campaign",
    entityId: data.id,
    summary: `Created WhatsApp draft: ${name}`,
  });
  revalidatePath("/admin/whatsapp");
}
async function queueCampaign(form: FormData) {
  "use server";
  const s = await staff(),
    id = String(form.get("id") ?? "");
  if (!whatsappConfigured())
    throw Error("Configure and enable WhatsApp before sending.");
  if (!uuid(id) || form.get("confirm") !== "on")
    throw Error(
      "Confirm the approved marketing template and potential Meta charges.",
    );
  const db = createAdminClient(),
    { data, error } = await db.rpc("whatsapp_queue_campaign", {
      p_actor: s.userId,
      p_id: id,
    });
  if (error) throw Error(error.message);
  await logAdmin(db, s, {
    category: "promo",
    action: "send",
    entity: "whatsapp_campaign",
    entityId: id,
    summary: `Queued WhatsApp campaign for ${data} subscribed numbers`,
    details: { recipients: data },
  });
  after(async () => {
    try {
      await processWhatsAppQueue();
    } catch {
      /* Durable pending jobs remain for the scheduled worker. */
    }
  });
  revalidatePath("/admin/whatsapp");
}
async function processQueue() {
  "use server";
  await staff();
  if (!whatsappConfigured())
    throw Error("WhatsApp is disabled or credentials are incomplete.");
  await processWhatsAppQueue();
  revalidatePath("/admin/whatsapp");
}

export default async function WhatsAppPage() {
  const s = await staff(),
    db = createAdminClient();
  const [
    { data: campaigns, error },
    { data: messages },
    { count: subscribers },
    { count: pending },
  ] = await Promise.all([
    db
      .from("whatsapp_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("whatsapp_messages")
      .select("id,order_id,campaign_id,phone,state,error_code,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("whatsapp_contacts")
      .select("phone", { count: "exact", head: true })
      .eq("marketing_opt_in", true)
      .is("stopped_at", null),
    db
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("state", "pending"),
  ]);
  return (
    <>
      <AdminNav email={s.email} role={s.role} />
      <main className="admin-workspace admin-legacy">
        <p className="eyebrow text-gold">Customer conversations</p>
        <h1 className="mt-2 text-3xl font-light">WhatsApp</h1>
        <p className="mt-3 text-sm text-fog">
          {whatsappConfigured()
            ? "Sending enabled"
            : "Sending disabled · finish environment setup"}{" "}
          · {subscribers ?? 0} marketing subscribers · {pending ?? 0} pending
          messages
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 border border-red-200 bg-red-50 p-4 text-red-800"
          >
            Apply migration_whatsapp.sql to enable this workspace.
          </p>
        )}
        <section className="mt-6 border border-ink/10 bg-white p-6">
          <h2 className="text-lg">Order updates & delivery</h2>
          <p className="mt-2 text-sm leading-7 text-fog">
            Customers receive nothing at placement. Confirmation and later status or tracking changes have separate email and WhatsApp checkboxes. Email
            continues independently. Meta acceptance is not proof of delivery;
            signed webhooks update the status below. Schedule the protected
            worker every minute; each run sends up to five messages.
          </p>
          <AdminForm
            action={processQueue}
            success="Queue batch processed"
            className="mt-4"
          >
            <ActionButton>Process next batch</ActionButton>
          </AdminForm>
        </section>
        <AdminForm
          action={createCampaign}
          resetOnSuccess
          success="WhatsApp draft created"
          className="mt-6 grid gap-4 border border-ink/10 bg-white p-6"
        >
          <h2 className="text-lg">New WhatsApp promotion</h2>
          <p className="text-sm leading-6 text-fog">
            First create and approve a Marketing template in WhatsApp Manager.
            Enter its exact name, language and body parameters here. Only
            WhatsApp subscribers are included; email consent does not count.
            These templates support text bodies; use a template without header
            or button variables.
          </p>
          <label className="grid gap-2 text-sm">
            Campaign name
            <input
              name="name"
              required
              maxLength={150}
              className="border border-ink/20 p-3"
            />
          </label>
          <WhatsAppCampaignFields />
          <ActionButton>Create draft</ActionButton>
        </AdminForm>
        <section className="mt-6 grid gap-4">
          <h2 className="text-xl">Campaigns</h2>
          {!campaigns?.length && (
            <p className="text-sm text-fog">Your first campaign begins here.</p>
          )}
          {campaigns?.map((c) => (
            <article key={c.id} className="border border-ink/10 bg-white p-5">
              <h3>{c.name}</h3>
              <p className="mt-1 text-xs text-fog">
                {c.template} · {c.language} ·{" "}
                {c.queued_at ? "Queued (will not send twice)" : "Draft"}
              </p>
              <p className="mt-3 break-words text-sm">
                {c.parameters.join(" · ") || "No variable body parameters"}
              </p>
              {!c.queued_at && (
                <AdminForm
                  action={queueCampaign}
                  success="Campaign queued"
                  className="mt-4 grid gap-3"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <label className="flex items-start gap-2 text-xs leading-5">
                    <input required type="checkbox" name="confirm" />I confirm
                    this is an approved Marketing template. Queue it for current
                    WhatsApp subscribers; Meta charges may apply.
                  </label>
                  <ActionButton>Queue promotion</ActionButton>
                </AdminForm>
              )}
            </article>
          ))}
        </section>
        <section className="mt-8">
          <h2 className="text-xl">Latest 50 messages</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm [&_th]:px-3 [&_th]:py-3 [&_td]:px-3 [&_td]:py-3">
              <thead>
                <tr>
                  <th className="p-3">Recipient</th>
                  <th>Order / campaign</th>
                  <th>Status</th>
                  <th>Meta code</th>
                </tr>
              </thead>
              <tbody>
                {messages?.map((m) => (
                  <tr key={m.id} className="border-t border-ink/10">
                    <td className="p-3">
                      +{m.phone.slice(0, 3)} •••• {m.phone.slice(-4)}
                    </td>
                    <td>
                      {m.order_id ? (
                        <Link
                          href={`/admin/orders/${m.order_id}`}
                          className="underline"
                        >
                          Open order
                        </Link>
                      ) : (
                        "Promotion"
                      )}
                    </td>
                    <td
                      className={
                        m.state === "failed" || m.state === "unknown"
                          ? "text-red-800"
                          : ""
                      }
                    >
                      {m.state}
                    </td>
                    <td>{m.error_code ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-6 text-fog">
            Unknown means the request may have reached Meta. It is deliberately
            not retried automatically to avoid duplicate messages. A later
            webhook can resolve it. Error 131026 means undeliverable; it does
            not conclusively mean the number has no WhatsApp account. Refresh
            this page for the latest delivery state.
          </p>
        </section>
      </main>
    </>
  );
}
