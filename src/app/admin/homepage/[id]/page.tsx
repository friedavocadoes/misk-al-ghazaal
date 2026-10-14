import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateHome } from "@/lib/revalidate";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { ImageUploader } from "@/components/admin/image-uploader";
import { logAdmin } from "@/lib/audit";

async function saveSection(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const kind = String(formData.get("kind"));
  const config: Record<string, unknown> = {};
  if (kind === "products_carousel") {
    config.mode = String(formData.get("mode") || "collection");
    config.collection = String(formData.get("collection") || "best-sellers");
    config.slugs = String(formData.get("slugs") || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    config.limit = Math.min(24, Math.max(1, Number(formData.get("limit") || 8)));
  }
  if (kind === "collections_grid" || kind === "blog_grid") {
    config.limit = Math.min(24, Math.max(1, Number(formData.get("limit") || 6)));
  }
  if (kind === "image_banner" || kind === "parallax_cta") {
    config.src = String(formData.get("src") || "");
    config.href = String(formData.get("href") || "");
    config.title = String(formData.get("cfg_title") || "");
    config.cta = String(formData.get("cfg_cta") || "");
    config.ctaAr = String(formData.get("cfg_cta_ar") || "");
  }
  await supabase
    .from("homepage_sections")
    .update({
      title: String(formData.get("title") || ""),
      title_ar: String(formData.get("title_ar") || "") || null,
      eyebrow: String(formData.get("eyebrow") || "") || "",
      eyebrow_ar: String(formData.get("eyebrow_ar") || "") || null,
      config,
    })
    .eq("id", id);
  revalidatePath(`/admin/homepage/${id}`);
  revalidatePath("/admin/homepage");
  await logAdmin(supabase, s, {
    category: "homepage",
    action: "update",
    entity: "homepage_section",
    entityId: id,
    label: String(formData.get("title") || ""),
    summary: `Edited home section “${String(formData.get("title") || id)}”`,
    details: { title: String(formData.get("title") || ""), kind },
  });
  revalidateHome();
}

export default async function SectionDetail(props: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("homepage_sections").select("*").eq("id", id).single();
  if (!s) redirect("/admin/homepage");
  const { data: collections } = await supabase.from("collections").select("slug,title").is("deleted_at", null).order("sort");

  const cfg = (s.config ?? {}) as {
    mode?: string; collection?: string; slugs?: string[]; limit?: number;
    src?: string; href?: string; title?: string; cta?: string; ctaAr?: string;
  };
  const field = "mt-1 w-full border border-ink/20 bg-white px-3 py-2";

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">
          <Link href="/admin/homepage" className="link-underline">Home screen</Link> /{" "}
          <span className="font-mono">{s.kind}</span>
        </p>
        <h1 className="font-display text-3xl">{s.title || "(untitled)"}</h1>

        <AdminForm action={saveSection} success="Section saved" className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm md:grid-cols-2">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="kind" value={s.kind} />
          <label className="block">Title (EN)<input name="title" defaultValue={s.title ?? ""} className={field} /></label>
          <label className="block">Title (AR)<input name="title_ar" defaultValue={s.title_ar ?? ""} className={field} /></label>
          <label className="block">Eyebrow (EN)<input name="eyebrow" defaultValue={s.eyebrow ?? ""} className={field} /></label>
          <label className="block">Eyebrow (AR)<input name="eyebrow_ar" defaultValue={s.eyebrow_ar ?? ""} className={field} /></label>

          {s.kind === "products_carousel" && (
            <>
              <label className="block">Source
                <select name="mode" defaultValue={cfg.mode ?? "collection"} className={field}>
                  <option value="collection">Ranked collection (auto order)</option>
                  <option value="manual">Hand-picked slugs (my exact order)</option>
                </select>
              </label>
              <label className="block">Collection
                <select name="collection" defaultValue={cfg.collection ?? "best-sellers"} className={field}>
                  {((collections as { slug: string; title: string }[] | null) ?? []).map((c) => (
                    <option key={c.slug} value={c.slug}>{c.title}</option>
                  ))}
                  <option value="best-sellers">★ best-sellers (flag)</option>
                  <option value="new-arrivals">★ new-arrivals (flag)</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                Hand-picked slugs — one per line, top line shows first
                <textarea
                  name="slugs"
                  rows={5}
                  defaultValue={(cfg.slugs ?? []).join("\n")}
                  dir="ltr"
                  placeholder={"abukhalid\nmisk-al-hob"}
                  className={`${field} font-mono text-[13px]`}
                />
              </label>
              <label className="block">Max pieces
                <input name="limit" type="number" min={1} max={24} defaultValue={cfg.limit ?? 8} className={field} />
              </label>
            </>
          )}

          {(s.kind === "collections_grid" || s.kind === "blog_grid") && (
            <label className="block">Max cards
              <input name="limit" type="number" min={1} max={24} defaultValue={cfg.limit ?? 6} className={field} />
            </label>
          )}

          {(s.kind === "image_banner" || s.kind === "parallax_cta") && (
            <>
              <div className="md:col-span-2">
                <p className="mb-1 text-sm font-medium">Artwork (image_banner only)</p>
                {cfg.src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cfg.src} alt="" className="mb-2 h-36 w-full border border-ink/10 bg-sand object-cover" />
                )}
                <ImageUploader bucket="banners" prefix="home-banner" onUploaded={() => {}} />
                <p className="mt-1 text-xs text-ink/50">Upload, then paste the URL below (uploads print their URL).</p>
              </div>
              <label className="block md:col-span-2">Image URL<input name="src" defaultValue={cfg.src ?? ""} dir="ltr" className={field} /></label>
              <label className="block">Caption<input name="cfg_title" defaultValue={cfg.title ?? ""} className={field} /></label>
              <label className="block">Button<input name="cfg_cta" defaultValue={cfg.cta ?? ""} className={field} /></label>
              <label className="block">Button (AR)<input name="cfg_cta_ar" defaultValue={cfg.ctaAr ?? ""} className={field} /></label>
              <label className="block">Link<input name="href" defaultValue={cfg.href ?? ""} dir="ltr" placeholder="/collection/…" className={field} /></label>
            </>
          )}

          <SaveButton className="md:col-span-2">Save section</SaveButton>
        </AdminForm>
      </div>
    </>
  );
}
