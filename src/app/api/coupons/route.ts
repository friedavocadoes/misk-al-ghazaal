import { createAdminClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getPublicCoupons } from "@/lib/store";

/** GET /api/coupons — active public offers for checkout + PDP pickers.
    Same visibility rules as the PDP strip (public, active, ownerless,
    inside window). Never leaks personal/referral codes. */
export async function GET() {
  try {
    let coupons = await getPublicCoupons();
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user) {
      const { data, error } = await createAdminClient()
        .from("coupon_redemptions")
        .select("coupon_id")
        .eq("user_id", user.id);
      if (error) throw error;
      const used = new Map<string, number>();
      for (const row of data ?? []) used.set(row.coupon_id, (used.get(row.coupon_id) ?? 0) + 1);
      coupons = coupons.filter(c => c.usageLimit == null || (used.get(c.id) ?? 0) < c.usageLimit);
    }
    return NextResponse.json(
      { coupons },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "coupons failed" },
      { status: 500 },
    );
  }
}
