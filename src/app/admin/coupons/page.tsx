import Link from "next/link";
import { DeleteCoupon } from "@/components/admin/delete-coupon";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { CouponIcon, COUPON_ICONS } from "@/components/ui/coupon-icons";
import { logAdmin } from "@/lib/audit";

async function createCoupon(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const rawLimit = String(formData.get("usage_limit") ?? "").trim();
  const usageLimit = rawLimit ? Number(rawLimit) : null;
  if (usageLimit !== null && (!Number.isSafeInteger(usageLimit) || usageLimit < 1)) throw new Error("Uses per account must be a positive whole number, or blank for unlimited.");
  const supabase = await createClient();
  const code = String(formData.get("code")).trim().toUpperCase();
  const kind = String(formData.get("kind"));
  const { data, error } = await supabase.from("coupons").insert({
    code,
    kind,
    amount: Number(formData.get("amount") || 0),
    min_subtotal: Number(formData.get("min_subtotal") || 0),
    max_discount: formData.get("max_discount")
      ? Number(formData.get("max_discount"))
      : null,
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
  }).select("id").single();
  if (error) throw new Error(error.message);
  await logAdmin(supabase, s, {
    category: "coupons",
    action: "create",
    entity: "coupon",
    entityId: (data as { id: string } | null)?.id ?? "",
    label: code,
    summary: `Created coupon ${code} (${kind} ${formData.get("amount")})`,
    details: { code, kind, amount: Number(formData.get("amount") || 0) },
  });
  revalidatePath("/admin/coupons");
  // Coupon strip renders on every PDP — refresh the storefront tree.
  revalidatePath("/", "layout");
}

const KIND_HINT: Record<string, string> = {
  percent: "amount = % off subtotal (e.g. 20)",
  fixed: "amount = AED off subtotal",
  free_shipping: "amount ignored — shipping becomes 0",
  gift: "gift_title added as a complimentary order line",
};

export default async function CouponsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .is("owner_id", null)
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl">Coupons</h1>
        <p className="mt-1 text-sm text-ink/60">
          percent · fixed AED · free shipping · gift. Personal referral rewards
          are minted automatically (hidden here).
        </p>

        <AdminForm
          action={createCoupon}
          success="Coupon created"
          className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm md:grid-cols-3"
        >
          <h2 className="font-display text-xl md:col-span-3">New coupon</h2>
          <label className="block">
            Code*
            <input
              name="code"
              required
              placeholder="WELCOME20"
              className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono uppercase"
            />
          </label>
          <label className="block">
            Kind*
            <select
              name="kind"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
              defaultValue="percent"
            >
              <option value="percent">% off</option>
              <option value="fixed">AED off</option>
              <option value="free_shipping">Free shipping</option>
              <option value="gift">Free gift</option>
            </select>
          </label>
          <label className="block">
            Amount
            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={20}
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Min subtotal AED
            <input
              name="min_subtotal"
              type="number"
              step="0.01"
              defaultValue={200}
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Max discount AED (blank = ∞)
            <input
              name="max_discount"
              type="number"
              step="0.01"
              placeholder="e.g. 150"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Uses per account (blank = unlimited)
            <input
              name="usage_limit"
              type="number" min="1" step="1"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Icon
            <select
              name="icon"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
              defaultValue="tag"
            >
              {COUPON_ICONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Starts
            <input
              name="starts_at"
              type="datetime-local"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Ends
            <input
              name="ends_at"
              type="datetime-local"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Gift title (gift kind)
            <input
              name="gift_title"
              placeholder="Travel spray trio"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block md:col-span-2">
            Gift title AR
            <input
              name="gift_title_ar"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-5 md:col-span-3">
            <label>
              <input type="checkbox" name="first_order_only" /> First orders
              only
            </label>
            
            <label>
              <input type="checkbox" name="active" defaultChecked /> Active
            </label>
            <label>
              <input type="checkbox" name="is_public" defaultChecked /> Show on
              product pages
            </label>
          </div>
          <p className="text-xs text-ink/50 md:col-span-3">
            {Object.entries(KIND_HINT)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
          <SaveButton className="md:col-span-3">Create coupon</SaveButton>
        </AdminForm>

        <ul className="mt-8 divide-y divide-ink/10 border border-ink/10 bg-white">
          {(
            (coupons as
              | {
                  id: string;
                  code: string;
                  kind: string;
                  amount: number;
                  active: boolean;
                  used_count: number;
                  icon: string;
                  max_discount: number | null;
                  once_per_account: boolean; usage_limit: number | null;
                }[]
              | null) ?? []
          ).map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/coupons/${c.id}`}
                className="flex items-center gap-4 p-4 transition hover:bg-sand/60"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-ink text-gold-soft">
                  <CouponIcon icon={c.icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="font-mono font-bold tracking-[0.1em]">
                    {c.code}
                  </span>{" "}
                  <span className="text-sm text-ink/60">
                    {c.kind} · {Number(c.amount)} · used {c.used_count}×
                  </span>
                  <span className="mt-0.5 block text-[11px] text-fog">
                    {c.max_discount != null
                      ? `capped AED ${Number(c.max_discount)} · `
                      : ""}
                    {c.usage_limit == null ? "Unlimited per account" : `${c.usage_limit} per account`}
                  </span>
                </span>
                <span
                  className={`ms-auto text-xs uppercase tracking-[0.16em] ${c.active ? "text-[#1e7a46]" : "text-ink/40"}`}
                >
                  {c.active ? "Active" : "Off"}
                </span>
              </Link>
              <DeleteCoupon id={c.id} code={c.code} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
