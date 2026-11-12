import { reconcileTapWebhook } from "@/lib/checkout-tap";
import { tapConfig, verifyTapWebhook } from "@/lib/tap";

export async function POST(req: Request) {
  const config = tapConfig();
  if (!config) return new Response(null, { status: 503 });
  const charge = await req.json().catch(() => null);
  if (!charge || !verifyTapWebhook(charge, req.headers.get("hashstring") ?? "", config.secret)) {
    return new Response(null, { status: 401 });
  }
  try {
    await reconcileTapWebhook(config, charge.id, charge.reference?.order);
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
