import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { LEAD_LABELS, parseLeadCSV } from "@/lib/lead-csv";
import { logAdmin } from "@/lib/audit";
async function importCSV(form: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const file = form.get("csv");
  if (
    !(file instanceof File) ||
    file.size > 2_000_000 ||
    !file.name.toLowerCase().endsWith(".csv")
  )
    throw Error("Choose a CSV file under 2MB.");
  const rows = parseLeadCSV(await file.text());
  if (rows.some((r) => r.consent) && form.get("consent_confirmed") !== "on")
    throw Error(
      "Confirm permission for contacts marked marketing_consent=yes.",
    );
  const db = createAdminClient(),
    { error } = await db.rpc("import_customer_leads", {
      p_actor: s.userId,
      p_rows: rows,
    });
  if (error) throw Error(error.message);
  await logAdmin(db, s, {
    category: "promo",
    action: "import",
    entity: "customer_leads",
    summary: `Imported ${rows.length} CSV lead rows`,
    details: { rows: rows.length },
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/promo");
}
async function setConsent(form: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const token = String(form.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) throw Error("Invalid lead");
  const db = createAdminClient(),
    { error } = await db.rpc("unsubscribe_lead_email", { p_token: token });
  if (error) throw Error("Could not opt this lead out.");
  await logAdmin(db, s, {
    category: "promo",
    action: "unsubscribe",
    entity: "customer_lead",
    entityId: String(form.get("id") ?? ""),
    summary: "Opted a lead out of marketing email",
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/promo");
}
export default async function Leads({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const p = await searchParams,
    source = Object.keys(LEAD_LABELS).includes(p.source ?? "") ? p.source! : "",
    q = (p.q ?? "").trim().slice(0, 100),
    page = Math.max(1, Math.floor(Number(p.page) || 1));
  let query = createAdminClient()
    .from("admin_lead_channels")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (source) query = query.contains("sources", [source]);
  if (q)
    query = query.ilike(
      "email",
      `%${q.replaceAll("%", "").replaceAll("_", "")}%`,
    );
  if (p.consent === "yes")
    query = query.eq("marketing_email", true).is("unsubscribed_at", null);
  if (p.consent === "no") query = query.eq("marketing_email", false);
  const {
    data: rows,
    count,
    error,
  } = await query.range((page - 1) * 50, page * 50 - 1);
  const params = new URLSearchParams({
    ...(source ? { source } : {}),
    ...(q ? { q } : {}),
    ...(p.consent ? { consent: p.consent } : {}),
  });
  return (
    <>
      <AdminNav email={s.email} role={s.role} />
      <main className="admin-workspace admin-legacy">
        <p className="eyebrow text-gold">Growth</p>
        <h1 className="mt-2 text-3xl font-light">Customers & leads</h1>
        <p className="mt-3 text-sm leading-7 text-fog">
          One record per email, with every source retained. Guest purchases
          collect contact details; marketing requires permission. A later import
          never reverses an unsubscribe.
        </p>
        <Link
          href="/admin/promo"
          className="mt-3 inline-block text-sm underline"
        >
          Create an email campaign ↗
        </Link>
        {error && (
          <p role="alert" className="mt-4 bg-red-50 p-4 text-red-800">
            Apply migration_leads_preferences.sql.
          </p>
        )}
        <form className="my-6 flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email"
            aria-label="Search lead email"
            className="border border-ink/20 bg-white p-3 text-sm"
          />
          <select
            name="source"
            defaultValue={source}
            aria-label="Lead source"
            className="border border-ink/20 bg-white p-3 text-sm"
          >
            <option value="">All sources</option>
            {Object.entries(LEAD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="consent"
            defaultValue={p.consent ?? ""}
            aria-label="Email permission"
            className="border border-ink/20 bg-white p-3 text-sm"
          >
            <option value="">All preferences</option>
            <option value="yes">Marketing subscribed</option>
            <option value="no">Marketing off</option>
          </select>
          <button className="bg-ink px-5 py-3 text-sm text-white">
            Filter
          </button>
        </form>
        <p className="text-xs text-fog">
          {count ?? 0} matching leads · 50 per page
        </p>
        <div className="mt-4 overflow-x-auto border border-ink/10 bg-white">
          <table className="w-full min-w-[850px] text-left text-xs [&_td]:p-4 [&_th]:p-4">
            <thead>
              <tr>
                {[
                  "Contact",
                  "Sources",
                  "Location / phone",
                  "Preferences",
                  "Action",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows?.map((l) => (
                <tr key={l.id} className="border-t border-ink/10">
                  <td>
                    <p>{l.name || "—"}</p>
                    <p className="mt-1 text-fog">{l.email}</p>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {l.sources.map((v: string) => (
                        <span
                          key={v}
                          className="border border-ink/10 bg-sand/50 px-2 py-1"
                        >
                          {LEAD_LABELS[v] ?? v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {l.location || "—"}
                    <p className="mt-1">{l.phone || "—"}</p>
                  </td>
                  <td>
                    {l.marketing_email && !l.unsubscribed_at
                      ? "Email marketing on"
                      : "Email marketing off"}
                    <p className="mt-1 text-fog">Order email: essential</p>
                    <p className="mt-1 text-fog">
                      WhatsApp orders: {l.wa_orders ? "on" : "off"}
                    </p>
                    <p className="mt-1 text-fog">
                      WhatsApp offers: {l.wa_promotions ? "on" : "off"}
                    </p>
                    <Link
                      href={`/preferences/${l.preference_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block underline"
                    >
                      View communication preferences ↗
                    </Link>
                  </td>
                  <td>
                    {l.marketing_email && (
                      <AdminForm
                        action={setConsent}
                        success="Marketing email disabled"
                      >
                        <input type="hidden" name="id" value={l.id} />
                        <input
                          type="hidden"
                          name="token"
                          value={l.preference_token}
                        />
                        <ActionButton>Opt out</ActionButton>
                      </AdminForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="my-5 flex gap-5 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/leads?${params}&page=${page - 1}`}
              className="underline"
            >
              Previous
            </Link>
          )}
          {page * 50 < (count ?? 0) && (
            <Link
              href={`/admin/leads?${params}&page=${page + 1}`}
              className="underline"
            >
              Next
            </Link>
          )}
        </div>
        <section className="mt-8 border border-ink/10 bg-white p-6">
          <h2 className="text-xl">Import your contacts</h2>
          <p className="mt-3 text-sm leading-6 text-fog">
            Download the template, fill email, name, location and phone, then
            upload. Set marketing_consent to yes only when you have permission.
            Blank/no imports the contact without subscribing them. Up to 1,000
            rows per file; duplicate emails merge.
          </p>
          <Link
            prefetch={false}
            download="misk-leads-template.csv"
            href="/api/admin/leads/template"
            className="mt-4 inline-block text-sm underline"
          >
            Download CSV template
          </Link>
          <AdminForm
            action={importCSV}
            success="Leads imported"
            resetOnSuccess
            className="mt-5 grid gap-4"
          >
            <input type="file" name="csv" accept=".csv,text/csv" required />
            <label className="flex gap-3 text-xs leading-6">
              <input name="consent_confirmed" type="checkbox" />I have
              permission to send marketing to contacts marked yes.
            </label>
            <ActionButton>Import leads</ActionButton>
          </AdminForm>
        </section>
      </main>
    </>
  );
}
