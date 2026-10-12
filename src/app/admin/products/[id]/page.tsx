import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import {
  productsBucketPath,
  revalidateCollectionPaths,
  revalidateHome,
  revalidateProductPaths,
  touchProduct,
} from "@/lib/revalidate";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { ProductImagesEditor } from "@/components/admin/product-images-editor";
import { NotesArtworkField } from "@/components/admin/notes-artwork-field";

async function saveProduct(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("products")
    .update({
      title: String(formData.get("title")),
      title_ar: String(formData.get("title_ar") || "") || null,
      price: Number(formData.get("price")),
      compare_at: formData.get("compare_at") ? Number(formData.get("compare_at")) : null,
      sort: Math.trunc(Number(formData.get("sort") || 0)),
      short_desc: String(formData.get("short_desc") || "") || "",
      short_desc_ar: String(formData.get("short_desc_ar") || "") || null,
      lineup_id: String(formData.get("lineup_id") || "") || null,
      ritual_id: String(formData.get("ritual_id") || "") || null,
      featured: formData.get("featured") === "on",
      is_new: formData.get("is_new") === "on",
      is_best_seller: formData.get("is_best_seller") === "on",
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);
  const { data: prod } = await supabase.from("products").select("slug").eq("id", id).single();
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  // PDP + listings now, no rebuild.
  const slug = (prod as { slug?: string } | null)?.slug;
  if (slug) revalidateProductPaths(slug);
  const { data: links } = await supabase
    .from("product_collections")
    .select("collection_id")
    .eq("product_id", id);
  const ids = (((links as { collection_id: string }[] | null) ?? []).map((r) => r.collection_id));
  if (ids.length) {
    const { data: cols } = await supabase.from("collections").select("slug").in("id", ids);
    revalidateCollectionPaths((((cols as { slug: string }[] | null) ?? []).map((c) => c.slug)));
  }
  revalidateHome();
}

async function saveVariant(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("variant_id"));
  const productId = String(formData.get("product_id"));
  const supabase = await createClient();
  await supabase
    .from("variants")
    .update({
      title: String(formData.get("v_title")),
      price: Number(formData.get("v_price")),
      stock: Number(formData.get("v_stock")),
      sku: String(formData.get("v_sku") || "") || null,
    })
    .eq("id", id);
  revalidatePath(`/admin/products/${productId}`);
  await touchProduct(supabase, productId);
}

async function saveProductNotes(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const productId = String(formData.get("product_id"));
  const supabase = await createClient();
  // Idempotent wholesale rebuild: upsert every row (double-clicks and
  // re-saves converge instead of racing a delete + insert).
  const ids = String(formData.get("note_ids") || "").split(",").filter(Boolean);
  const rows = ids
    .map((noteId) => ({
      product_id: productId,
      note_id: noteId,
      kind: String(formData.get(`kind_${noteId}`) || "none"),
      position: Number(formData.get(`pos_${noteId}`) || 0),
    }))
    .filter((r) => r.kind === "top" || r.kind === "heart" || r.kind === "base");
  const keep = new Set(rows.map((r) => r.note_id));
  // Remove anything switched back to "—" first…
  const { data: current } = await supabase.from("product_notes").select("note_id").eq("product_id", productId);
  const stale = (((current as { note_id: string }[] | null) ?? []).map((r) => r.note_id)).filter((id) => !keep.has(id));
  if (stale.length) await supabase.from("product_notes").delete().eq("product_id", productId).in("note_id", stale);
  // …then upsert the rest (insert-or-update atomically per row).
  if (rows.length) {
    const { error } = await supabase.from("product_notes").upsert(rows, { onConflict: "product_id,note_id" });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/products/${productId}`);
  await touchProduct(supabase, productId);
}

async function saveProductCollections(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const productId = String(formData.get("product_id"));
  const supabase = await createClient();
  const keep = new Set(formData.getAll("collections").map(String).filter(Boolean));
  const { data: current } = await supabase.from("product_collections").select("collection_id").eq("product_id", productId);
  const have = new Set(((current as { collection_id: string }[] | null) ?? []).map((r) => r.collection_id));
  const drop = [...have].filter((id) => !keep.has(id));
  const add = [...keep].filter((id) => !have.has(id));
  if (drop.length) await supabase.from("product_collections").delete().eq("product_id", productId).in("collection_id", drop);
  if (add.length) {
    await supabase
      .from("product_collections")
      .insert(add.map((collection_id) => ({ product_id: productId, collection_id })));
  }
  revalidatePath(`/admin/products/${productId}`);
  await touchProduct(supabase, productId);
}

async function saveNotesArtwork(productId: string, field: string, url: string) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  if (field !== "notes_image_desktop" && field !== "notes_image_mobile") throw new Error("Bad field");
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ [field]: url }).eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
  await touchProduct(supabase, productId);
}

/** Gallery save: the editor uploads bytes straight to Storage from the
    browser, but the `images` array is persisted HERE so the DB write and
    the storefront revalidation can never drift apart (a failed revalidate
    after a browser-direct write is what left production PDPs stale).
    Removed files are purged from the bucket best-effort so orphans don't
    pile up — local `/products/*` fallbacks never match and are untouched. */
async function saveGallery(productId: string, images: string[]) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data: current } = await supabase.from("products").select("images").eq("id", productId).single();
  const before = new Set(((current as { images?: string[] } | null)?.images ?? []));
  const { error } = await supabase.from("products").update({ images }).eq("id", productId);
  if (error) throw new Error(error.message);
  const orphans = [...before]
    .filter((u) => !images.includes(u))
    .map(productsBucketPath)
    .filter((p): p is string => !!p);
  if (orphans.length) {
    try {
      await supabase.storage.from("products").remove(orphans);
    } catch {
      /* orphan cleanup never fails the save */
    }
  }
  revalidatePath(`/admin/products/${productId}`);
  await touchProduct(supabase, productId);
}

