import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { quoteBag, type BagLine } from "@/lib/pricing";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lines: BagLine[] = Array.isArray(body?.lines)
      ? body.lines
          .filter(
            (l: BagLine) =>
              l &&
              typeof l.slug === "string" &&
              Number.isInteger(l.qty) &&
              l.qty > 0,
          )
          .slice(0, 50)
      : [];
    if (!lines.length)
      return NextResponse.json({ error: "empty" }, { status: 400 });
    let couponCode = typeof body.couponCode === "string" ? body.couponCode : "";
    let referralCode =
      typeof body.referralCode === "string" ? body.referralCode : "";
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    let couponError = "",
      referralError = "";
    if (couponCode && !user) {
      couponError = "coupon:login";
      couponCode = "";
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { quote, stockIssues } = await quoteBag({
          lines,
          previewStock: true,
          email: body.email,
          couponCode,
          referralCode,
          userId: user?.id,
        });
        return NextResponse.json(
          { quote, stockIssues: stockIssues || [], couponError, referralError },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "invalid";
        if (couponCode && msg.startsWith("coupon:")) {
          couponError = msg;
          couponCode = "";
          continue;
        }
        if (referralCode && msg.startsWith("referral:")) {
          referralError = msg;
          referralCode = "";
          continue;
        }
        throw e;
      }
    }
    throw Error("Pricing unavailable");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pricing unavailable" },
      { status: 400 },
    );
  }
}
