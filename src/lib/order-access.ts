import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ORDER_ACCESS_COOKIE,
  orderAccessPath,
  rememberedOrderTokens,
  validOrderToken,
} from "./order-access-shared";
export async function getOrderAccessPath(
  db: SupabaseClient,
  orderId: string,
): Promise<string> {
  const { data, error } = await db
    .from("order_access_links")
    .select("token")
    .eq("order_id", orderId)
    .single();
  if (error || !data)
    throw new Error(
      "Order links unavailable. Apply migration_guest_order_links.sql.",
    );
  return orderAccessPath(data.token);
}
export async function rememberOrderAccess(token: string) {
  if (!validOrderToken(token)) return;
  const jar = await cookies();
  const tokens = rememberedOrderTokens(
    jar.get(ORDER_ACCESS_COOKIE)?.value,
  ).filter((t) => t !== token);
  jar.set(ORDER_ACCESS_COOKIE, JSON.stringify([...tokens, token].slice(-8)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
}
export async function claimRememberedOrders(
  db: SupabaseClient,
  userId: string,
) {
  const tokens = rememberedOrderTokens(
    (await cookies()).get(ORDER_ACCESS_COOKIE)?.value,
  );
  if (!tokens.length) return 0;
  const { data, error } = await db.rpc("claim_browser_orders", {
    p_user: userId,
    p_tokens: tokens,
  });
  if (error) throw new Error("Unable to save orders to this account.");
  return Number(data ?? 0);
}
