import { assertAdminWrite } from "@/lib/admin-write";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { PromoEditor } from "@/components/admin/promo-editor";
import { logAdmin } from "@/lib/audit";
import { getPromoSubscribers } from "@/lib/email-settings";
import { sendMailboxMail } from "@/lib/mailer";

async function saveCampaign(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await assertAdminWrite(supabase
    .from("promo_campaigns")
    .update({
      subject: String(formData.get("subject") ?? "").trim(),
      preheader: String(formData.get("preheader") ?? "").trim(),
      body_html: String(formData.get("body_html") ?? ""),
    })
    .eq("id", id));
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("promo_campaigns")
    .select("subject, preheader, body_html, status")
    .eq("id", id)
    .single();
  const c = data as {
    subject?: string;
    preheader?: string;
    body_html?: string;
    status?: string;
  } | null;
  if (!c) return;
  const subs = await getPromoSubscribers().catch(() => []);
  let sent = 0;
  for (const u of subs) {
    const r = await sendMailboxMail("promo", {
      to: u.email,
      subject: c.subject || "News from the Maison",
      title: c.subject || "News from the Maison",
      preheader: c.preheader || "",
      bodyHtml: c.body_html || "",
    });
    if (r.sent) sent++;
    // Gentle pacing for shared cPanel limits.
    await new Promise((res) => setTimeout(res, 120));
  }
  await assertAdminWrite(supabase
    .from("promo_campaigns")
    .update({ status: "sent", recipient_count: sent, sent_at: new Date().toISOString() })
    .eq("id", id));
  await logAdmin(supabase, s, {
    category: "promo",
    action: "send",
    entity: "promo_campaign",
    entityId: id,
    label: (c.subject ?? "").slice(0, 60),
    summary: `Sent promo to ${sent}/${subs.length} subscribers`,
    details: { sent, total: subs.length },
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
  await assertAdminWrite(supabase.from("promo_campaigns").delete().eq("id", id));
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
  const [{ data }, subs] = await Promise.all([
    supabase.from("promo_campaigns").select("*").eq("id", id).single(),
    getPromoSubscribers().catch(() => []),
  ]);
  if (!data) redirect("/admin/promo");
  const c = data as {
    subject: string;
    preheader: string;
    body_html: string;
    status: string;
    recipient_count: number;
    sent_at: string | null;
  };
  const isSent = c.status === "sent";

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <p className="eyebrow">
          <Link href="/admin/promo" className="underline">Promo</Link> /{" "}
          {c.subject || "(untitled)"}
        </p>
        <h1 className="font-display text-3xl">Campaign</h1>
        <p className="mt-1 text-sm text-ink/60">
          Status <strong>{c.status}</strong>
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
          <PromoEditor
            initialSubject={c.subject ?? ""}
            initialPreheader={c.preheader ?? ""}
            initialHtml={c.body_html ?? ""}
          />
          {!isSent && <SaveButton className="mt-4">Save draft</SaveButton>}
        </AdminForm>

        {!isSent ? (
          <AdminForm
            action={sendCampaign}
            success="Promo sent"
            className="mt-4 border border-gold/40 bg-gold-wash/40 p-6 text-sm"
          >
            <input type="hidden" name="id" value={id} />
            <p>
              Sends from <span className="font-mono" dir="ltr">promo@miskalghazaalperfumes.com</span>{" "}
              to <strong>{subs.length}</strong> opted-in shoppers. This cannot be undone.
            </p>
            <ActionButton className="mt-3">Send to {subs.length} subscribers</ActionButton>
          </AdminForm>
        ) : (
          <p className="mt-4 border border-ink/10 bg-white p-4 text-sm text-ink/60">
            Already sent — create a new campaign for the next mail.
          </p>
        )}

        <AdminForm action={deleteCampaign} success="Deleted" className="mt-4">
          <input type="hidden" name="id" value={id} />
          <ActionButton danger>Delete campaign</ActionButton>
        </AdminForm>
      </div>
    </>
  );
}
