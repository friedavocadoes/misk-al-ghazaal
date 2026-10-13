import { NextResponse } from "next/server";
import { getPublicCoupons } from "@/lib/store";

/** GET /api/coupons — active public offers for checkout + PDP pickers.
    Same visibility rules as the PDP strip (public, active, ownerless,
    inside window). Never leaks personal/referral codes. */
export async function GET() {
  try {
    const coupons = await getPublicCoupons();
    return NextResponse.json({ coupons });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "coupons failed" },
      { status: 500 },
    );
  }
}
