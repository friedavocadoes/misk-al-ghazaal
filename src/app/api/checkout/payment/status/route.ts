import { checkoutPaymentProof, checkoutPaymentReceipt, continueCheckoutPayment, findCheckoutAttempt, sandboxConfigChanged } from "@/lib/checkout-tap";
import { tapConfig, validChargeId } from "@/lib/tap";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  const body = await req.json().catch(() => null);
  const proof = checkoutPaymentProof(body?.attempt);
  const config = tapConfig();
  if (!proof) {
    return Response.json({ state: "unavailable" }, { status: 400, headers });
  }
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return Response.json({ state: "unavailable" }, { status: 403, headers });
  }

  let canRestartSandbox = false;
  let hasCharge = false;
  try {
    const attempt = await findCheckoutAttempt(proof);
    if (!attempt) return Response.json({ state: "missing" }, { status: 404, headers });
    const sandboxStaffId = attempt.sandbox_staff_id;
    if (sandboxStaffId) {
      if ((await getAdminSession())?.userId !== sandboxStaffId) {
        return Response.json({ state: "unavailable" }, { status: 403, headers });
      }
      canRestartSandbox = !attempt.live_mode;
      if (body.restart === true && canRestartSandbox) return Response.json({ state: "sandbox_restart" }, { headers });
      if (!config || sandboxConfigChanged(attempt, config)) {
        return Response.json({ state: "sandbox_reconfigured" }, { headers });
      }
    }
    if (body.restart === true) return Response.json({ state: "unavailable" }, { status: 409, headers });
    hasCharge = Boolean(attempt.charge_id);
    if (!config || req.headers.get("origin") !== config.origin) {
      return Response.json({ state: "retry", canRestartSandbox, hasCharge }, { status: 503, headers });
    }
    const result = await continueCheckoutPayment(attempt, config, validChargeId(body.tap_id) ? body.tap_id : undefined);
    if (result.state === "paid") {
      if (sandboxStaffId) {
        return Response.json({ state: "sandbox_paid", total: attempt.order_data.total, chargeId: result.charge_id }, { headers });
      }
      const receipt = result.order_id ? await checkoutPaymentReceipt(result.order_id) : null;
      return Response.json(receipt ? { state: "paid", ...receipt } : { state: "unavailable", settled: true }, { headers });
    }
    return Response.json({ state: result.state, url: result.url, canRestartSandbox, awaitingConfirmation: result.awaitingConfirmation }, { headers });
  } catch (error) {
    console.warn("Tap checkout status check failed", { attempt: proof.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ state: "retry", canRestartSandbox, hasCharge }, { status: 503, headers });
  }
}
