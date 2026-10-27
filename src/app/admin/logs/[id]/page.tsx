import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { ArrowUpRight } from "lucide-react";

/** Deep link from a log row back into the console where possible. */
function entityHref(entity: string, entityId: string): string | null {
  if (!entityId) return null;
  if (entity === "product" || entity === "product_gallery" || entity === "product_notes" || entity === "product_collections" || entity === "product_artwork" || entity === "variant") {
    return `/admin/products/${entityId}`;
  }
  if (entity === "retail_store") return `/admin/stores/${entityId}`;
  if (entity === "order") return `/admin/orders/${entityId}`;
  if (entity === "banner" || entity === "banner_artwork") return `/admin/banners/${entityId}`;
  if (entity === "coupon") return `/admin/coupons/${entityId}`;
  if (entity === "homepage_section") return `/admin/homepage/${entityId}`;
  if (entity === "ritual") return `/admin/rituals/${entityId}`;
  return null;
}

export default async function AuditLogDetail(props: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase.from("admin_audit_log").select("*").eq("id", id).single();
  if (!data) redirect("/admin/logs");
  const r = data as {
    id: string; created_at: string; user_email: string; user_role: string;
    category: string; action: string; entity: string; entity_id: string;
    entity_label: string; summary: string; details: unknown;
  };
  const target = entityHref(r.entity, r.entity_id);

  const rows: [string, string][] = [
    ["When", new Date(r.created_at).toLocaleString("en-AE", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })],
    ["Who", `${r.user_email} (${r.user_role.replace("_", " ")})`],
    ["Category", r.category],
    ["Action", r.action],
    ["Item", r.entity_label || "—"],
  ];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <p className="eyebrow">
          <Link href="/admin/logs" className="link-underline">Audit log</Link> / entry
        </p>
        <h1 className="mt-2 font-display text-2xl leading-snug md:text-3xl">{r.summary}</h1>

        <dl className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-wrap gap-3 px-5 py-3">
              <dt className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog">{k}</dt>
              <dd className="min-w-0 flex-1 break-words font-medium" dir="auto">{v}</dd>
            </div>
          ))}
          {target && (
            <div className="flex flex-wrap gap-3 px-5 py-3">
              <dt className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog">Open</dt>
              <dd>
                <Link href={target} className="link-underline inline-flex items-center gap-1.5 text-sm">
                  <ArrowUpRight className="size-3.5" /> Jump to item in console
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <h2 className="mt-8 font-display text-xl">Change details</h2>
        <pre
          dir="ltr"
          className="mt-3 max-h-[60vh] overflow-auto border border-ink/10 bg-ink p-5 font-mono text-[12px] leading-relaxed text-white/90"
        >
{JSON.stringify(r.details ?? {}, null, 2)}
        </pre>
        <p className="mt-3 text-xs text-ink/50">
          Entries are append-only — they cannot be edited or deleted from the console.
        </p>
      </div>
    </>
  );
}
