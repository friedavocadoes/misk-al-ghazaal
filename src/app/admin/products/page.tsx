import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/sign-out-button";

export default async function ProductsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");

  let rows: { id: string; slug: string; title: string; price: number; images: string[] }[] = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("id,slug,title,price,images")
      .order("title")
      .limit(200);
    rows = (data as typeof rows) ?? [];
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink/10 pb-6">
        <div>
          <p className="eyebrow">
            <Link href="/admin" className="link-underline">Admin</Link> / Products
          </p>
          <h1 className="font-display text-3xl">Products</h1>
        </div>
        <SignOutButton />
      </header>
      {!process.env.NEXT_PUBLIC_SUPABASE_URL ? (
        <p className="mt-6 border border-ink/10 bg-white p-4 text-sm">
          Connect Supabase env + run schema to manage products here.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 border border-ink/10 bg-white p-4 text-sm">
          No products in Supabase yet — import via <code>supabase/seed.sql</code> (next
          step) or add rows in Dashboard → Table Editor.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
          {rows.map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between p-4 hover:bg-cream">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-ink/60">/{p.slug} · {p.images?.length ?? 0} images</p>
              </div>
              <p className="font-medium">AED {Number(p.price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
