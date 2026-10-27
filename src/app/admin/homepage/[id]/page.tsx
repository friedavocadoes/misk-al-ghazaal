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
import type { HomepageSectionConfig } from "@/lib/store";

async function saveSection(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const kind = String(formData.get("kind"));
  const config: HomepageSectionConfig = {};

  const str = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v || undefined;
  };
  const lines = (k: string) =>
    String(formData.get(k) || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  if (kind === "products_carousel") {
    config.mode = (str("mode") as "collection" | "manual") || "collection";
    config.collection = str("collection") || "best-sellers";
    config.slugs = lines("slugs");
    config.limit = Math.min(24, Math.max(1, Number(formData.get("limit") || 8)));
  }

  if (kind === "scent_alchemist") {
    config.mode = (str("mode") as "collection" | "manual") || "collection";
    config.slugs = lines("slugs");
    config.prompt = str("prompt");
    config.promptAr = str("prompt_ar");
    config.noteSlugs = lines("note_slugs");
  }

  if (kind === "collections_grid" || kind === "blog_grid") {
    config.limit = Math.min(24, Math.max(1, Number(formData.get("limit") || 6)));
  }

  if (kind === "brand_split") {
    config.cta = str("cfg_cta");
    config.ctaAr = str("cfg_cta_ar");
    config.href = str("href");
  }

  if (kind === "image_banner" || kind === "parallax_cta") {
    config.src = str("src");
    config.href = str("href");
    config.title = str("cfg_title");
    config.cta = str("cfg_cta");
    config.ctaAr = str("cfg_cta_ar");
  }

  if (kind === "story") {
    config.src = str("src");
    config.secondarySrc = str("secondary_src");
    config.badge = str("badge");
    config.badgeAr = str("badge_ar");
    config.desc = str("desc");
    config.descAr = str("desc_ar");
    config.cta = str("cfg_cta");
    config.ctaAr = str("cfg_cta_ar");
    config.href = str("href");
    config.secondaryCta = str("secondary_cta");
    config.secondaryCtaAr = str("secondary_cta_ar");
    config.secondaryHref = str("secondary_href");
  }

  if (kind === "dual_feature") {
    config.leftEyebrow = str("left_eyebrow");
    config.leftEyebrowAr = str("left_eyebrow_ar");
    config.leftTitle = str("left_title");
    config.leftTitleAr = str("left_title_ar");
    config.leftCta = str("left_cta");
    config.leftCtaAr = str("left_cta_ar");
    config.leftHref = str("left_href");
    config.leftSrc = str("left_src");
    config.rightEyebrow = str("right_eyebrow");
    config.rightEyebrowAr = str("right_eyebrow_ar");
    config.rightTitle = str("right_title");
    config.rightTitleAr = str("right_title_ar");
    config.rightCta = str("right_cta");
    config.rightCtaAr = str("right_cta_ar");
    config.rightHref = str("right_href");
    config.rightSrc = str("right_src");
  }

  {

    const { error: mutationError } = await supabase
    .from("homepage_sections")
    .update({
      title: String(formData.get("title") || ""),
      title_ar: String(formData.get("title_ar") || "") || null,
      eyebrow: String(formData.get("eyebrow") || "") || "",
      eyebrow_ar: String(formData.get("eyebrow_ar") || "") || null,
      config,
    })
    .eq("id", id);

    if (mutationError) throw new Error(mutationError.message);

  }

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
  if (s.kind === "scent_alchemist") return <><AdminNav email={session.email} role={session.role} /><div className="admin-workspace admin-legacy"><h1 className="text-3xl">The scent finder has moved</h1><p className="mt-5 text-sm leading-7">Find Your Scent is now a dedicated page. It uses all active products and the notes library, with twelve popular notes shown first. This legacy homepage section is no longer displayed.</p><div className="mt-8 flex gap-6 text-sm underline"><Link href="/find-your-scent">View scent finder</Link><Link href="/admin/notes">Manage notes</Link><Link href="/admin/products">Manage products</Link></div></div></>;

  const [{ data: collections }, { data: notes }] = await Promise.all([
    supabase.from("collections").select("slug,title").is("deleted_at", null).order("sort"),
    supabase.from("notes").select("slug,name,color").order("name"),
  ]);

  const cfg = (s.config ?? {}) as HomepageSectionConfig;
  const field = "mt-1 w-full border border-ink/20 bg-white px-3 py-2";

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">
          <Link href="/admin/homepage" className="link-underline">
            Home screen
          </Link>{" "}
          / <span className="font-mono">{s.kind}</span>
        </p>
        <h1 className="font-display text-3xl">{s.title || `(${s.kind})`}</h1>

        <AdminForm
          action={saveSection}
          success="Section saved"
          className="mt-8 grid gap-4 border border-ink/10 bg-white p-6 text-sm md:grid-cols-2"
        >
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="kind" value={s.kind} />
          <label className="block">
            Title (EN)
            <input name="title" defaultValue={s.title ?? ""} className={field} />
          </label>
          <label className="block">
            Title (AR)
            <input name="title_ar" defaultValue={s.title_ar ?? ""} className={field} />
          </label>
          <label className="block">
            Eyebrow (EN)
            <input name="eyebrow" defaultValue={s.eyebrow ?? ""} className={field} />
          </label>
          <label className="block">
            Eyebrow (AR)
            <input name="eyebrow_ar" defaultValue={s.eyebrow_ar ?? ""} className={field} />
          </label>

          {s.kind === "scent_alchemist" && (
            <>
              <label className="block">
                Interactive Prompt (EN)
                <input
                  name="prompt"
                  defaultValue={cfg.prompt ?? ""}
                  placeholder="Tap up to 3 accords to compose your aura"
                  className={field}
                />
              </label>
              <label className="block">
                Interactive Prompt (AR)
                <input
                  name="prompt_ar"
                  defaultValue={cfg.promptAr ?? ""}
                  placeholder="اختر حتى 3 نوتات لتركيب هالتك العطرية"
                  className={field}
                />
              </label>
              <label className="block md:col-span-2">
                Product Pool Source
                <select name="mode" defaultValue={cfg.mode ?? "collection"} className={field}>
                  <option value="collection">All active products (matched by notes & keywords)</option>
                  <option value="manual">Hand-picked product slugs only</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                Hand-picked product slugs (optional — one per line)
                <textarea
                  name="slugs"
                  rows={4}
                  defaultValue={(cfg.slugs ?? []).join("\n")}
                  dir="ltr"
                  placeholder={"misk-al-ghazaal-abukhalid-50ml\ndukhoonak-big-boss\nnoorjes-imagine\nclassic-oud"}
                  className={`${field} font-mono text-[13px]`}
                />
              </label>
              <div className="md:col-span-2">
                <label className="block">
                  Featured Accord / Note Slugs (optional — one per line; leave empty to show top 6 from{" "}
                  <Link href="/admin/notes" className="underline">
                    /admin/notes
                  </Link>
                  )
                  <textarea
                    name="note_slugs"
                    rows={4}
                    defaultValue={(cfg.noteSlugs ?? []).join("\n")}
                    dir="ltr"
                    placeholder={"oud\nmusk\nrose\namber\nbakhoor-smoke\ncitrus"}
                    className={`${field} font-mono text-[13px]`}
                  />
                </label>
                {notes && notes.length > 0 && (
                  <p className="mt-1.5 text-xs text-ink/60">
                    Available note slugs in your DB:{" "}
                    {notes.map((n: { slug: string }) => n.slug).join(", ")}
                  </p>
                )}
              </div>
            </>
          )}

          {s.kind === "products_carousel" && (
            <>
              <label className="block">
                Source
                <select name="mode" defaultValue={cfg.mode ?? "collection"} className={field}>
                  <option value="collection">Ranked collection (auto order)</option>
                  <option value="manual">Hand-picked slugs (my exact order)</option>
                </select>
              </label>
              <label className="block">
                Collection
                <select
                  name="collection"
                  defaultValue={cfg.collection ?? "best-sellers"}
                  className={field}
                >
                  {((collections as { slug: string; title: string }[] | null) ?? []).map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
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
              <label className="block">
                Max pieces
                <input
                  name="limit"
                  type="number"
                  min={1}
                  max={24}
                  defaultValue={cfg.limit ?? 8}
                  className={field}
                />
              </label>
            </>
          )}

          {(s.kind === "collections_grid" || s.kind === "blog_grid") && (
            <label className="block">
              Max cards
              <input
                name="limit"
                type="number"
                min={1}
                max={24}
                defaultValue={cfg.limit ?? 6}
                className={field}
              />
            </label>
          )}

          {s.kind === "brand_split" && (
            <>
              <div className="border border-gold/30 bg-gold-wash/40 p-4 text-xs text-ink md:col-span-2">
                Individual World cards (images, titles, subtitles, links, and adding new cards) are managed in{" "}
                <Link href="/admin/banners" className="font-semibold underline">
                  /admin/banners (slot: brand)
                </Link>
                . Below you can customize the section heading and top-right link.
              </div>
              <label className="block">
                Top-Right Link Label (EN)
                <input
                  name="cfg_cta"
                  defaultValue={cfg.cta ?? ""}
                  placeholder="Explore All Collections"
                  className={field}
                />
              </label>
              <label className="block">
                Top-Right Link Label (AR)
                <input
                  name="cfg_cta_ar"
                  defaultValue={cfg.ctaAr ?? ""}
                  placeholder="استكشف جميع المجموعات"
                  className={field}
                />
              </label>
              <label className="block md:col-span-2">
                Top-Right Link URL
                <input
                  name="href"
                  defaultValue={cfg.href ?? ""}
                  dir="ltr"
                  placeholder="/collections"
                  className={field}
                />
              </label>
            </>
          )}

          {(s.kind === "image_banner" || s.kind === "parallax_cta") && (
            <>
              <div className="md:col-span-2">
                <p className="mb-1 text-sm font-medium">Banner Artwork</p>
                {cfg.src && (
                  <img
                    src={cfg.src}
                    alt=""
                    className="mb-2 h-36 w-full border border-ink/10 bg-sand object-cover"
                  />
                )}
                <ImageUploader bucket="banners" prefix="home-banner" onUploaded={() => {}} />
                <p className="mt-1 text-xs text-ink/50">
                  Upload, then paste the printed URL into Image URL below.
                </p>
              </div>
              <label className="block md:col-span-2">
                Image URL
                <input name="src" defaultValue={cfg.src ?? ""} dir="ltr" className={field} />
              </label>
              <label className="block">
                Caption (image_banner)
                <input name="cfg_title" defaultValue={cfg.title ?? ""} className={field} />
              </label>
              <label className="block">
                Button (EN)
                <input name="cfg_cta" defaultValue={cfg.cta ?? ""} className={field} />
              </label>
              <label className="block">
                Button (AR)
                <input name="cfg_cta_ar" defaultValue={cfg.ctaAr ?? ""} className={field} />
              </label>
              <label className="block">
                Link
                <input
                  name="href"
                  defaultValue={cfg.href ?? ""}
                  dir="ltr"
                  placeholder="/collection/…"
                  className={field}
                />
              </label>
            </>
          )}

          {s.kind === "story" && (
            <>
              <label className="block md:col-span-2">
                Story Paragraph (EN)
                <textarea name="desc" rows={3} defaultValue={cfg.desc ?? ""} className={field} />
              </label>
              <label className="block md:col-span-2">
                Story Paragraph (AR)
                <textarea
                  name="desc_ar"
                  rows={3}
                  defaultValue={cfg.descAr ?? ""}
                  className={field}
                />
              </label>
              <label className="block">
                Primary Image URL
                <input
                  name="src"
                  defaultValue={cfg.src ?? ""}
                  dir="ltr"
                  placeholder="/banners/brand-maison-boutique.jpg"
                  className={field}
                />
              </label>
              <label className="block">
                Secondary Overlapping Image URL
                <input
                  name="secondary_src"
                  defaultValue={cfg.secondarySrc ?? ""}
                  dir="ltr"
                  placeholder="/banners/hero-misk-signature.jpg"
                  className={field}
                />
              </label>
              <label className="block">
                Corner Badge (EN)
                <input
                  name="badge"
                  defaultValue={cfg.badge ?? ""}
                  placeholder="DUBAI & AJMAN · UAE"
                  className={field}
                />
              </label>
              <label className="block">
                Corner Badge (AR)
                <input name="badge_ar" defaultValue={cfg.badgeAr ?? ""} className={field} />
              </label>
              <label className="block">
                Primary Button (EN)
                <input name="cfg_cta" defaultValue={cfg.cta ?? ""} className={field} />
              </label>
              <label className="block">
                Primary Button (AR)
                <input name="cfg_cta_ar" defaultValue={cfg.ctaAr ?? ""} className={field} />
              </label>
              <label className="block md:col-span-2">
                Primary Button Link
                <input
                  name="href"
                  defaultValue={cfg.href ?? ""}
                  dir="ltr"
                  placeholder="/pages/about"
                  className={field}
                />
              </label>
            </>
          )}

          {s.kind === "dual_feature" && (
            <>
              <div className="border-t border-ink/10 pt-3 md:col-span-2">
                <p className="font-display text-lg">Left Card (I · La Maison)</p>
              </div>
              <label className="block">
                Left Eyebrow (EN)
                <input name="left_eyebrow" defaultValue={cfg.leftEyebrow ?? ""} className={field} />
              </label>
              <label className="block">
                Left Eyebrow (AR)
                <input
                  name="left_eyebrow_ar"
                  defaultValue={cfg.leftEyebrowAr ?? ""}
                  className={field}
                />
              </label>
              <label className="block">
                Left Title (EN)
                <input name="left_title" defaultValue={cfg.leftTitle ?? ""} className={field} />
              </label>
              <label className="block">
                Left Title (AR)
                <input
                  name="left_title_ar"
                  defaultValue={cfg.leftTitleAr ?? ""}
                  className={field}
                />
              </label>
              <label className="block">
                Left CTA (EN)
                <input name="left_cta" defaultValue={cfg.leftCta ?? ""} className={field} />
              </label>
              <label className="block">
                Left CTA (AR)
                <input name="left_cta_ar" defaultValue={cfg.leftCtaAr ?? ""} className={field} />
              </label>
              <label className="block">
                Left Link
                <input
                  name="left_href"
                  defaultValue={cfg.leftHref ?? ""}
                  dir="ltr"
                  className={field}
                />
              </label>
              <label className="block">
                Left Image URL
                <input
                  name="left_src"
                  defaultValue={cfg.leftSrc ?? ""}
                  dir="ltr"
                  className={field}
                />
              </label>

              <div className="border-t border-ink/10 pt-3 md:col-span-2">
                <p className="font-display text-lg">Right Card (II · L&apos;Atelier)</p>
              </div>
              <label className="block">
                Right Eyebrow (EN)
                <input
                  name="right_eyebrow"
                  defaultValue={cfg.rightEyebrow ?? ""}
                  className={field}
                />
              </label>
              <label className="block">
                Right Eyebrow (AR)
                <input
                  name="right_eyebrow_ar"
                  defaultValue={cfg.rightEyebrowAr ?? ""}
                  className={field}
                />
              </label>
              <label className="block">
                Right Title (EN)
                <input name="right_title" defaultValue={cfg.rightTitle ?? ""} className={field} />
              </label>
              <label className="block">
                Right Title (AR)
                <input
                  name="right_title_ar"
                  defaultValue={cfg.rightTitleAr ?? ""}
                  className={field}
                />
              </label>
              <label className="block">
                Right CTA (EN)
                <input name="right_cta" defaultValue={cfg.rightCta ?? ""} className={field} />
              </label>
              <label className="block">
                Right CTA (AR)
                <input name="right_cta_ar" defaultValue={cfg.rightCtaAr ?? ""} className={field} />
              </label>
              <label className="block">
                Right Link
                <input
                  name="right_href"
                  defaultValue={cfg.rightHref ?? ""}
                  dir="ltr"
                  className={field}
                />
              </label>
              <label className="block">
                Right Image URL
                <input
                  name="right_src"
                  defaultValue={cfg.rightSrc ?? ""}
                  dir="ltr"
                  className={field}
                />
              </label>
            </>
          )}

          <SaveButton className="md:col-span-2">Save section</SaveButton>
        </AdminForm>
      </div>
    </>
  );
}
