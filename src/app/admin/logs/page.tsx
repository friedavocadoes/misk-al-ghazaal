import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AUDIT_CATEGORIES } from "@/lib/audit";
import { Search } from "lucide-react";

const PAGE_SIZE = 200;

const CATEGORY_STYLES: Record<string, string> = {
  products: "border-gold/50 bg-gold-wash/60 text-gold",
  orders: "border-ink/20 bg-cream text-ink",
  users: "border-[#9c2b2e]/40 bg-[#9c2b2e]/[0.06] text-[#9c2b2e]",
  auth: "border-[#1e7a46]/40 bg-[#1e7a46]/[0.07] text-[#1e7a46]",
};

function pill(text: string) {
  return (
    <span
      className={`shrink-0 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${CATEGORY_STYLES[text] ?? "border-ink/15 text-ink/60"}`}
    >
      {text}
    </span>
  );
}

export default async function AuditLogPage(props: {
  searchParams: Promise<{ q?: string; category?: string; from?: string; to?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const sp = await props.searchParams;
  const query = (sp.q ?? "").trim().replace(/[%_,]/g, "");
  const category = sp.category ?? "";
  const from = sp.from ?? "";
  const to = sp.to ?? "";

  const supabase = await createClient();
  let req = supabase
    .from("admin_audit_log")
    .select("id, created_at, user_email, user_role, category, action, entity_label, summary")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (query) {
    req = req.or(
      `user_email.ilike.%${query}%,entity_label.ilike.%${query}%,summary.ilike.%${query}%`,
    );
  }
  if (category && (AUDIT_CATEGORIES as readonly string[]).includes(category)) {
    req = req.eq("category", category);
  }
  if (from) req = req.gte("created_at", `${from}T00:00:00`);
  if (to) req = req.lte("created_at", `${to}T23:59:59`);
  const { data } = await req;
  const rows = (data as {
    id: string; created_at: string; user_email: string; user_role: string;
    category: string; action: string; entity_label: string; summary: string;
  }[] | null) ?? [];

  const inputCls = "border border-ink/20 bg-white px-3 py-2 text-sm";
  const hasFilter = query || category || from || to;

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="eyebrow">Console / Activity</p>
        <h1 className="mt-1 font-display text-3xl">Audit log</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Every console change, who made it and when — newest first (latest {PAGE_SIZE}).
          Entries are append-only: nothing here can be edited or deleted from the app.
        </p>

        <form action="/admin/logs" method="get" className="mt-6 flex flex-wrap items-center gap-2">
          <span className="flex min-w-52 flex-1 items-center gap-2 border border-ink/10 bg-white px-3 focus-within:border-gold">
            <Search className="size-4 shrink-0 text-fog" />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search user, item, summary…"
              aria-label="Search logs"
              className="w-full bg-transparent py-2 text-sm focus:outline-none"
            />
          </span>
          <select name="category" defaultValue={category} className={inputCls} aria-label="Category">
            <option value="">All categories</option>
            {AUDIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input name="from" type="date" defaultValue={from} aria-label="From date" className={inputCls} />
          <input name="to" type="date" defaultValue={to} aria-label="To date" className={inputCls} />
          <button className="cursor-pointer border border-ink bg-ink px-4 py-2 text-sm text-white transition hover:bg-ink/85">
            Filter
          </button>
          {hasFilter && (
            <Link href="/admin/logs" className="px-2 text-xs text-fog hover:text-ink" aria-label="Clear filters">
              ✕ Clear
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          <p className="mt-6 border border-dashed border-ink/20 bg-white p-8 text-center text-sm text-fog">
            No entries yet — actions will appear here as staff work.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/logs/${r.id}`} className="block p-4 transition hover:bg-sand/60">
                  <span className="flex flex-wrap items-center gap-2">
                    {pill(r.category)}
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink/50">{r.action}</span>
                    <span className="ms-auto font-mono text-[11px] text-ink/40" dir="ltr">
                      {new Date(r.created_at).toLocaleString("en-AE", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="mt-1.5 block truncate text-sm font-medium">{r.summary}</span>
                  <span className="mt-0.5 block truncate text-xs text-fog" dir="ltr">
                    {r.user_email} · {r.user_role.replace("_", " ")}
                    {r.entity_label ? ` · ${r.entity_label}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
