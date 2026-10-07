import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function ProductsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id,slug,title,price,images")
    .is("deleted_at", null)
    .order("title")
    .limit(200);
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
                className="admin-row flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-ink/60">
                    /{p.slug} · {p.images?.length ?? 0} images
                  </p>
                </div>
                <p className="font-medium">AED {Number(p.price).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
