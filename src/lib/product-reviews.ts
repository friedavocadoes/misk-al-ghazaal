import "server-only";
import { createPublicClient } from "./supabase/public";
import { createAdminClient } from "./supabase/service";
import type { Review } from "./types";

/** Public reviews must never depend on a shopper being able to read profiles. */
export async function readApprovedReviews(productId: string, limit: number): Promise<Review[]> {
  const publicDb = createPublicClient();
  const { data, error } = await publicDb.from("reviews")
    .select("id, product_id, user_id, rating, title, body, approved, created_at")
    .eq("product_id", productId).eq("approved", true)
    .order("created_at", { ascending: false }).limit(Math.min(200, Math.max(1, limit)));
  if (error) throw new Error("Unable to load approved reviews", { cause: error });
  if (!data?.length) return [];
  const reviews: Review[] = data.map(r => ({
    id: r.id, productId: r.product_id, userId: r.user_id,
    rating: r.rating, title: r.title || undefined, body: r.body || undefined,
    approved: true, createdAt: r.created_at,
  }));

  // Only enrich authors of already-public reviews. Never return email,
  // order identifiers, address or other private profile/order fields.
  try {
    const admin = createAdminClient();
    const ids = [...new Set(data.map(r => r.user_id).filter(Boolean))];
    const [profiles, product] = await Promise.all([
      admin.from("profiles").select("id, full_name, avatar_url").in("id", ids),
      admin.from("products").select("slug").eq("id", productId).maybeSingle(),
    ]);
    const authors = new Map((profiles.data ?? []).map(p => [p.id, p]));
    const purchases = product.data ? await admin.from("orders")
      .select("user_id, created_at, order_items!inner(product_slug)")
      .in("user_id", ids).eq("status", "delivered")
      .eq("order_items.product_slug", product.data.slug)
      .order("created_at", { ascending: true }) : { data: [] };
    return reviews.map(review => {
      const author = authors.get(review.userId);
      // A purchase made after the review does not verify that review.
      const purchase = purchases.data?.find(p =>
        p.user_id === review.userId && p.created_at <= review.createdAt);
      return {
        ...review,
        authorName: author?.full_name?.trim() || undefined,
        authorAvatar: author?.avatar_url || undefined,
        purchasedAt: purchase?.created_at,
      };
    });
  } catch {
    // Missing optional metadata must never hide an approved review.
    return reviews;
  }
}
