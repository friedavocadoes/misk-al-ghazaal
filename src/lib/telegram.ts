import "server-only";
import { createAdminClient } from "./supabase/service";
import { getNotificationSettings } from "./notification-settings";
import { getSiteUrl } from "./site-url";
import { paymentMethodLabel } from "./admin-orders-model";

export async function processTelegramQueue() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID)
    return { processed: 0, disabled: true };
    
  const settings = await getNotificationSettings();
  if (!settings.available || !settings.telegram_new_order)
    return { processed: 0, disabled: true };
    
  const db = createAdminClient(),
    { data: jobs, error } = await db.rpc("telegram_claim", { p_limit: 5 });
    
  if (error)
    throw Error(
      "Telegram queue unavailable. Apply migration_notification_control.sql.",
    );
    
  for (const [index, job] of (jobs ?? []).entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    
    const settle = async (
      state: string,
      code: string | null = null,
      providerId?: string,
      retryAfter = 60,
    ) => {
      const { error } = await db
        .from("telegram_order_alerts")
        .update({
          state,
          error_code: code,
          updated_at: new Date().toISOString(),
          ...(providerId ? { provider_id: providerId } : {}),
          ...(state === "pending"
            ? {
                available_at: new Date(
                  Date.now() + retryAfter * 1000,
                ).toISOString(),
              }
            : {}),
        })
        .eq("id", job.id)
        .eq("state", "sending");
      if (error) throw Error("Could not record Telegram delivery.");
    };
    
    let attempted = false;
    try {
      const { data: o, error } = await db
        .from("orders")
        .select(
          "id,order_no,customer_name,total,payment_method,status,deleted_at",
        )
        .eq("id", job.order_id)
        .maybeSingle();
        
      if (error) throw Error("Order unavailable");
      
      // Log skipping reasons to terminal for debugging
      if (!o || o.deleted_at || o.status !== "new" || Date.now() - Date.parse(job.created_at) > 24 * 60 * 60_000) {
        console.warn(`Skipping job ${job.id}: Order ${o?.id} does not meet requirements (status: ${o?.status}).`);
        await settle("skipped", "order_no_longer_new");
        continue;
      }
      
      const origin = getSiteUrl();
      
      // FIX: Allow http://localhost or http://127.0.0.1 for local testing
      if (!/^https:\/\//.test(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(origin)) {
        throw Error(`Invalid site URL: ${origin}. Must be HTTPS or localhost.`);
      }
        
      const url = `${origin}/admin/orders/${o.id}`;
      const text = `New Order\n\nOrder: #${String(o.order_no).replace(/^#/, "")}\nCustomer: ${String(
        o.customer_name,
      )
        .replace(/[\r\n]/g, " ")
        .slice(
          0,
          150,
        )}\nTotal: AED ${Number(o.total).toFixed(2)}\nPayment: ${paymentMethodLabel(o.payment_method)}\nStatus: Pending processing\n\n${url}`;
        
      attempted = true;
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text,
            link_preview_options: { is_disabled: true },
            reply_markup: { inline_keyboard: [[{ text: "Open order", url }]] },
            ...(process.env.TELEGRAM_MESSAGE_THREAD_ID
              ? {
                  message_thread_id: Number(
                    process.env.TELEGRAM_MESSAGE_THREAD_ID,
                  ),
                }
              : {}),
          }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        },
      );
      
      const result = await response.json().catch(() => ({}));
      
      // FIX: Log Telegram API rejections to the terminal
      if (!response.ok || !result.ok) {
        console.error("Telegram API Error:", result.description || response.statusText);
      }

      if (response.ok && result.ok && result.result?.message_id)
        await settle("sent", null, String(result.result.message_id));
      else if (response.status === 429 && job.attempts < 4)
        await settle(
          "pending",
          "429",
          undefined,
          Math.min(
            3600,
            Math.max(2, Number(result.parameters?.retry_after) || 60),
          ),
        );
      else
        await settle(
          response.status >= 500 || response.ok ? "unknown" : "failed",
          String(result.error_code ?? response.status),
        );
    } catch (error) {
      // FIX: Log internal code errors to the terminal
      console.error(`Queue Error (Job ID: ${job.id}):`, error);
      
      await settle(
        attempted ? "unknown" : job.attempts < 4 ? "pending" : "failed",
        attempted ? "ambiguous_attempt" : "preparation_failed",
      );
    }
  }
  return { processed: jobs?.length ?? 0, disabled: false };
}