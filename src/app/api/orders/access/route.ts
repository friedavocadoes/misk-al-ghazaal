import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { rememberOrderAccess, claimRememberedOrders } from "@/lib/order-access";
import { validOrderToken } from "@/lib/order-access-shared";
import { revalidatePagePaths } from "@/lib/revalidate";
export async function POST(req: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin)
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  try {
    if (Number(req.headers.get("content-length")) > 1024)
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400, headers },
      );
    const body = await req.json();
    if (!validOrderToken(body.token))
      return NextResponse.json(
        { error: "Link unavailable" },
        { status: 404, headers },
      );
    const db = createAdminClient();
    const { data: link, error } = await db
      .from("order_access_links")
      .select("order_id")
      .eq("token", body.token)
      .maybeSingle();
    if (error) throw error;
    if (!link)
      return NextResponse.json(
        { error: "Link unavailable" },
        { status: 404, headers },
      );
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("user_id,deleted_at")
      .eq("id", link.order_id)
      .single();
    if (orderError) throw orderError;
    if (!order || order.deleted_at)
      return NextResponse.json(
        { error: "Order unavailable" },
        { status: 410, headers },
      );
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (user) {
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      if (profile?.role !== "customer")
        return NextResponse.json(
          { saved: false, owned: !!order.user_id, preview: true },
          { headers },
        );
    }
    let saved = !!user && order.user_id === user.id;
    if (!order.user_id) {
      await rememberOrderAccess(body.token);
      if (user) {
        await claimRememberedOrders(db, user.id);
        const { data: current } = await db
          .from("orders")
          .select("user_id")
          .eq("id", link.order_id)
          .single();
        saved = current?.user_id === user.id;
        if (saved) revalidatePagePaths("/account/orders");
      }
    }
    return NextResponse.json({ saved, owned: !!order.user_id }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Could not save this order. Please try again." },
      { status: 503, headers },
    );
  }
}
