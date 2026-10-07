import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/sign-out-button";

export default async function BannersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");

  let rows: { id: string; slot: string; sort: number; title: string | null; src: string; href: string | null }[] = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("banners")
      .select("id,slot,sort,title,src,href")
      .order("slot")
      .order("sort")
      .limit(100);
    rows = (data as typeof rows) ?? [];
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink/10 pb-6">
        <div>
          <p className="eyebrow">
            <Link href="/admin" className="link-underline">Admin</Link> / Banners
          </p>
          <h1 className="font-display text-3xl">Banners</h1>
          <p className="mt-1 text-sm text-ink/60">
            slot `hero` → homepage HeroSlider · `brand` → shop-by-brand split.
            Upload art to the `banners` bucket, then paste the public URL into `src`.
          </p>
        </div>
        <SignOutButton />
      </header>
      {rows.length === 0 ? (
        <p className="mt-6 border border-ink/10 bg-white p-4 text-sm">
          No banners in Supabase yet — add rows in Dashboard → Table Editor
          (table `banners`), mirroring the fields of the `Banner` type.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
          {rows.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">[{b.slot} #{b.sort}] {b.title ?? "(untitled)"}</p>
                <p className="break-all text-sm text-ink/60">{b.src} → {b.href ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
