import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
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
  if (slug) {
    revalidatePath(`/product/${slug}`, "page");
    revalidatePath(`/ar/product/${slug}`, "page");
  }
  revalidatePath("/", "page");
  revalidatePath("/ar", "page");
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
  await touchStorefront(supabase, productId);
}

async function touchStorefront(supabase: Awaited<ReturnType<typeof createClient>>, productId: string) {
  const { data } = await supabase.from("products").select("slug").eq("id", productId).single();
  const slug = (data as { slug?: string } | null)?.slug;
  if (!slug) return;
  revalidatePath(`/product/${slug}`, "page");
  revalidatePath(`/ar/product/${slug}`, "page");
  revalidatePath("/", "page");
  revalidatePath("/ar", "page");
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
  await touchStorefront(supabase, productId);
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
  await touchStorefront(supabase, productId);
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
  if (dslug) {
    revalidatePath(`/product/${dslug}`, "page");
    revalidatePath(`/ar/product/${dslug}`, "page");
  }
  revalidatePath("/", "page");
  revalidatePath("/ar", "page");
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
  const [{ data: lineups }, { data: rituals }, { data: allNotes }, { data: assigned }] = await Promise.all([
    supabase.from("lineups").select("id, title").order("sort"),
    supabase.from("rituals").select("id, title").order("title"),
    supabase.from("notes").select("id, name, color").order("name"),
    supabase.from("product_notes").select("note_id, kind, position").eq("product_id", id),
  ]);
  const assignedMap = new Map(
    (((assigned as { note_id: string; kind: string; position: number }[] | null) ?? [])).map((a) => [a.note_id, a]),
  );

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">
              <Link href="/admin/products" className="link-underline">Products</Link> / {p.slug}
            </p>
            <h1 className="font-display text-3xl">{p.title}</h1>
          </div>
          <form action={moveToBin}>
            <input type="hidden" name="id" value={p.id} />
            <ActionButton danger>Delete</ActionButton>
          </form>
        </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <AdminForm action={saveProduct} success="Details saved" className="space-y-3 border border-ink/10 bg-white p-6">
          <input type="hidden" name="id" value={p.id} />
          <h2 className="font-display text-xl">Details</h2>
          <label className="block text-sm">Title (EN)<input name="title" defaultValue={p.title} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block text-sm">Title (AR transliteration)<input name="title_ar" defaultValue={p.title_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Price AED<input name="price" type="number" step="0.01" defaultValue={p.price} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
            <label className="block text-sm">Compare-at<input name="compare_at" type="number" step="0.01" defaultValue={p.compare_at ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          </div>
          <label className="block text-sm">Short about (PDP About block)<textarea name="short_desc" rows={2} defaultValue={p.short_desc ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block text-sm">Short about AR<textarea name="short_desc_ar" rows={2} defaultValue={p.short_desc_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Lineup
              <select name="lineup_id" defaultValue={p.lineup_id ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2">
                <option value="">— none —</option>
                {((lineups as { id: string; title: string }[] | null) ?? []).map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">How-to-use guide
              <select name="ritual_id" defaultValue={p.ritual_id ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2">
                <option value="">— none —</option>
                {((rituals as { id: string; title: string }[] | null) ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 border border-gold/50 bg-gold-wash/60 px-3 py-1.5"><input type="checkbox" name="is_active" defaultChecked={p.is_active ?? true} /> Visible on store</label>
            <label><input type="checkbox" name="featured" defaultChecked={p.featured} /> Featured</label>
            <label><input type="checkbox" name="is_new" defaultChecked={p.is_new} /> New</label>
            <label><input type="checkbox" name="is_best_seller" defaultChecked={p.is_best_seller} /> Best seller</label>
          </div>
          <SaveButton className="w-full">Save details</SaveButton>
        </AdminForm>

        <div className="grid gap-4 md:grid-cols-2">
          <NotesArtworkField
            productId={p.id}
            slug={p.slug}
            field="notes_image_desktop"
            label="Detailed notes artwork — desktop"
            initial={p.notes_image_desktop ?? ""}
            save={saveNotesArtwork}
          />
          <NotesArtworkField
            productId={p.id}
            slug={p.slug}
            field="notes_image_mobile"
            label="Detailed notes artwork — mobile"
            initial={p.notes_image_mobile ?? ""}
            save={saveNotesArtwork}
          />
        </div>

        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-display text-xl">Images (Supabase Storage)</h2>
          <div className="mt-4">
            <ProductImagesEditor productId={p.id} slug={p.slug} initial={p.images ?? []} />
          </div>
        </section>
      </div>

      <section className="mt-6 border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl">Fragrance notes (PDP dots)</h2>
        <p className="mt-1 text-xs text-ink/60">Pick the pyramid per note — position orders dots inside each tier.</p>
        <AdminForm action={saveProductNotes} success="Notes saved" className="mt-4 space-y-2 text-sm">
          <input type="hidden" name="product_id" value={p.id} />
          <input
            type="hidden"
            name="note_ids"
            value={((allNotes as { id: string }[] | null) ?? []).map((n) => n.id).join(",")}
          />
          {((allNotes as { id: string; name: string; color: string }[] | null) ?? []).map((n) => {
            const a = assignedMap.get(n.id);
            return (
              <div key={n.id} className="flex items-center gap-3 border-t border-ink/10 pt-2">
                <span className="size-5 shrink-0 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: n.color }} />
                <span className="w-40 truncate">{n.name}</span>
                <select name={`kind_${n.id}`} defaultValue={a?.kind ?? "none"} className="border border-ink/20 px-2 py-1.5">
                  <option value="none">—</option>
                  <option value="top">Top</option>
                  <option value="heart">Heart</option>
                  <option value="base">Base</option>
                </select>
                <input name={`pos_${n.id}`} type="number" defaultValue={a?.position ?? 0} className="w-20 border border-ink/20 px-2 py-1.5" />
              </div>
            );
          })}
          <SaveButton className="w-full">Save notes</SaveButton>
        </AdminForm>
      </section>

      <section className="mt-6 border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl">Variants + stock</h2>
        <div className="mt-4 space-y-4">
          {(variants ?? []).map((v: { id: string; title: string; price: number; stock: number; sku: string | null }) => (
            <AdminForm key={v.id} action={saveVariant} success="Variant saved" className="grid gap-2 border-t border-ink/10 pt-4 text-sm sm:grid-cols-5">
              <input type="hidden" name="variant_id" value={v.id} />
              <input type="hidden" name="product_id" value={p.id} />
              <input name="v_title" defaultValue={v.title} className="border border-ink/20 px-2 py-1.5" />
              <input name="v_price" type="number" step="0.01" defaultValue={v.price} className="border border-ink/20 px-2 py-1.5" />
              <input name="v_stock" type="number" defaultValue={v.stock} className="border border-ink/20 px-2 py-1.5" />
              <input name="v_sku" defaultValue={v.sku ?? ""} placeholder="SKU" className="border border-ink/20 px-2 py-1.5" />
              <SaveButton className="sm:col-span-5">Save variant</SaveButton>
            </AdminForm>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
