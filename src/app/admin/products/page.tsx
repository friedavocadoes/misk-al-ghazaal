import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateHome, revalidateProductPaths } from "@/lib/revalidate";
import { logAdmin } from "@/lib/audit";
import { AdminNav } from "@/components/admin/admin-nav";
import { ActionButton } from "@/components/admin/admin-form";
import { AdminProductSearch } from "@/components/admin/admin-product-search";
import { Plus } from "lucide-react";

async function bulkProducts(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const op = String(formData.get("op"));
  if (!ids.length) return;
  if (op !== "activate" && op !== "deactivate" && op !== "delete") return;
  const supabase = await createClient();
  if (op === "delete") {
    await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
  } else {
    await supabase
      .from("products")
      .update({ is_active: op === "activate" })
      .in("id", ids);
  }
  // Storefront now: every touched PDP + the pages that list them.
  const { data } = await supabase.from("products").select("slug").in("id", ids);
  for (const p of (data as { slug: string }[] | null) ?? []) {
    revalidateProductPaths(p.slug);
  }
  revalidateHome();
  await logAdmin(supabase, s, {
    category: "products",
    action: "update",
    entity: "product",
    summary: `Bulk ${op} on ${ids.length} product${ids.length === 1 ? "" : "s"}`,
    details: { op, ids, slugs: ((data as { slug: string }[] | null) ?? []).map((p) => p.slug) },
  });
  revalidatePath("/admin/products");
}

