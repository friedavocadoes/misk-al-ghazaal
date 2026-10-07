import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { ProductImagesEditor } from "@/components/admin/product-images-editor";

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
      featured: formData.get("featured") === "on",
      is_new: formData.get("is_new") === "on",
      is_best_seller: formData.get("is_best_seller") === "on",
    })
    .eq("id", id);
  revalidatePath(`/admin/products/${id}`);
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink/10 pb-6">
        <div>
          <p className="eyebrow">
            <Link href="/admin" className="link-underline">Admin</Link> /{" "}
            <Link href="/admin/products" className="link-underline">Products</Link> / {p.slug}
          </p>
          <h1 className="font-display text-3xl">{p.title}</h1>
        </div>
        <SignOutButton />
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <form action={saveProduct} className="space-y-3 border border-ink/10 bg-white p-6">
          <input type="hidden" name="id" value={p.id} />
          <h2 className="font-display text-xl">Details</h2>
          <label className="block text-sm">Title (EN)<input name="title" defaultValue={p.title} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block text-sm">Title (AR transliteration)<input name="title_ar" defaultValue={p.title_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Price AED<input name="price" type="number" step="0.01" defaultValue={p.price} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
            <label className="block text-sm">Compare-at<input name="compare_at" type="number" step="0.01" defaultValue={p.compare_at ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          </div>
          <div className="flex gap-4 text-sm">
            <label><input type="checkbox" name="featured" defaultChecked={p.featured} /> Featured</label>
            <label><input type="checkbox" name="is_new" defaultChecked={p.is_new} /> New</label>
            <label><input type="checkbox" name="is_best_seller" defaultChecked={p.is_best_seller} /> Best seller</label>
          </div>
          <button className="w-full bg-ink px-4 py-2.5 text-sm text-white">Save details</button>
        </form>

        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-display text-xl">Images (Supabase Storage)</h2>
          <div className="mt-4">
            <ProductImagesEditor productId={p.id} slug={p.slug} initial={p.images ?? []} />
          </div>
        </section>
      </div>

      <section className="mt-6 border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl">Variants + stock</h2>
        <div className="mt-4 space-y-4">
          {(variants ?? []).map((v: { id: string; title: string; price: number; stock: number; sku: string | null }) => (
            <form key={v.id} action={saveVariant} className="grid gap-2 border-t border-ink/10 pt-4 text-sm sm:grid-cols-5">
              <input type="hidden" name="variant_id" value={v.id} />
              <input type="hidden" name="product_id" value={p.id} />
              <input name="v_title" defaultValue={v.title} className="border border-ink/20 px-2 py-1.5" />
              <input name="v_price" type="number" step="0.01" defaultValue={v.price} className="border border-ink/20 px-2 py-1.5" />
              <input name="v_stock" type="number" defaultValue={v.stock} className="border border-ink/20 px-2 py-1.5" />
              <input name="v_sku" defaultValue={v.sku ?? ""} placeholder="SKU" className="border border-ink/20 px-2 py-1.5" />
              <button className="bg-ink px-3 py-1.5 text-white sm:col-span-5">Save variant</button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