async function moveToBin(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: doomed } = await supabase.from("products").select("slug").eq("id", id).single();
  await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/products");
  const dslug = (doomed as { slug?: string } | null)?.slug;
  if (dslug) revalidateProductPaths(dslug);
  revalidateHome();
  redirect("/admin/products");
}

export default async function ProductDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("products").select("*").eq("id", id).single();
  if (!p) redirect("/admin/products");
  const { data: variants } = await supabase
    .from("variants")
    .select("*")
    .eq("product_id", id)
    .order("title");
  const [{ data: lineups }, { data: rituals }, { data: allNotes }, { data: assigned }, { data: collections }, { data: prodColls }] = await Promise.all([
    supabase.from("lineups").select("id, title").order("sort"),
    supabase.from("rituals").select("id, title").order("title"),
    supabase.from("notes").select("id, name, color").order("name"),
    supabase.from("product_notes").select("note_id, kind, position").eq("product_id", id),
    supabase.from("collections").select("id, title").is("deleted_at", null).order("sort"),
    supabase.from("product_collections").select("collection_id").eq("product_id", id),
  ]);
  const assignedMap = new Map(
    (((assigned as { note_id: string; kind: string; position: number }[] | null) ?? [])).map((a) => [a.note_id, a]),
  );
  const inCollections = new Set(
    (((prodColls as { collection_id: string }[] | null) ?? [])).map((r) => r.collection_id),
  );

  const visible = p.is_active ?? true;
  const sectionCls = "scroll-mt-24 border border-ink/10 bg-white p-6 md:p-8";
  const sectionHead = (n: string, title: string, hint?: string) => (
    <div className="mb-5 flex items-baseline gap-3">
      <span className="font-display text-lg italic text-gold">{n}</span>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {hint && <span className="ms-auto hidden text-xs text-ink/50 md:block">{hint}</span>}
    </div>
  );

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header: breadcrumb + title + live status + store link + delete */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-6">
          <div className="min-w-0">
            <p className="eyebrow">
              <Link href="/admin/products" className="link-underline">Products</Link> / {p.slug}
            </p>
            <h1 className="mt-1 truncate font-display text-3xl md:text-4xl">{p.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${visible ? "border-[#1e7a46]/40 bg-[#1e7a46]/[0.07] text-[#1e7a46]" : "border-gold/50 bg-gold-wash/60 text-gold"}`}>
                {visible ? "Live on store" : "Paused"}
              </span>
              {p.featured && <span className="border border-ink/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso">Featured</span>}
              {p.is_new && <span className="border border-ink/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso">New</span>}
              {p.is_best_seller && <span className="border border-ink/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso">Best seller</span>}
              <span className="text-xs text-ink/50">{(p.images ?? []).length} images · {(variants ?? []).length} variants</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <a
              href={`/product/${p.slug}`}
              target="_blank"
              rel="noreferrer"
              className="border border-ink/20 bg-white px-4 py-2 text-sm transition hover:border-ink/50"
            >
              View on store
            </a>
            <form action={moveToBin}>
              <input type="hidden" name="id" value={p.id} />
              <ActionButton danger>Delete</ActionButton>
            </form>
          </div>
        </div>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[220px_1fr]">
          {/* Sticky section nav */}
          <nav aria-label="Sections" className="hidden xl:sticky xl:top-24 xl:block">
            <ul className="space-y-1 border-s border-ink/10 ps-4 text-sm">
              {[
                ["details", "01 · Details"],
                ["gallery", "02 · Gallery"],
                ["notes-art", "03 · Notes artwork"],
                ["fragrance", "04 · Fragrance notes"],
                ["collections", "05 · Collections"],
                ["variants", "06 · Variants + stock"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={`#${href}`} className="block py-1.5 text-espresso transition hover:text-gold">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid min-w-0 gap-6">
            {/* 01 — Details */}
            <section id="details" className={sectionCls}>
              {sectionHead("01", "Details", "Title, pricing, copy, lineup, flags")}
              <AdminForm action={saveProduct} success="Details saved" className="grid gap-4 text-sm md:grid-cols-2">
                <input type="hidden" name="id" value={p.id} />
                <label className="block">Title (EN)<input name="title" defaultValue={p.title} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
                <label className="block">Title (AR transliteration)<input name="title_ar" defaultValue={p.title_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
                <label className="block">Price Dhs<input name="price" type="number" step="0.01" defaultValue={p.price} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
                <label className="block">Compare-at<input name="compare_at" type="number" step="0.01" defaultValue={p.compare_at ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
                <label className="block md:col-span-2">Rank weight
                  <input name="sort" type="number" step="1" defaultValue={p.sort ?? 0} className="mt-1 w-full border border-ink/20 px-3 py-2" />
                  <span className="mt-1 block text-xs text-ink/50">0 = automatic (newest first) · negative pins to top · 9999 sinks to bottom · best sellers + sales lift on top</span>
                </label>
                <label className="block md:col-span-2">Short about (PDP About block)<textarea name="short_desc" rows={2} defaultValue={p.short_desc ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
                <label className="block md:col-span-2">Short about AR<textarea name="short_desc_ar" rows={2} defaultValue={p.short_desc_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
                <label className="block">Lineup
                  <select name="lineup_id" defaultValue={p.lineup_id ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2">
                    <option value="">— none —</option>
                    {((lineups as { id: string; title: string }[] | null) ?? []).map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </label>
                <label className="block">How-to-use guide
                  <select name="ritual_id" defaultValue={p.ritual_id ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2">
                    <option value="">— none —</option>
                    {((rituals as { id: string; title: string }[] | null) ?? []).map((r) => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2 border border-gold/50 bg-gold-wash/60 px-3 py-1.5 font-medium"><input type="checkbox" name="is_active" defaultChecked={p.is_active ?? true} className="size-4 accent-[#1c1917]" /> Visible on store</label>
                  <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" name="featured" defaultChecked={p.featured} className="size-4 accent-[#1c1917]" /> Featured</label>
                  <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" name="is_new" defaultChecked={p.is_new} className="size-4 accent-[#1c1917]" /> New</label>
                  <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" name="is_best_seller" defaultChecked={p.is_best_seller} className="size-4 accent-[#1c1917]" /> Best seller</label>
                </div>
                <SaveButton className="md:col-span-2">Save details</SaveButton>
              </AdminForm>
            </section>

            {/* 02 — Gallery */}
            <section id="gallery" className={sectionCls}>
              {sectionHead("02", "Gallery", "Drag-drop · arrows reorder · first is primary")}
              <ProductImagesEditor productId={p.id} slug={p.slug} initial={p.images ?? []} save={saveGallery} />
            </section>

            {/* 03 — Notes artwork */}
            <section id="notes-art" className={sectionCls}>
              {sectionHead("03", "Detailed-notes artwork", "Desktop + mobile pair")}
              <div className="grid gap-4 md:grid-cols-2">
                <NotesArtworkField
                  productId={p.id}
                  slug={p.slug}
                  field="notes_image_desktop"
                  label="Desktop"
                  initial={p.notes_image_desktop ?? ""}
                  save={saveNotesArtwork}
                />
                <NotesArtworkField
                  productId={p.id}
                  slug={p.slug}
                  field="notes_image_mobile"
                  label="Mobile"
                  initial={p.notes_image_mobile ?? ""}
                  save={saveNotesArtwork}
                />
              </div>
            </section>

            {/* 04 — Fragrance notes */}
            <section id="fragrance" className={sectionCls}>
              {sectionHead("04", "Fragrance notes", "Position orders dots inside each tier")}
              <AdminForm action={saveProductNotes} success="Notes saved" className="text-sm">
                <input type="hidden" name="product_id" value={p.id} />
                <input
                  type="hidden"
                  name="note_ids"
                  value={((allNotes as { id: string }[] | null) ?? []).map((n) => n.id).join(",")}
                />
                <div className="grid gap-x-6 md:grid-cols-2">
                  {((allNotes as { id: string; name: string; color: string }[] | null) ?? []).map((n) => {
                    const a = assignedMap.get(n.id);
                    const active = (a?.kind ?? "none") !== "none";
                    return (
                      <div key={n.id} className={`flex items-center gap-3 border-t border-ink/10 py-2.5 ${active ? "" : "opacity-70"}`}>
                        <span className="size-5 shrink-0 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: n.color }} />
                        <span className="w-36 shrink-0 truncate font-medium">{n.name}</span>
                        <select name={`kind_${n.id}`} defaultValue={a?.kind ?? "none"} aria-label={`${n.name} tier`} className="border border-ink/20 bg-white px-2 py-1.5">
                          <option value="none">—</option>
                          <option value="top">Top</option>
                          <option value="heart">Heart</option>
                          <option value="base">Base</option>
                        </select>
                        <input name={`pos_${n.id}`} type="number" defaultValue={a?.position ?? 0} aria-label={`${n.name} position`} className="w-16 border border-ink/20 px-2 py-1.5" />
                      </div>
                    );
                  })}
                </div>
                <SaveButton className="mt-4 w-full">Save notes</SaveButton>
              </AdminForm>
            </section>

            {/* 05 — Collections */}
            <section id="collections" className={sectionCls}>
              {sectionHead("05", "Collections", "Where this product is listed")}
              <AdminForm action={saveProductCollections} success="Collections saved" className="text-sm">
                <input type="hidden" name="product_id" value={p.id} />
                <div className="grid max-h-56 gap-1 overflow-y-auto border border-ink/10 p-3 sm:grid-cols-2">
                  {((collections as { id: string; title: string }[] | null) ?? []).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5 transition hover:bg-sand/60">
                      <input
                        type="checkbox"
                        name="collections"
                        value={c.id}
                        defaultChecked={inCollections.has(c.id)}
                        className="size-4 accent-[#1c1917]"
                      />
                      {c.title}
                    </label>
                  ))}
                </div>
                <SaveButton className="mt-4 w-full">Save collections</SaveButton>
              </AdminForm>
            </section>

            {/* 06 — Variants */}
            <section id="variants" className={sectionCls}>
              {sectionHead("06", "Variants + stock", "Size · price · stock · SKU")}
              <div className="space-y-3">
                {(variants ?? []).map((v: { id: string; title: string; price: number; stock: number; sku: string | null }) => (
                  <AdminForm key={v.id} action={saveVariant} success="Variant saved" className="grid gap-2 border border-ink/10 bg-cream/40 p-3 text-sm sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
                    <input type="hidden" name="variant_id" value={v.id} />
                    <input type="hidden" name="product_id" value={p.id} />
                    <label className="block">Size<input name="v_title" defaultValue={v.title} className="mt-1 w-full border border-ink/20 bg-white px-2 py-1.5" /></label>
                    <label className="block">Price<input name="v_price" type="number" step="0.01" defaultValue={v.price} className="mt-1 w-full border border-ink/20 bg-white px-2 py-1.5" /></label>
                    <label className="block">Stock<input name="v_stock" type="number" defaultValue={v.stock} className="mt-1 w-full border border-ink/20 bg-white px-2 py-1.5" /></label>
                    <label className="block">SKU<input name="v_sku" defaultValue={v.sku ?? ""} placeholder="—" className="mt-1 w-full border border-ink/20 bg-white px-2 py-1.5" /></label>
                    <SaveButton>Save</SaveButton>
                  </AdminForm>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
