import { LEAD_LABELS } from "@/lib/lead-csv";
import { assertAdminWrite } from "@/lib/admin-write";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import {
  AdminForm,
  SaveButton,
  ActionButton,
} from "@/components/admin/admin-form";
import { PromoEditor } from "@/components/admin/promo-editor";
import { logAdmin } from "@/lib/audit";
import { getPromoSubscribers } from "@/lib/email-settings";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { processEmailCampaignQueue } from "@/lib/email-campaigns";
import { systemEmailAllowed } from "@/lib/notification-settings";

async function saveCampaign(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await assertAdminWrite(
    supabase
      .from("promo_campaigns")
      .update({
        audience_source: ["all", ...Object.keys(LEAD_LABELS)].includes(
          String(formData.get("audience_source")),
        )
          ? String(formData.get("audience_source"))
          : "account",
        subject: String(formData.get("subject") ?? "").trim(),
        preheader: String(formData.get("preheader") ?? "").trim(),
        body_html: String(formData.get("body_html") ?? ""),
      })
      .eq("id", id)
      .eq("status", "draft")
      .is("queued_at", null)
      .select("id")
      .single(),
  );
  await logAdmin(supabase, s, {
    category: "promo",
    action: "update",
    entity: "promo_campaign",
    entityId: id,
    label: String(formData.get("subject") ?? "").slice(0, 60),
    summary: "Saved promo draft",
    details: { id },
  });
  revalidatePath(`/admin/promo/${id}`);
}

async function sendCampaign(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  if (!(await systemEmailAllowed("promotions")))
    throw Error(
      "Promotional email is disabled. Enable Admin → Setup → Notifications first.",
    );
  const db = createAdminClient();
  const { data, error } = await db.rpc("queue_email_campaign", {
    p_actor: s.userId,
    p_id: id,
  });
  if (error) throw Error(error.message);
  await logAdmin(db, s, {
    category: "promo",
    action: "send",
    entity: "promo_campaign",
    entityId: id,
    summary: `Queued campaign for ${data} subscribed contacts`,
    details: { recipients: data },
  });
  after(async () => {
    try {
      await processEmailCampaignQueue();
    } catch {
      /* The persistent queue remains available to the scheduled worker. */
    }
  });
  revalidatePath(`/admin/promo/${id}`);
  revalidatePath("/admin/promo");
}

async function deleteCampaign(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await assertAdminWrite(
    supabase.from("promo_campaigns").delete().eq("id", id),
  );
  await logAdmin(supabase, s, {
    category: "promo",
    action: "delete",
    entity: "promo_campaign",
    entityId: id,
    label: id,
    summary: "Deleted promo campaign",
    details: { id },
  });
  revalidatePath("/admin/promo");
  redirect("/admin/promo");
}

export default async function PromoDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("promo_campaigns")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) redirect("/admin/promo");
  const c = data as {
    queued_at?: string;
    audience_source?: string;
    subject: string;
    preheader: string;
    body_html: string;
    status: string;
    recipient_count: number;
    sent_at: string | null;
  };
  const subs = await getPromoSubscribers(c.audience_source ?? "account").catch(
    () => [],
  );
  const isSent = c.status === "sent",
    isQueued = !!c.queued_at && !isSent;
  const { data: progressData } = await createAdminClient().rpc(
    "email_campaign_progress",
    { p_id: id },
  );
  const progress = (progressData ?? {}) as Record<string, number>;

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <p className="eyebrow">
          <Link href="/admin/promo" className="underline">
            Promo
          </Link>{" "}
          / {c.subject || "(untitled)"}
        </p>
        <h1 className="font-display text-3xl">Campaign</h1>
        <p className="mt-1 text-sm text-ink/60">
          Status{" "}
          <strong>
            {isQueued ? "Queued" : isSent ? "Completed" : "Draft"}
          </strong>
          {isSent && c.sent_at
            ? ` · sent to ${c.recipient_count} on ${new Date(c.sent_at).toLocaleString()}`
            : ` · ${subs.length} opted-in recipients waiting`}
        </p>

        <AdminForm
          action={saveCampaign}
          success="Draft saved"
          className="mt-8 border border-ink/10 bg-white p-6 text-sm"
        >
          <input type="hidden" name="id" value={id} />
          <label className="mb-5 grid gap-2 text-sm">
            Audience
            <select
              name="audience_source"
              defaultValue={c.audience_source ?? "account"}
              className="border border-ink/20 bg-white p-3"
            >
              <option value="all">All marketing subscribers</option>
              {Object.entries(LEAD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label} only
                </option>
              ))}
            </select>
            <span className="text-xs text-fog">
              Save the draft after changing audience. Sources can overlap; each
              email receives one message.
            </span>
          </label>
          <PromoEditor
            initialSubject={c.subject ?? ""}
            initialPreheader={c.preheader ?? ""}
            initialHtml={c.body_html ?? ""}
          />
          {!isSent && !isQueued && (
            <SaveButton className="mt-4">Save draft</SaveButton>
          )}
        </AdminForm>

        {!isSent && !isQueued ? (
          <AdminForm
            action={sendCampaign}
            success="Campaign queued"
            className="mt-4 border border-gold/40 bg-gold-wash/40 p-6 text-sm"
          >
            <input type="hidden" name="id" value={id} />
            <p>
              Sends from{" "}
              <span className="font-mono" dir="ltr">
                promo@miskalghazaalperfumes.com
              </span>{" "}
              to <strong>{subs.length}</strong> opted-in shoppers. This cannot
              be undone.
            </p>
            <ActionButton className="mt-3">
              Queue for {subs.length} subscribers
            </ActionButton>
          </AdminForm>
        ) : (
          <p className="mt-4 border border-ink/10 bg-white p-4 text-sm text-ink/60">
            {isQueued
              ? "Delivery is in progress. Refresh for updated counts; the scheduled worker continues without this page staying open."
              : "Dispatch completed. Review delivery outcomes below before attempting another send."}
          </p>
        )}

        {!!Object.keys(progress).length && (
          <section className="mt-5 border border-ink/10 bg-white p-5">
            <h2 className="text-lg">Delivery progress</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.entries(progress).map(([state, count]) => (
                <span
                  key={state}
                  className="border border-ink/10 px-3 py-2 text-xs"
                >
                  {state}: {count}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-6 text-fog">
              Opt-outs are rechecked before each send. Unknown means SMTP
              delivery was ambiguous; it is not automatically retried. Deleting
              a queued campaign cancels pending deliveries; messages already in
              flight cannot be recalled.
            </p>
          </section>
        )}
        <AdminForm action={deleteCampaign} success="Deleted" className="mt-4">
          <input type="hidden" name="id" value={id} />
          <ActionButton danger>Delete campaign</ActionButton>
        </AdminForm>
      </div>
    </>
  );
}
