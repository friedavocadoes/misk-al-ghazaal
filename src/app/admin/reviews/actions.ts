"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { touchProduct, revalidateProductPaths } from "@/lib/revalidate";
import { logAdmin } from "@/lib/audit";
export async function approveReview(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const admin = await createAdminClient();
  const { data: review } = await admin
    .from("reviews")
    .select("product_id, rating")
    .eq("id", id)
    .single();
  {
    const { error: mutationError } = await admin
      .from("reviews")
      .update({ approved: true })
      .eq("id", id);
    if (mutationError) throw new Error(mutationError.message);
  }
  // Recompute the product aggregate from approved reviews.
  let slug: string | null = null;
  if (review) {
    const pid = (review as { product_id: string }).product_id;
    const { data: prod } = await admin
      .from("products")
      .select("slug")
      .eq("id", pid)
      .single();
    slug = (prod as { slug?: string } | null)?.slug ?? null;
  }
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${String(formData.get("id"))}`);
  if (slug) revalidateProductPaths(slug);
  const rv = review as { product_id: string; rating?: number } | null;
  await logAdmin(admin, s, {
    category: "reviews",
    action: "approve",
    entity: "review",
    entityId: id,
    label: slug ?? id,
    summary: `Approved ${rv?.rating ?? "?"}-star review${slug ? ` on “${slug}”` : ""}`,
    details: {
      review_id: id,
      product_id: rv?.product_id ?? null,
      rating: rv?.rating ?? null,
      slug,
    },
  });
}

export async function deleteReview(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const admin = await createAdminClient();
  const { data: review } = await admin
    .from("reviews")
    .select("product_id, rating")
    .eq("id", String(formData.get("id")))
    .single();
  {
    const { error: mutationError } = await admin
      .from("reviews")
      .delete()
      .eq("id", String(formData.get("id")));
    if (mutationError) throw new Error(mutationError.message);
  }
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${String(formData.get("id"))}`);
  const rv = review as { product_id: string; rating?: number } | null;
  if (review) {
    const { data: prod } = await admin
      .from("products")
      .select("slug")
      .eq("id", (review as { product_id: string }).product_id)
      .single();
    const slug = (prod as { slug?: string } | null)?.slug;
    if (slug) revalidateProductPaths(slug);
    await logAdmin(admin, s, {
      category: "reviews",
      action: "delete",
      entity: "review",
      entityId: String(formData.get("id")),
      label: slug ?? String(formData.get("id")),
      summary: `Deleted ${rv?.rating ?? "?"}-star review${slug ? ` on “${slug}”` : ""}`,
      details: {
        review_id: String(formData.get("id")),
        product_id: rv?.product_id ?? null,
        rating: rv?.rating ?? null,
        slug,
      },
    });
  }
  if (formData.get("return_to") === "list") redirect("/admin/reviews");
}

export async function manageRating(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (session?.role !== "super_admin") redirect("/admin/login");
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const pid = String(formData.get("product_id") ?? "");
  const mode = String(formData.get("mode"));
  let error;
  if (mode === "clear")
    ({ error } = await admin
      .from("product_ratings")
      .delete()
      .eq("product_id", pid));
  else if (mode === "delete")
    ({ error } = await admin
      .from("product_ratings")
      .delete()
      .eq("id", id)
      .eq("product_id", pid));
  else {
    const rating = Number(formData.get("rating"));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new Error("Invalid rating");
    ({ error } = await admin
      .from("product_ratings")
      .update({ rating })
      .eq("id", id)
      .eq("product_id", pid));
  }
  if (error) throw error;
  await touchProduct(admin, pid);
  revalidatePath("/admin/reviews");
  await logAdmin(admin, session, {
    category: "reviews",
    action: "update",
    entity: "rating",
    entityId: id || pid,
    label: pid,
    summary: `Rating ${mode}`,
    details: { product_id: pid, mode, rating: formData.get("rating") },
  });
}
