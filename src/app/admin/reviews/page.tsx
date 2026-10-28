import { approveReview, deleteReview, manageRating } from "./actions";
import { AttentionReadState } from "@/components/admin/notifications";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { tab } = await searchParams;
  const pendingOnly = tab !== "all";
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select(
      "id, rating, title, body, approved, created_at, products!inner(title, slug), profiles(email)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (pendingOnly) q = q.eq("approved", false);
  const { data: reviews } = await q;
  const { data: receipts } = reviews?.length
    ? await createAdminClient()
        .from("admin_attention_reads")
        .select("entity_id")
        .eq("staff_id", session.userId)
        .eq("kind", "review")
        .in(
          "entity_id",
          reviews.map((r) => r.id),
        )
    : { data: [] };
  const readIds = new Set((receipts ?? []).map((r) => r.entity_id));
  const { data: ratings, error: ratingError } = await createAdminClient()
    .from("product_ratings")
    .select("id,product_id,user_id,rating,products(title)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <h1 className="font-display text-3xl">Reviews</h1>
        <div className="mt-4 flex gap-2 text-sm">
          <Link
            href="/admin/reviews"
            className={
              pendingOnly
                ? "bg-ink px-4 py-1.5 text-white"
                : "border border-ink/20 px-4 py-1.5"
            }
          >
            Pending
          </Link>
          <Link
            href="/admin/reviews?tab=all"
            className={
              !pendingOnly
                ? "bg-ink px-4 py-1.5 text-white"
                : "border border-ink/20 px-4 py-1.5"
            }
          >
            All
          </Link>
        </div>
        <details className="mt-8 border border-ink/15 bg-white p-5">
          <summary className="cursor-pointer text-xl">Manage ratings</summary>
          <p className="mt-3 text-xs text-fog">
            Latest 200 ratings. Editing changes one vote; clearing removes all
            votes for that product. Written reviews remain separately moderated.
          </p>
          {ratingError && <p>Apply migration_ratings.sql to enable ratings.</p>}
          {ratings?.map((r) => {
            const product = Array.isArray(r.products)
              ? r.products[0]
              : r.products;
            return (
              <AdminForm
                key={r.id}
                action={manageRating}
                className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4 text-sm"
              >
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="product_id" value={r.product_id} />
                <span className="flex-1">
                  {product?.title} · {r.user_id ? "Account" : "Guest"}
                </span>
                <select name="rating" defaultValue={r.rating}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <button name="mode" value="edit" className="underline">
                  Save rating
                </button>
                <button name="mode" value="delete" className="underline">
                  Delete vote
                </button>
                <button
                  name="mode"
                  value="clear"
                  className="text-red-800 underline"
                >
                  Clear product ratings
                </button>
              </AdminForm>
            );
          })}
        </details>
        <ul className="mt-6 space-y-4">
          {(
            (reviews as
              | {
                  id: string;
                  rating: number;
                  title: string | null;
                  body: string | null;
                  approved: boolean;
                  created_at: string;
                  products:
                    | { title: string; slug: string }
                    | { title: string; slug: string }[];
                  profiles: { email: string } | { email: string }[];
                }[]
              | null) ?? []
          ).map((r) => {
            const p = Array.isArray(r.products) ? r.products[0] : r.products;
            const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return (
              <li
                key={r.id}
                className="border border-ink/10 bg-white p-5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-lg">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                  <span className="font-medium">{p?.title}</span>
                  <span className="text-ink/50">
                    {prof?.email} · {new Date(r.created_at).toLocaleString()}
                  </span>
                  <span
                    className={`ms-auto text-xs uppercase tracking-[0.16em] ${r.approved ? "text-[#1e7a46]" : "text-gold"}`}
                  >
                    {r.approved ? "Live" : "Pending"}
                  </span>
                </div>
                <Link
                  href={`/admin/reviews/${r.id}`}
                  className="mt-3 inline-flex text-xs underline underline-offset-4"
                >
                  Open review ↗
                </Link>
                <AttentionReadState
                  key={`${r.id}:${readIds.has(r.id)}`}
                  kind="review"
                  id={r.id}
                  initialRead={readIds.has(r.id)}
                  autoRead={false}
                />
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                {r.body && (
                  <p className="mt-1 leading-relaxed text-ink/80">{r.body}</p>
                )}
                <div className="mt-3 flex gap-2">
                  {!r.approved && (
                    <AdminForm action={approveReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <ActionButton className="border-ink bg-ink !px-4 !py-1.5 text-white hover:bg-ink/85">
                        Approve
                      </ActionButton>
                    </AdminForm>
                  )}
                  <AdminForm action={deleteReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <ActionButton danger className="!px-4 !py-1.5">
                      Delete
                    </ActionButton>
                  </AdminForm>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
