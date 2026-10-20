"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { logAdmin } from "@/lib/audit";
import { revalidateNavigation } from "@/lib/revalidate";

export async function deleteCoupon(formData: FormData) {
  const session = await getAdminSession();
  if (!session || session.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id") || "");
  const db = await createClient();
  const { data: coupon, error } = await db.from("coupons").delete().eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Could not delete coupon. Please try again.");
  if (coupon) await logAdmin(db, session, {
    category: "coupons", action: "delete", entity: "coupon", entityId: id,
    label: coupon.code, summary: `Deleted coupon ${coupon.code}`, details: { snapshot: coupon },
  });
  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${id}`);
  // Refresh all localized storefront layouts, including PDP offer lists.
  revalidateNavigation();
  redirect("/admin/coupons");
}
