import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";

/** POST /api/reviews — logged-in users file (or re-file) a review.
    Stays unapproved until staff approve (re-edits re-moderate). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    productId?: string;
    rating?: number;
    title?: string;
    body?: string;
  } | null;
  const rating = Math.floor(Number(body?.rating));
  if (!body?.productId || !(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const title = String(body.title ?? "").slice(0, 80);
  const text = String(body.body ?? "").slice(0, 2000);
  if (!title && !text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from("reviews").upsert(
    { product_id: body.productId, user_id: user.id, rating, title, body: text, approved: false },
    { onConflict: "product_id,user_id" },
  );
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
