import { CONCENTRATIONS, variantLabel } from "@/lib/product-options";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateHome, revalidateProductPaths } from "@/lib/revalidate";
import { logAdmin } from "@/lib/audit";
import { AdminNav } from "@/components/admin/admin-nav";
import { ProductCreateForm } from "@/components/admin/product-create-form";

async function createProduct(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const title = String(formData.get("title") ?? "").trim();
  if (!slug || !title) return { ok: false, error: "Title and slug are required." };
  const price = Number(formData.get("price") || 0);
  if (!(price > 0)) return { ok: false, error: "Price must be above zero." };

  const concentration=String(formData.get("concentration")||"");
  const capacity=formData.get("capacity_ml")?Number(formData.get("capacity_ml")):null;
  const vPrice=Number(formData.get("v_price")||price),stock=Number(formData.get("v_stock")||0);
  if((concentration&&!CONCENTRATIONS.some(c=>c===concentration)) || (concentration&&!capacity) || (capacity!==null && (!Number.isFinite(capacity)||capacity<=0)) || !Number.isFinite(vPrice)||vPrice<=0||!Number.isSafeInteger(stock)||stock<0)return {ok:false,error:"Check concentration, capacity, price and stock."};
  const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
  if (existing) return { ok: false, error: "That slug is already taken." };

  let images: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("images") || "[]")) as unknown;
    if (Array.isArray(parsed)) images = parsed.filter((u): u is string => typeof u === "string").slice(0, 12);
  } catch {
    images = [];
  }

  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      slug,
      title,
      title_ar: String(formData.get("title_ar") || "") || null,
      price:vPrice,
      bestseller_mode:formData.get("is_best_seller")==="on"?"pinned":"auto",
      compare_at: formData.get("compare_at") ? Number(formData.get("compare_at")) : null,
      images,
      is_active: formData.get("is_active") === "on",
      featured: formData.get("featured") === "on",
      is_new: formData.get("is_new") === "on",
      is_best_seller: formData.get("is_best_seller") === "on",
      lineup_id: String(formData.get("lineup_id") || "") || null,
      ritual_id: String(formData.get("ritual_id") || "") || null,
    })
    .select("id")
    .single();
  if (pErr || !product) return { ok: false, error: pErr?.message ?? "Insert failed." };
  const productId = (product as { id: string }).id;

  const {error:vErr}=await supabase.from("variants").insert({
    product_id: productId,
    title: variantLabel(concentration,capacity,String(formData.get("v_title")||"")),
    concentration:concentration||null,capacity_ml:capacity,
    price: vPrice > 0 ? vPrice : price,
    stock,
    sku: String(formData.get("v_sku") || "") || null,
  });

  if(vErr){await supabase.from("products").delete().eq("id",productId);return {ok:false,error:vErr.message};}
  const collIds = formData.getAll("collections").map(String).filter(Boolean);
  if (collIds.length) {
    await supabase
      .from("product_collections")
      .insert(collIds.map((collection_id) => ({ product_id: productId, collection_id })));
  }

  revalidatePath("/admin/products");
  revalidateProductPaths(slug);
  revalidateHome();
  await logAdmin(supabase, s, {
    category: "products",
    action: "create",
    entity: "product",
    entityId: productId,
    label: slug,
    summary: `Created product “${title}” (/${slug})`,
    details: { slug, title, price, collections: collIds.length, variant: true },
  });
  return { ok: true, id: productId };
}

export default async function NewProductPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const [{ data: lineups }, { data: rituals }, { data: collections }] = await Promise.all([
    supabase.from("lineups").select("id,title").order("sort"),
    supabase.from("rituals").select("id,title").order("title"),
    supabase.from("collections").select("id,title").is("deleted_at", null).order("sort"),
  ]);

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="eyebrow">
          <Link href="/admin/products" className="link-underline">Products</Link> / new
        </p>
        <h1 className="font-display text-3xl">New product</h1>
        <ProductCreateForm
          lists={{
            lineups: (lineups as { id: string; title: string }[] | null) ?? [],
            rituals: (rituals as { id: string; title: string }[] | null) ?? [],
            collections: (collections as { id: string; title: string }[] | null) ?? [],
          }}
          create={createProduct}
        />
      </div>
    </>
  );
}