export default async function ProductsPage(props: {
  searchParams: Promise<{
    q?: string;
    collection?: string;
    lineup?: string;
    status?: string;
  }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");

  const sp = await props.searchParams;
  const query = (sp.q ?? "").trim();
  const collectionFilter = sp.collection ?? "";
  const lineupFilter = sp.lineup ?? "";
  const statusFilter = sp.status ?? "all";

  const supabase = await createClient();
  // select("*"): never breaks on pending migrations (missing columns read
  // as undefined below instead of 500ing the whole console).
  const [
    { data: prods },
    { data: collections },
    { data: lineups },
    { data: links },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*,variants(*)")
      .is("deleted_at", null)
      .order("title")
      .limit(300),
    supabase
      .from("collections")
      .select("id,slug,title")
      .is("deleted_at", null)
      .order("sort"),
    supabase.from("lineups").select("id,slug,title").order("sort"),
    supabase.from("product_collections").select("product_id,collection_id"),
  ]);

  type Row = {
    id: string;
    slug: string;
    title: string;
    price: number;
    images: string[];
    is_active?: boolean | null;
    lineup_id?: string | null;
    sort?: number | null;
    sales_count?: number | null;
    out_of_stock?: boolean;
    demand_score?: number;
    auto_best_seller?: boolean;
    variants?: {stock:number|null;is_active?:boolean}[];
  };
  let rows = ((prods as Row[] | null) ?? []).map((p) => ({
    ...p,
    images: p.images ?? [],
    is_active: p.is_active ?? true,
  }));
  const outOfStock=(p:Row)=>p.out_of_stock || ((p.variants??[]).length>0 && !(p.variants??[]).some(v=>v.is_active!==false && (v.stock==null || v.stock>0)));
  const outOfStockCount=rows.filter(outOfStock).length;
  // Console default: maison rank (manual weight → sales lift → newest).
  rows = [...rows].sort(
    (a, b) =>
      (a.sort ?? 0) - (b.sort ?? 0) ||
      (b.sales_count ?? 0) - (a.sales_count ?? 0),
  );
  if (query)
    rows = rows.filter(
      (p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.slug.includes(query.toLowerCase()),
    );
  if (lineupFilter) rows = rows.filter((p) => p.lineup_id === lineupFilter);
  if (statusFilter === "active") rows = rows.filter((p) => p.is_active);
  if (statusFilter === "out-of-stock") rows=rows.filter(outOfStock);
  if (statusFilter === "paused") rows = rows.filter((p) => !p.is_active);
  if (collectionFilter) {
    const inColl = new Set(
      ((links as { product_id: string; collection_id: string }[] | null) ?? [])
        .filter((l) => l.collection_id === collectionFilter)
        .map((l) => l.product_id),
    );
    rows = rows.filter((p) => inColl.has(p.id));
  }

  const lineupName = new Map(
    ((lineups as { id: string; title: string }[] | null) ?? []).map((l) => [
      l.id,
      l.title,
    ]),
  );
  const collCount = new Map<string, number>();
  for (const l of (links as
    | { product_id: string; collection_id: string }[]
    | null) ?? []) {
    collCount.set(l.product_id, (collCount.get(l.product_id) ?? 0) + 1);
  }

  const selectCls = "border border-ink/20 bg-white px-3 py-2 text-sm";

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">Products</p>
            <h1 className="font-display text-3xl">
              Catalog{" "}
              {rows.length > 0 && (
                <span className="text-lg text-ink/50">({rows.length})</span>
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 bg-ink px-4 py-2 text-sm text-white transition hover:bg-ink/85"
            >
              <Plus className="size-4" /> New product
            </Link>
            <Link
              href="/admin/bin?tab=products"
              className="border border-ink/20 bg-white px-4 py-2 text-sm transition hover:border-ink/50"
            >
              Recycle bin
            </Link>
          </div>
        </div>

        {/* Filters: live quick-find + group by collection / lineup / status */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <AdminProductSearch />
          {outOfStockCount>0 && <Link href="/admin/products?status=out-of-stock" className="border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{outOfStockCount} out of stock →</Link>}
        </div>
        <form
          action="/admin/products"
          method="get"
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          {query && <input type="hidden" name="q" value={query} />}
          <select
            name="collection"
            defaultValue={collectionFilter}
            className={selectCls}
            aria-label="Collection"
          >
            <option value="">All collections</option>
            {(
              (collections as
                | { id: string; slug: string; title: string }[]
                | null) ?? []
            ).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            name="lineup"
            defaultValue={lineupFilter}
            className={selectCls}
            aria-label="Lineup"
          >
            <option value="">All lineups</option>
            {((lineups as { id: string; title: string }[] | null) ?? []).map(
              (l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ),
            )}
          </select>
          <select
            name="status"
            defaultValue={statusFilter}
            className={selectCls}
            aria-label="Status"
          >
            <option value="all">Active + paused</option>
            <option value="active">Active only</option>
            <option value="paused">Paused only</option>
            {outOfStockCount>0 && <option value="out-of-stock">Out of stock</option>}
          </select>
          <button className="cursor-pointer border border-ink bg-ink px-4 py-2 text-sm text-white transition hover:bg-ink/85">
            Filter
          </button>
          {(query ||
            collectionFilter ||
            lineupFilter ||
            statusFilter !== "all") && (
            <Link
              href="/admin/products"
              className="px-2 text-xs text-fog hover:text-ink"
              aria-label="Clear filters"
            >
              ✕ Clear
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          <p className="mt-6 border border-ink/10 bg-white p-6 text-center text-sm text-ink/60">
            No products match —{" "}
            <Link href="/admin/products/new" className="link-underline">
              create one
            </Link>{" "}
            or clear the filters.
          </p>
        ) : (
          <form
            action={bulkProducts}
            className="mt-6 border border-ink/10 bg-white"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-cream/60 px-4 py-3 text-sm">
              <span className="me-1 text-ink/60">
                {rows.length} shown — tick to bulk-edit:
              </span>
              <select
                name="op"
                defaultValue="deactivate"
                className={selectCls}
                aria-label="Bulk action"
              >
                <option value="deactivate">Pause (hide)</option>
                <option value="activate">Activate (show)</option>
                <option value="delete">Move to bin</option>
              </select>
              <ActionButton>Apply to selected</ActionButton>
            </div>
            <div className="divide-y divide-ink/10">
              {rows.map((p) => (
                <div
                  key={p.id}
                  className="admin-row flex items-center gap-4 p-4"
                >
                  <input
                    type="checkbox"
                    name="ids"
                    value={p.id}
                    aria-label={`Select ${p.title}`}
                    className="size-4 shrink-0 cursor-pointer accent-[#1c1917]"
                  />
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="block size-12 shrink-0 overflow-hidden border border-ink/10 bg-sand"
                  >
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-lg italic text-fog">
                        {p.title.charAt(0)}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-medium">
                      {p.title}
                      {outOfStock(p) && <span className="ms-2 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase text-red-700">Out of stock</span>}
                      {!p.is_active && (
                        <span className="ms-2 border border-gold/50 bg-gold-wash/60 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                          Paused
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-ink/60">
                      /{p.slug} · {p.images?.length ?? 0} images ·{" "}
                      {collCount.get(p.id) ?? 0} collections
                      {p.lineup_id && lineupName.get(p.lineup_id)
                        ? ` · ${lineupName.get(p.lineup_id)}`
                        : ""}
                      {` · rank ${p.sort ?? 0} · demand ${Number(p.demand_score??0).toFixed(1)} · ${p.sales_count ?? 0} sold`}{p.auto_best_seller && " · auto bestseller"}
                    </p>
                  </Link>
                  <p className="shrink-0 font-medium">
                    AED {Number(p.price).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
