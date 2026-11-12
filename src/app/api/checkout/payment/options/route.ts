import { createAdminClient } from "@/lib/supabase/service";
import { tapConfig } from "@/lib/tap";

export async function GET() {
  const config = tapConfig();
  let ready = false;
  if (config && Object.keys(config.methods).length) {
    const { error } = await createAdminClient().from("tap_checkout_attempts").select("id", { head: true }).limit(1);
    ready = !error;
  }
  return Response.json(ready && config ? { origin: config.origin, methods: config.methods } : { methods: {} }, {
    headers: { "Cache-Control": "no-store" },
  });
}
