import sharp from "sharp";
import { cleanupBannerArt } from "@/lib/banner-storage";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateNavigation, revalidateHome } from "@/lib/revalidate";
import { AdminNav } from "@/components/admin/admin-nav";
import { ActionButton } from "@/components/admin/admin-form";
import { BannerCreateButton } from "@/components/admin/banner-create-button";
import { logAdmin } from "@/lib/audit";

const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v || null;
};

async function createBanner(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  let src = String(formData.get("src") ?? "");
  const heroId = String(formData.get("hero_id") ?? "");
  if (heroId && formData.get("slot") === "navigation") {
    const { data: hero, error: lookupError } = await supabase.from("banners").select("src").eq("id", heroId).eq("slot", "hero").is("deleted_at", null).single();
    if (lookupError || !hero) throw new Error("Hero image not found.");
    let bytes: Buffer;
    const path = hero.src.split("/storage/v1/object/public/banners/")[1];
    if (path) {
      const { data, error } = await supabase.storage.from("banners").download(decodeURIComponent(path));
      if (error || !data) throw new Error("Could not copy hero artwork.");
      bytes = Buffer.from(await data.arrayBuffer());
    } else if (hero.src.startsWith("/") && !hero.src.includes("..")) {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      bytes = await readFile(join(process.cwd(), "public", hero.src));
    } else throw new Error("Upload this hero artwork directly to create a menu banner.");
    const output = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().webp({ lossless: true }).toBuffer();
    const copyPath = `navigation-${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from("banners").upload(copyPath, output, { contentType: "image/webp" });
    if (error) throw error;
    src = supabase.storage.from("banners").getPublicUrl(copyPath).data.publicUrl;
  }
  const { error } = await supabase.from("banners").insert({
    slot: String(formData.get("slot") ?? "hero"),
    sort: Number(formData.get("sort") ?? 0),
    src,
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
  if (error) throw new Error(error.code === "23514" ? "Enable navigation banners by applying supabase/migration_navigation_banners.sql in Supabase SQL Editor." : error.message);
  await logAdmin(supabase, s, {
    category: "banners",
    action: "create",
    entity: "banner",
    label: `[${String(formData.get("slot") ?? "hero")}] ${String(formData.get("title") ?? "")}`,
    summary: `Created banner “${String(formData.get("title") ?? "untitled")}” (${formData.get("slot")})`,
    details: { slot: String(formData.get("slot") ?? "hero"), title: String(formData.get("title") ?? "") },
  });
  revalidatePath("/admin/banners");
  // Storefront now, no rebuild: both homepage locales re-render on refresh.
  revalidateHome();
  revalidateNavigation();
}

async function moveToBin(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data: doomed } = await supabase.from("banners").select("slot, title, src, fallback").eq("id", String(formData.get("id"))).single();
  const d = (doomed ?? {}) as { slot?: string; title?: string | null };
  if (doomed?.slot === "navigation") {
    const { error } = await supabase.from("banners").delete().eq("id", String(formData.get("id")));
    if (error) throw error;
    await cleanupBannerArt(supabase, [doomed.src, doomed.fallback]);
    revalidatePath("/admin/banners"); revalidateNavigation();
    await logAdmin(supabase, s, { category: "banners", action: "delete", entity: "banner", entityId: String(formData.get("id")), summary: "Deleted menu banner and unused artwork" });
    return;
  }
  const { error } = await supabase
    .from("banners")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  await logAdmin(supabase, s, {
    category: "banners",
    action: "delete",
    entity: "banner",
    entityId: String(formData.get("id")),
    label: d.title ?? `[${d.slot ?? "?"}]`,
    summary: `Moved banner “${d.title ?? String(formData.get("id"))}” to the bin`,
    details: { id: String(formData.get("id")), slot: d.slot ?? null },
  });
  revalidatePath("/admin/banners");
  revalidateHome();
  revalidateNavigation();
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
            <h1 className="font-display text-3xl">Hero, brand + navigation</h1>
            <p className="mt-1 text-sm text-ink/60">
              Navigation campaigns: the first two by Order appear in the desktop shop menu and mobile drawer. Use 4:5 artwork (800 × 1000 px); leave this slot empty for a text-only menu.
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

        <section id="navigation" className="mt-8 border border-ink/15 bg-white p-6">
          <h2 className="font-display text-2xl">Shop menu banners</h2>
          <p className="my-3 text-sm text-ink/60">Upload artwork or copy a hero image. The first two by Order appear on the right of Shop With Us and in the mobile menu. Recommended: 800 × 1000 px. Deleting a menu banner permanently removes its unused uploaded artwork.</p>
          <BannerCreateButton create={createBanner} initialSlot="navigation" heroes={rows.filter((row) => row.slot === "hero" && !/\.mp4$/i.test(row.src))} />
        </section>
        {rows.length === 0 ? (
          <p className="mt-6 border border-ink/10 bg-white p-4 text-sm">
            No banners — run <code>supabase/seed.sql</code> or add one below.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {rows.map((b) => (
              <article key={b.id} className="admin-card border border-ink/10 bg-white">
                {/* plain img: admin preview, skip next/image optimization */}
                {/\.mp4$/i.test(b.src) ? <video src={b.src} muted controls preload="metadata" className="aspect-video w-full object-cover" /> : b.src && (
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
