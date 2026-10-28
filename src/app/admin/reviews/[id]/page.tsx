import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { uuid } from "@/lib/analytics/shared";
import { adminDate } from "@/lib/admin-customer";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPanel } from "@/components/admin/workspace";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { AttentionReadState } from "@/components/admin/notifications";
import { approveReview, deleteReview } from "../actions";
export default async function ReviewDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await getAdminSession();
  if (!staff) redirect("/admin/login");
  if (staff.role !== "super_admin") redirect("/admin/orders");
  const { id } = await params;
  if (!uuid(id)) notFound();
  const db = createAdminClient();
  const [{ data: review, error }, { data: receipt }] = await Promise.all([
    db
      .from("reviews")
      .select(
        "id,user_id,rating,title,body,approved,created_at,products(title,slug),profiles(full_name,email)",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("admin_attention_reads")
      .select("read_at")
      .eq("staff_id", staff.userId)
      .eq("kind", "review")
      .eq("entity_id", id)
      .maybeSingle(),
  ]);
  if (error) throw new Error("Review could not load.");
  if (!review) notFound();
  const product = Array.isArray(review.products)
      ? review.products[0]
      : review.products,
    customer = Array.isArray(review.profiles)
      ? review.profiles[0]
      : review.profiles;
  return (
    <>
      <AdminNav email={staff.email} role={staff.role} />
      <main className="admin-workspace">
        <Link href="/admin/reviews" className="text-xs text-fog">
          ← All reviews
        </Link>
        <div className="admin-workspace-header mt-6">
          <div>
            <p className="eyebrow">Customer voice</p>
            <h1>{product?.title || "Product review"}</h1>
            <p>
              {adminDate(review.created_at)} ·{" "}
              {review.approved ? "Approved" : "Awaiting approval"}
            </p>
          </div>
          <AttentionReadState kind="review" id={id} initialRead={!!receipt} />
        </div>
        <AdminPanel
          title={review.title || "Their impression"}
          detail={`${review.rating} / 5 stars`}
        >
          <p className="mb-5 text-sm text-gold">
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-8">
            {review.body || "Rating without written feedback."}
          </p>
          <div className="mt-6 border-t border-ink/10 pt-5 text-xs text-fog">
            <Link href={`/admin/users/${review.user_id}`} className="underline">
              {customer?.full_name || customer?.email || "Customer"}
            </Link>
            {product?.slug && (
              <Link
                href={`/product/${product.slug}`}
                target="_blank"
                className="ml-5 underline"
              >
                View product ↗
              </Link>
            )}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {!review.approved && (
              <AdminForm action={approveReview} success="Review approved">
                <input type="hidden" name="id" value={id} />
                <ActionButton>Approve review</ActionButton>
              </AdminForm>
            )}
            <AdminForm action={deleteReview} success="Review deleted">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="return_to" value="list" />
              <ActionButton danger>Delete review</ActionButton>
            </AdminForm>
          </div>
        </AdminPanel>
      </main>
    </>
  );
}
