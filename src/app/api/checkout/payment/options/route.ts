import { createAdminClient } from "@/lib/supabase/service";
import { tapConfig } from "@/lib/tap";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const config = tapConfig();
  let ready = false;
  if (config && Object.keys(config.methods).length && (!config.staffSandbox || await getAdminSession())) {
    const { error } = await createAdminClient().from("tap_checkout_attempts")
      .select(config.staffSandbox ? "sandbox_staff_id" : "id", { head: true }).limit(1);
    ready = !error;
  }
  return Response.json(ready && config ? { origin: config.origin, methods: config.methods, sandbox: config.staffSandbox } : { methods: {} }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
