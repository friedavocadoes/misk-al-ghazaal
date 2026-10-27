import { cleanupBannerArt } from "@/lib/banner-storage";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { autoDeleteAt, purgeExpiredBin, type BinTable } from "@/lib/trash";
import { revalidatePagePaths, revalidateNavigation, revalidateHome, touchProduct } from "@/lib/revalidate";
import { logAdmin } from "@/lib/audit";

const TABS: { key: BinTable; label: string; superOnly?: boolean }[] = [
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products", superOnly: true },
  { key: "banners", label: "Banners", superOnly: true },
];

async function restoreItem(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  const table = String(formData.get("table"));
  if ((table !== "orders" && s.role !== "super_admin") || !["orders", "products", "banners"].includes(table)) {
    redirect("/admin/bin");
  }
  const supabase = await createClient();
  const { data: row } = await supabase.from(table).select("*").eq("id", String(formData.get("id"))).single();
  const r = (row ?? {}) as Record<string, unknown>;
  const label =
    table === "products" ? String(r.title ?? r.slug ?? formData.get("id"))
    : table === "orders" ? String(r.order_no ?? formData.get("id"))
    : String(r.title ?? r.slot ?? formData.get("id"));
  const { error: restoreError } = await supabase.from(table).update({ deleted_at: null }).eq("id", String(formData.get("id"))).select("id").single();
  if (restoreError) throw new Error(restoreError.message);
  await logAdmin(supabase, s, {
    category: "bin",
    action: "restore",
    entity: table === "products" ? "product" : table === "orders" ? "order" : "banner",
    entityId: String(formData.get("id")),
    label,
    summary: `Restored ${label} from the bin`,
    details: { table, id: String(formData.get("id")) },
  });
  revalidatePath("/admin/bin");
  if (table === "orders") { revalidatePath("/admin/orders"); revalidatePath("/admin/users", "layout"); revalidatePagePaths("/account/orders"); revalidatePagePaths("/account/orders/[id]"); }
  // Restored rows are live again — refresh their storefront surfaces too.
  if (table === "banners") { revalidateHome(); revalidateNavigation(); }
  if (table === "products") await touchProduct(supabase, String(formData.get("id")));
}

async function destroyItem(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  const table = String(formData.get("table"));
  if ((table !== "orders" && s.role !== "super_admin") || !["orders", "products", "banners"].includes(table)) {
    redirect("/admin/bin");
  }
  const supabase = await createClient();
  // Snapshot first: hard deletes are forever, the audit row keeps them.
  const { data: doomed } = await supabase.from(table).select("*").eq("id", String(formData.get("id"))).single();
  const d = (doomed ?? {}) as Record<string, unknown>;
  const label =
    table === "products" ? String(d.title ?? d.slug ?? formData.get("id"))
    : table === "orders" ? String(d.order_no ?? formData.get("id"))
    : String(d.title ?? d.slot ?? formData.get("id"));
  // Hard-deleting a banner also removes its artwork from Storage so dead
  // files never pile up (soft-deletes keep files for restores).
  if (table === "banners") {
    const { data: b } = await supabase
      .from("banners")
      .select("src, fallback, mobile_src, mobile_fallback")
      .eq("id", String(formData.get("id")))
      .single();
    const { error } = await supabase.from("banners").delete().eq("id", String(formData.get("id")));
    if (error) throw error;
    await cleanupBannerArt(supabase, [b?.src, b?.fallback, b?.mobile_src, b?.mobile_fallback].filter((url): url is string => typeof url === "string"));
  }
  if (table !== "banners") {
    const { error: deleteError } = await supabase.from(table).delete().eq("id", String(formData.get("id")));
    if (deleteError) throw new Error(deleteError.message);
  }
  await logAdmin(supabase, s, {
    category: "bin",
    action: "delete",
    entity: table === "products" ? "product" : table === "orders" ? "order" : "banner",
    entityId: String(formData.get("id")),
    label,
    summary: `Permanently deleted ${label} (${table})`,
    details: { table, id: String(formData.get("id")), snapshot: doomed ?? null },
  });
  revalidatePath("/admin/bin");
  if (table === "orders") { revalidatePath("/admin/orders"); revalidatePath("/admin/users", "layout"); revalidatePagePaths("/account/orders"); revalidatePagePaths("/account/orders/[id]"); }
  if (table === "banners") { revalidateHome(); revalidateNavigation(); }
}

function BinButtons({ table, id }: { table: BinTable; id: string }) {
  return (
    <div className="flex shrink-0 gap-2">
      <AdminForm action={restoreItem}>
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <ActionButton>Restore</ActionButton>
      </AdminForm>
      <AdminForm action={destroyItem}>
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <ActionButton danger>Delete forever</ActionButton>
      </AdminForm>
    </div>
  );
}

