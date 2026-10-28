import { timingSafeEqual } from "node:crypto";
import { processWhatsAppQueue } from "@/lib/whatsapp";
import { processTelegramQueue } from "@/lib/telegram";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET,
    a = Buffer.from(req.headers.get("authorization") ?? ""),
    b = Buffer.from(`Bearer ${secret}`);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const results = await Promise.allSettled([
    processWhatsAppQueue(),
    processTelegramQueue(),
  ]);
  return Response.json(
    Object.fromEntries(
      results.map((r, i) => [
        i ? "telegram" : "whatsapp",
        r.status === "fulfilled" ? r.value : { error: "Queue unavailable" },
      ]),
    ),
    {
      status: results.some((r) => r.status === "rejected") ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
