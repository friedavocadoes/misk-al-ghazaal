import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { logAdmin } from "@/lib/audit";
import { getPromoSubscribers } from "@/lib/email-settings";
import { mailboxAddress } from "@/lib/mailer";

async function createCampaign() {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_campaigns")
    .insert({
      subject: "New offer from the Maison",
      preheader: "Private offers, new arrivals and rituals.",
      body_html: "<p>Your private offer is here.</p>",
      status: "draft",
      created_by: s.userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create a campaign.");
  await logAdmin(supabase, s, {
    category: "promo",
    action: "create",
    entity: "promo_campaign",
    entityId: (data as { id: string } | null)?.id ?? "",
    label: "draft",
    summary: "Created promo draft",
    details: {},
  });
  revalidatePath("/admin/promo");
  redirect(`/admin/promo/${(data as { id: string }).id}`);
}

export default async function PromoListPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const [{ data: campaigns }, subs] = await Promise.all([
    supabase
      .from("promo_campaigns")
      .select("id, subject, status, recipient_count, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    getPromoSubscribers().catch(() => []),
  ]);
  const rows = (campaigns as {
    id: string;
    subject: string;
    status: string;
    recipient_count: number;
    sent_at: string | null;
    created_at: string;
  }[] | null) ?? [];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">        <p className="eyebrow">Growth / Promo</p>
        <h1 className="font-display text-3xl">Promo mail</h1>
        <p className="mt-1 text-sm text-ink/60">
          Sent from <span className="font-mono" dir="ltr">{mailboxAddress("promo")}</span> to{" "}
          <strong>{subs.length} opted-in shoppers</strong>. Only accounts with the promo checkbox on
          receive these.
        </p>

        {/* No inputs here — a plain form + ActionButton (SaveButton
            stays disabled until dirty, which an input-less form never is). */}
        <AdminForm action={createCampaign} className="mt-6">
          <ActionButton>+ New campaign</ActionButton>
        </AdminForm>

        <h2 className="mt-8 font-display text-xl">Campaigns</h2>
        <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 bg-white text-sm">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <Link href={`/admin/promo/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                {c.subject || "(untitled)"}
              </Link>
              <span className="text-xs uppercase tracking-[0.16em] text-ink/50">{c.status}</span>
              {c.status === "sent" && (
                <span className="text-xs text-ink/50">
                  → {c.recipient_count} · {c.sent_at ? new Date(c.sent_at).toLocaleString() : ""}
                </span>
              )}
              <span className="ms-auto">
                <Link href={`/admin/promo/${c.id}`} className="text-xs uppercase tracking-[0.16em] underline">
                  Open
                </Link>
              </span>
            </li>
          ))}
          {!rows.length && <li className="p-4 text-ink/50">No campaigns yet.</li>}
        </ul>

        <h2 className="mt-10 font-display text-xl">
          Subscribers <span className="text-base text-ink/50">({subs.length})</span>
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          Login + register carry the promo checkbox (on by default). Unchecked accounts stay out.
        </p>
        <ul className="mt-4 max-h-96 divide-y divide-ink/10 overflow-auto border border-ink/10 bg-white font-mono text-[13px]">
          {subs.map((u) => (
            <li key={u.id} className="flex justify-between gap-3 p-2.5" dir="ltr">
              <span>{u.email}</span>
              <span className="text-ink/40">{new Date(u.created_at).toLocaleDateString()}</span>
            </li>
          ))}
          {!subs.length && <li className="p-4 font-sans text-sm text-ink/50">Nobody opted in yet.</li>}
        </ul>
      </div>
    </>
  );
}
