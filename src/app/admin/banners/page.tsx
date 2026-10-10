import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { ActionButton } from "@/components/admin/admin-form";
import { BannerCreateButton } from "@/components/admin/banner-create-button";

const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
};

async function createBanner(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { error } = await supabase.from("banners").insert({
    slot: String(formData.get("slot") ?? "hero"),
    sort: Number(formData.get("sort") ?? 0),
    src: String(formData.get("src") ?? ""),
    fallback: text(formData, "fallback") ?? "",
    alt: String(formData.get("alt") ?? formData.get("title") ?? "Banner"),
    title: text(formData, "title"),
    title_ar: text(formData, "title_ar"),
    eyebrow: text(formData, "eyebrow"),
    eyebrow_ar: text(formData, "eyebrow_ar"),
    desc: text(formData, "desc"),
    desc_ar: text(formData, "desc_ar"),
    cta: text(formData, "cta"),
    cta_ar: text(formData, "cta_ar"),
    href: text(formData, "href"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/banners");
  // Storefront now, no rebuild: both homepage locales re-render on refresh.
  revalidatePath("/", "page");
  revalidatePath("/ar", "page");
}

async function moveToBin(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase
    .from("banners")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/banners");
  revalidatePath("/", "page");
  revalidatePath("/ar", "page");
}

export default async function BannersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");

  const supabase = await createClient();
  const { data } = await supabase
    .from("banners")
    .select("id,slot,sort,title,src,href")
    .is("deleted_at", null)
    .order("slot")
    .order("sort")
    .limit(100);
  const rows =
    (data as { id: string; slot: string; sort: number; title: string | null; src: string; href: string | null }[]) ?? [];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">Banners</p>
            <h1 className="font-display text-3xl">Hero + brand</h1>
            <p className="mt-1 text-sm text-ink/60">
              slot `hero` → homepage slider · `brand` → shop-by-brand split.
              Changes go live on page refresh — no rebuild.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <BannerCreateButton create={createBanner} />
            <Link
              href="/admin/bin?tab=banners"
              className="border border-ink/20 bg-white px-4 py-2 text-sm transition hover:border-ink/50"
            >
              Recycle bin
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 border border-ink/10 bg-white p-4 text-sm">
            No banners — run <code>supabase/seed.sql</code> or add one below.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {rows.map((b) => (
              <article key={b.id} className="admin-card border border-ink/10 bg-white">
                {/* plain img: admin preview, skip next/image optimization */}
                {b.src && (
                  <img
                    src={b.src}
                    alt={b.title ?? ""}
                    className="aspect-[16/9] w-full border-b border-ink/10 bg-sand object-cover"
                    loading="lazy"
                  />
                )}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      [{b.slot} #{b.sort}] {b.title ?? "(untitled)"}
                    </p>
                    <p className="truncate text-sm text-ink/60" title={b.href ?? ""}>
                      → {b.href ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/admin/banners/${b.id}`}
                      className="border border-ink/20 px-3 py-1.5 text-sm transition hover:border-ink/50"
                    >
                      Edit
                    </Link>
                    <form action={moveToBin}>
                      <input type="hidden" name="id" value={b.id} />
                      <ActionButton danger>Delete</ActionButton>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
    </>
  );
}
