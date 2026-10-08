import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";

async function approveReview(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const admin = await createAdminClient();
  const { data: review } = await admin.from("reviews").select("product_id").eq("id", id).single();
  await admin.from("reviews").update({ approved: true }).eq("id", id);
  // Recompute the product aggregate from approved reviews.
  if (review) {
    const pid = (review as { product_id: string }).product_id;
    const { data: rows } = await admin.from("reviews").select("rating").eq("product_id", pid).eq("approved", true);
    const ratings = ((rows as { rating: number }[] | null) ?? []).map((r) => r.rating);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    await admin.from("products").update({ rating: Math.round(avg * 100) / 100, review_count: ratings.length }).eq("id", pid);
  }
  revalidatePath("/admin/reviews");
}

async function deleteReview(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const admin = await createAdminClient();
  await admin.from("reviews").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/reviews");
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { tab } = await searchParams;
  const pendingOnly = tab !== "all";
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select("id, rating, title, body, approved, created_at, products!inner(title, slug), profiles!inner(email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (pendingOnly) q = q.eq("approved", false);
  const { data: reviews } = await q;

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl">Reviews</h1>
        <div className="mt-4 flex gap-2 text-sm">
          <a href="/admin/reviews" className={pendingOnly ? "bg-ink px-4 py-1.5 text-white" : "border border-ink/20 px-4 py-1.5"}>Pending</a>
          <a href="/admin/reviews?tab=all" className={!pendingOnly ? "bg-ink px-4 py-1.5 text-white" : "border border-ink/20 px-4 py-1.5"}>All</a>
        </div>
        <ul className="mt-6 space-y-4">
          {((reviews as {
            id: string; rating: number; title: string | null; body: string | null; approved: boolean; created_at: string;
            products: { title: string; slug: string } | { title: string; slug: string }[];
            profiles: { email: string } | { email: string }[];
          }[] | null) ?? []).map((r) => {
            const p = Array.isArray(r.products) ? r.products[0] : r.products;
            const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return (
              <li key={r.id} className="border border-ink/10 bg-white p-5 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-lg">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="font-medium">{p?.title}</span>
                  <span className="text-ink/50">{prof?.email} · {new Date(r.created_at).toLocaleString()}</span>
                  <span className={`ms-auto text-xs uppercase tracking-[0.16em] ${r.approved ? "text-[#1e7a46]" : "text-gold"}`}>
                    {r.approved ? "Live" : "Pending"}
                  </span>
                </div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                {r.body && <p className="mt-1 leading-relaxed text-ink/80">{r.body}</p>}
                <div className="mt-3 flex gap-2">
                  {!r.approved && (
                    <form action={approveReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="bg-ink px-4 py-1.5 text-white">Approve</button>
                    </form>
                  )}
                  <form action={deleteReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="border border-[#9c2b2e]/40 px-4 py-1.5 text-[#9c2b2e]">Delete</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
