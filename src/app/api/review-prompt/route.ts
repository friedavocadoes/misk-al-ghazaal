import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return Response.json({}, { status: 403 });
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return Response.json({ prompt: null });
    const admin = createAdminClient();
    const body = await req.json();
    if (body.orderId) {
      if (!["dismissed", "opened"].includes(body.state))
        return Response.json({}, { status: 400 });
      await admin
        .from("order_review_prompts")
        .update({ state: body.state })
        .eq("order_id", body.orderId)
        .eq("user_id", user.id);
      return Response.json({ ok: true });
    }
    const { data: recent, error: recentError } = await admin
      .from("order_review_prompts")
      .select("order_id")
      .eq("user_id", user.id)
      .gte("claimed_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(1);
    if (recentError) throw recentError;
    if (recent?.length) return Response.json({ prompt: null });
    const { data: orders, error } = await admin
      .from("orders")
      .select("id,order_items(product_slug,title)")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .is("deleted_at", null)
      .gte("created_at", new Date(Date.now() - 60 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    for (const order of orders || []) {
      const { data: prior, error: readError } = await admin
        .from("order_review_prompts")
        .select("order_id")
        .eq("order_id", order.id)
        .maybeSingle();
      if (readError) throw readError;
      if (prior) continue;
      const items: { id: string; slug: string; title: string }[] = [];
      for (const item of order.order_items || []) {
        const { data: product } = await admin
          .from("products")
          .select("id,slug,title")
          .eq("slug", item.product_slug)
          .is("deleted_at", null)
          .maybeSingle();
        if (!product) continue;
        const { data: review, error } = await admin
          .from("reviews")
          .select("id,body")
          .eq("user_id", user.id)
          .eq("product_id", product.id)
          .maybeSingle();
        if (error) throw error;
        if (
          !review?.body?.trim() &&
          !items.some((i) => i.slug === product.slug)
        )
          items.push(product);
      }
      if (!items.length) continue;
      const { data: claimed, error: claim } = await admin.rpc(
        "claim_order_review_prompt",
        { p_order: order.id, p_user: user.id },
      );
      if (claim) throw claim;
      if (!claimed) return Response.json({ prompt: null });
      if (items.length)
        return Response.json({ prompt: { orderId: order.id, items } });
    }
    return Response.json({ prompt: null });
  } catch {
    return Response.json({ prompt: null });
  }
}
