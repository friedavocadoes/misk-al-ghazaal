import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";

async function createBanner(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase.from("banners").insert({
    slot: String(formData.get("slot") ?? "hero"),
    sort: Number(formData.get("sort") ?? 0),
    src: String(formData.get("src") ?? ""),
    alt: String(formData.get("title") ?? "Banner"),
    title: String(formData.get("title") ?? "") || null,
    href: String(formData.get("href") ?? "") || null,
  });
  revalidatePath("/admin/banners");
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
}

function CreateBanner() {
  return (
    <AdminForm
      action={createBanner}
      success="Banner added"
      className="mt-8 border border-ink/10 bg-white p-6"
    >
      <h2 className="font-display text-xl">Add banner</h2>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <label className="block">
          Slot
          <select name="slot" className="mt-1 w-full border border-ink/20 bg-white px-3 py-2">
            <option value="hero">hero (homepage slider)</option>
            <option value="brand">brand (shop-by-brand)</option>
          </select>
        </label>
        <label className="block">
          Order
          <input name="sort" type="number" defaultValue={0} className="mt-1 w-full border border-ink/20 px-3 py-2" />
        </label>
        <label className="block">
          Title
          <input name="title" required placeholder="Misk Al Ghazaal" className="mt-1 w-full border border-ink/20 px-3 py-2" />
        </label>
        <label className="block">
          Link
          <input name="href" placeholder="/collection/misk-al-ghazaal" className="mt-1 w-full border border-ink/20 px-3 py-2" />
        </label>
        <label className="block sm:col-span-2">
          Image URL (upload to the banners bucket first, paste public URL)
          <input name="src" required placeholder="https://…supabase.co/… or /banners/….jpg" className="mt-1 w-full border border-ink/20 px-3 py-2" />
        </label>
      </div>
      <SaveButton className="mt-4">Add banner</SaveButton>
    </AdminForm>
  );
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
              Upload art with the uploader on the edit page, or paste a URL below.
            </p>
          </div>
          <Link
            href="/admin/bin?tab=banners"
            className="shrink-0 border border-ink/20 bg-white px-4 py-2 text-sm transition hover:border-ink/50"
          >
            Recycle bin
          </Link>
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

        <CreateBanner />
      </div>
    </>
  );
}
