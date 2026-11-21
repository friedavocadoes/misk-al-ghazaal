import { createAdminClient } from "@/lib/supabase/service";
import { tapConfig } from "@/lib/tap";

export async function GET(req: Request) {
  const config = tapConfig(new URL(req.url).origin);
  let ready = false;
  if (config && Object.keys(config.methods).length) {
    const { error } = await createAdminClient().from("tap_checkout_attempts")
      .select("context", { head: true }).limit(1);
    ready = !error;
  }
  return Response.json(ready && config ? { origin: config.origin, methods: config.methods, sandbox: config.local, sdk: config.live ? { publicKey: config.publicKey, merchantId: config.merchant } : null } : { methods: {} }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
