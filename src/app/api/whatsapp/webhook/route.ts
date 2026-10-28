import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/service";
import { isWhatsAppStop } from "@/lib/whatsapp-shared";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  )
    return new Response(p.get("hub.challenge"), { headers });
  return new Response("Forbidden", { status: 403, headers });
}
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length")) > 1_000_000)
    return new Response(null, { status: 413 });
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 1_000_000)
    return new Response(null, { status: 413 });
  const secret = process.env.WHATSAPP_APP_SECRET;
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature))
    return new Response(null, { status: 403 });
  const expected =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
    return new Response(null, { status: 403 });
  try {
    const body = JSON.parse(raw);
    if (body.object !== "whatsapp_business_account")
      return new Response(null, { status: 400 });
    const db = createAdminClient();
    for (const entry of body.entry ?? [])
      for (const change of entry.changes ?? []) {
        const v = change.value;
        if (
          change.field !== "messages" ||
          v?.metadata?.phone_number_id !== process.env.WHATSAPP_PHONE_NUMBER_ID
        )
          continue;
        for (const s of v.statuses ?? []) {
          if (!["sent", "delivered", "read", "failed"].includes(s.status))
            continue;
          let id = s.biz_opaque_callback_data;
          if (!/^[a-f0-9-]{36}$/i.test(id ?? "")) {
            const { data, error } = await db
              .from("whatsapp_messages")
              .select("id")
              .eq("provider_id", s.id)
              .maybeSingle();
            if (error) throw error;
            id = data?.id;
          }
          if (id) {
            const { error } = await db.rpc("whatsapp_receipt_status", {
              p_id: id,
              p_provider: s.id,
              p_state: s.status,
              p_error: s.errors?.[0]?.code?.toString() ?? null,
            });
            if (error) throw error;
          }
        }
        for (const m of v.messages ?? [])
          if (
            isWhatsAppStop(
              m.text?.body ??
                m.button?.text ??
                m.interactive?.button_reply?.title ??
                "",
            ) &&
            /^[1-9]\d{7,14}$/.test(m.from) &&
            typeof m.id === "string"
          ) {
            const { error } = await db.rpc("whatsapp_stop", {
              p_provider: m.id,
              p_phone: m.from,
            });
            if (error) throw error;
          }
      }
    return new Response("EVENT_RECEIVED", { headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