export default async function BinPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { tab } = await props.searchParams;
  const allowed = TABS.filter((t) => !t.superOnly || session.role === "super_admin");
  const active: BinTable = allowed.some((t) => t.key === tab)
    ? (tab as BinTable)
    : "orders";

  // Enforce the 20-day rule on every visit (no cron needed).
  await purgeExpiredBin();
  const supabase = await createClient();

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-AE");
  const counts: Record<BinTable, number> = { orders: 0, products: 0, banners: 0 };
  for (const t of TABS) {
    if (t.superOnly && session.role !== "super_admin") continue;
    const { count } = await supabase
      .from(t.key)
      .select("id", { count: "exact", head: true })
      .not("deleted_at", "is", null);
    counts[t.key] = count ?? 0;
  }

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <div className="border-b border-ink/10 pb-6">
          <p className="eyebrow">Recycle bin</p>
          <h1 className="font-display text-3xl">Deleted items</h1>
          <p className="mt-1 text-sm text-ink/60">
            Everything here is recoverable. Items auto-delete forever 20 days
            after deletion.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {allowed.map((t) => (
            <Link
              key={t.key}
              href={`/admin/bin?tab=${t.key}`}
              className={`border px-3 py-1.5 text-sm transition ${
                active === t.key
                  ? "border-ink bg-ink text-white"
                  : "border-ink/20 bg-white hover:border-ink/50"
              }`}
            >
              {t.label} ({counts[t.key]})
            </Link>
          ))}
        </div>

        <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
          <BinList
            active={active}
            isSuper={session.role === "super_admin"}
            fmt={fmt}
          />
        </div>
      </div>
    </>
  );
}

async function BinList({
  active,
  isSuper,
  fmt,
}: {
  active: BinTable;
  isSuper: boolean;
  fmt: (d: string) => string;
}) {
  if ((active !== "orders") && !isSuper) return null;
  const supabase = await createClient();

  if (active === "orders") {
    const { data } = await supabase
      .from("orders")
      .select("id,order_no,customer_name,total,deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(100);
    const rows = (data as { id: string; order_no: string; customer_name: string; total: number; deleted_at: string }[]) ?? [];
    if (!rows.length) return <p className="p-6 text-sm text-ink/60">Bin is empty.</p>;
    return (
      <>
        {rows.map((o) => (
          <div key={o.id} className="admin-row flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{o.order_no} · {o.customer_name}</p>
              <p className="text-sm text-ink/60">
                AED {Number(o.total).toFixed(2)} · deleted {fmt(o.deleted_at)} ·
                gone {fmt(autoDeleteAt(o.deleted_at).toISOString())}
              </p>
            </div>
            <BinButtons table="orders" id={o.id} />
          </div>
        ))}
      </>
    );
  }

  if (active === "products") {
    const { data } = await supabase
      .from("products")
      .select("id,title,slug,deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(100);
    const rows = (data as { id: string; title: string; slug: string; deleted_at: string }[]) ?? [];
    if (!rows.length) return <p className="p-6 text-sm text-ink/60">Bin is empty.</p>;
    return (
      <>
        {rows.map((p) => (
          <div key={p.id} className="admin-row flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-ink/60">
                /{p.slug} · deleted {fmt(p.deleted_at)} · gone {fmt(autoDeleteAt(p.deleted_at).toISOString())}
              </p>
            </div>
            <BinButtons table="products" id={p.id} />
          </div>
        ))}
      </>
    );
  }

  const { data } = await supabase
    .from("banners")
    .select("id,slot,title,src,deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(100);
  const rows = (data as { id: string; slot: string; title: string | null; src: string; deleted_at: string }[]) ?? [];
  if (!rows.length) return <p className="p-6 text-sm text-ink/60">Bin is empty.</p>;
  return (
    <>
      {rows.map((b) => (
        <div key={b.id} className="admin-row flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-3">
            {b.src && (
              <img src={b.src} alt="" className="h-12 w-20 shrink-0 border border-ink/10 bg-sand object-cover" />
            )}
            <div className="min-w-0">
              <p className="font-medium">[{b.slot}] {b.title ?? "(untitled)"}</p>
              <p className="text-sm text-ink/60">
                deleted {fmt(b.deleted_at)} · gone {fmt(autoDeleteAt(b.deleted_at).toISOString())}
              </p>
            </div>
          </div>
          <BinButtons table="banners" id={b.id} />
        </div>
      ))}
    </>
  );
}
