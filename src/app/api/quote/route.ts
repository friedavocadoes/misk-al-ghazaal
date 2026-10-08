import { NextResponse } from "next/server";
import { quoteBag, type BagLine } from "@/lib/pricing";

/** POST /api/quote — live price breakdown for a bag + code + referral.
    Never writes; mirrors the exact math POST /api/checkout will apply. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    lines?: BagLine[];
    email?: string;
    couponCode?: string;
    referralCode?: string;
    userId?: string;
  } | null;
  const lines = (body?.lines ?? []).filter((l) => l.slug && l.qty > 0).slice(0, 50);
  if (!lines.length) return NextResponse.json({ error: "empty" }, { status: 400 });
  try {
    const { quote } = await quoteBag({
      lines,
      email: body?.email,
      couponCode: body?.couponCode,
      referralCode: body?.referralCode,
      userId: body?.userId,
    });
    return NextResponse.json({ quote });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
