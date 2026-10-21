import Link from "next/link";
import { DeleteCoupon } from "@/components/admin/delete-coupon";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { COUPON_ICONS } from "@/components/ui/coupon-icons";
import { logAdmin } from "@/lib/audit";

async function saveCoupon(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const rawLimit = String(formData.get("usage_limit") ?? "").trim();
  const usageLimit = rawLimit ? Number(rawLimit) : null;
  if (usageLimit !== null && (!Number.isSafeInteger(usageLimit) || usageLimit < 1)) throw new Error("Uses per account must be a positive whole number, or blank for unlimited.");
  const supabase = await createClient();
  const { data: before } = await supabase.from("coupons").select("code").eq("id", id).single();
  const code = (before as { code?: string } | null)?.code ?? id;
  await supabase
    .from("coupons")
    .update({
      kind: String(formData.get("kind")),
      amount: Number(formData.get("amount") || 0),
      min_subtotal: Number(formData.get("min_subtotal") || 0),
      max_discount: formData.get("max_discount") ? Number(formData.get("max_discount")) : null,
      once_per_account: false,
      first_order_only: formData.get("first_order_only") === "on",
      active: formData.get("active") === "on",
      starts_at: String(formData.get("starts_at") || "") || null,
      ends_at: String(formData.get("ends_at") || "") || null,
      usage_limit: usageLimit,
      icon: String(formData.get("icon") || "tag"),
      gift_title: String(formData.get("gift_title") || "") || "",
      gift_title_ar: String(formData.get("gift_title_ar") || "") || null,
      is_public: formData.get("is_public") === "on",
    })
    .eq("id", id);
  await logAdmin(supabase, s, {
    category: "coupons",
    action: "update",
    entity: "coupon",
    entityId: id,
    label: code,
    summary: `Updated coupon ${code}`,
    details: {
      kind: String(formData.get("kind")),
      amount: Number(formData.get("amount") || 0),
      min_subtotal: Number(formData.get("min_subtotal") || 0),
      max_discount: formData.get("max_discount") ? Number(formData.get("max_discount")) : null,
      once_per_account: false,
      first_order_only: formData.get("first_order_only") === "on",
      active: formData.get("active") === "on",
      is_public: formData.get("is_public") === "on",
    },
  });
  revalidatePath(`/admin/coupons/${id}`);
  revalidatePath("/", "layout");
}

function toLocal(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function CouponDetail(props: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("coupons").select("*").eq("id", id).single();
  if (!c) redirect("/admin/coupons");

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">
          <Link href="/admin/coupons" className="link-underline">Coupons</Link> / <span className="font-mono">{c.code}</span>
        </p>
        <h1 className="font-display text-3xl">Edit coupon</h1>
        <AdminForm action={saveCoupon} success="Coupon saved" className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm md:grid-cols-2">
          <input type="hidden" name="id" value={c.id} />
          <label className="block">Kind
            <select name="kind" defaultValue={c.kind} className="mt-1 w-full border border-ink/20 px-3 py-2">
              <option value="percent">% off</option>
              <option value="fixed">AED off</option>
              <option value="free_shipping">Free shipping</option>
              <option value="gift">Free gift</option>
            </select>
          </label>
          <label className="block">Amount<input name="amount" type="number" step="0.01" defaultValue={c.amount} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Min subtotal AED<input name="min_subtotal" type="number" step="0.01" defaultValue={c.min_subtotal} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Max discount AED (blank = ∞)<input name="max_discount" type="number" step="0.01" defaultValue={c.max_discount ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Uses per account (blank = unlimited)<input name="usage_limit" type="number" min="1" step="1" defaultValue={c.once_per_account ? 1 : c.usage_limit ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Icon
            <select name="icon" defaultValue={c.icon} className="mt-1 w-full border border-ink/20 px-3 py-2">
              {COUPON_ICONS.map((i) => (
                <option key={i} value={i}>{i === "aed" ? "AED (flat discount amount)" : i}</option>
              ))}
            </select>
          </label>
          <label className="block">Used<input value={c.used_count} disabled className="mt-1 w-full border border-ink/10 bg-sand/50 px-3 py-2" /></label>
          <label className="block">Starts<input name="starts_at" type="datetime-local" defaultValue={toLocal(c.starts_at)} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Ends<input name="ends_at" type="datetime-local" defaultValue={toLocal(c.ends_at)} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Gift title<input name="gift_title" defaultValue={c.gift_title ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Gift title AR<input name="gift_title_ar" defaultValue={c.gift_title_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <div className="flex flex-wrap gap-5 md:col-span-2">
            <label><input type="checkbox" name="first_order_only" defaultChecked={c.first_order_only} /> First orders only</label>
            
            <label><input type="checkbox" name="active" defaultChecked={c.active} /> Active</label>
            <label><input type="checkbox" name="is_public" defaultChecked={c.is_public} /> Show on product pages</label>
          </div>
          <SaveButton className="md:col-span-2">Save coupon</SaveButton>
        </AdminForm>
        <DeleteCoupon id={id} code={c.code} />
      </div>
    </>
  );
}
