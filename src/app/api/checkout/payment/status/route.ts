import { checkoutPaymentProof, checkoutPaymentReceipt, continueCheckoutPayment, findCheckoutAttempt } from "@/lib/checkout-tap";
import { tapConfig, validChargeId } from "@/lib/tap";

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  const body = await req.json().catch(() => null);
  const proof = checkoutPaymentProof(body?.attempt);
  const config = tapConfig();
  if (!proof) {
    return Response.json({ state: "unavailable" }, { status: 400, headers });
  }
  if (!config || req.headers.get("origin") !== config.origin) {
    return Response.json({ state: "pending" }, { status: 503, headers });
  }

  try {
    const attempt = await findCheckoutAttempt(proof);
    if (!attempt) return Response.json({ state: "missing" }, { status: 404, headers });
    const result = await continueCheckoutPayment(attempt, config, validChargeId(body.tap_id) ? body.tap_id : undefined);
    if (result.state === "paid") {
      const receipt = result.order_id ? await checkoutPaymentReceipt(result.order_id) : null;
      return Response.json(receipt ? { state: "paid", ...receipt } : { state: "unavailable", settled: true }, { headers });
    }
    return Response.json({ state: result.state, url: result.url }, { headers });
  } catch {
    return Response.json({ state: "pending" }, { status: 503, headers });
  }
}
