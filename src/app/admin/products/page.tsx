import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { Search } from "lucide-react";

export default async function ProductsPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");

  const { q } = await props.searchParams;
  const query = (q ?? "").trim();
  const supabase = await createClient();
  let req = supabase
    .from("products")
    .select("id,slug,title,price,images")
    .is("deleted_at", null)
    .order("title")
    .limit(200);
  if (query) req = req.ilike("title", `%${query}%`);
  const { data } = await req;
  const rows =
    (data as { id: string; slug: string; title: string; price: number; images: string[] }[]) ?? [];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">Products</p>
            <h1 className="font-display text-3xl">Catalog</h1>
          </div>
          <Link
            href="/admin/bin?tab=products"
            className="border border-ink/20 bg-white px-4 py-2 text-sm transition hover:border-ink/50"
          >
            Recycle bin
          </Link>
        </div>
        <form action="/admin/products" method="get" className="mt-6 flex items-center gap-2 border border-ink/10 bg-white px-4 py-1.5 focus-within:border-gold">
          <Search className="size-4 shrink-0 text-fog" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search the catalog…"
            aria-label="Search products"
            className="w-full bg-transparent py-2 text-sm text-ink placeholder:text-fog focus:outline-none"
          />
          {query && (
            <Link href="/admin/products" className="shrink-0 text-xs text-fog hover:text-ink" aria-label="Clear search">
              ✕
            </Link>
          )}
        </form>
        {rows.length === 0 ? (
          <p className="mt-6 border border-ink/10 bg-white p-4 text-sm">
            No products — run <code>supabase/seed.sql</code> or add rows in
            Dashboard → Table Editor.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
            {rows.map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}`}
                className="admin-row flex items-center gap-4 p-4"
              >
                <span className="block size-12 shrink-0 overflow-hidden border border-ink/10 bg-sand">
                  {p.images?.[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.images[0]} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex size-full items-center justify-center font-display text-lg italic text-fog">
                      {p.title.charAt(0)}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="truncate text-sm text-ink/60">
                    /{p.slug} · {p.images?.length ?? 0} images
                  </p>
                </div>
                <p className="ms-auto shrink-0 font-medium">AED {Number(p.price).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
