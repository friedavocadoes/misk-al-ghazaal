import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { createAdminClient } from "./supabase/service";
import { createClient } from "./supabase/server";
import { analyticsSession, recordCheckoutPurchase } from "./analytics/server";
import { refreshCheckoutStock, saveCheckoutCustomer, type CheckoutProfileInput } from "./checkout-effects";
import { getOrderAccessPath, rememberOrderAccess } from "./order-access";
import { processTelegramQueue } from "./telegram";
import { TAP_MERCHANT_MISMATCH, tapPhone, type PaymentProof, type TapMethod } from "./checkout-payment";
import { createTapCharge, retrieveTapCharge, tapConfig, tapPaymentUrl, TapRequestError, type TapCharge, type TapConfig } from "./tap";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const failedStatuses = new Set(["ABANDONED", "CANCELLED", "FAILED", "DECLINED", "RESTRICTED", "VOID", "TIMEDOUT", "UNKNOWN"]);
const keyHash = (key: string) => createHash("sha256").update(key).digest("hex");

type OrderData = {
  customer_name: string; email: string | null; phone: string; address: string;
  user_id: string | null; country_code: string; referral_code: string;
  city: string; emirate: string; state_name: string; postcode: string; address_label: string;
  delivery_lat: number | null; delivery_lng: number | null; total: number; payment_method: string;
};
type Line = { slug: string; variantId?: string; title: string; qty: number; unit: number };
type Attempt = {
  id: string; method: TapMethod; merchant_id: string; live_mode: boolean; origin: string; locale: "en" | "ar";
  created_at: string; state: "pending" | "paid" | "failed"; charge_id: string | null; order_id: string | null;
  payment_url: string | null;
  sandbox_staff_id?: string | null;
  order_data: OrderData; lines: Line[];
  context: { profile: CheckoutProfileInput; session: Awaited<ReturnType<typeof analyticsSession>> };
};
type PaymentResult = { state: Attempt["state"]; order_id?: string | null; url?: string; charge_id?: string | null; awaitingConfirmation?: boolean };

export function checkoutPaymentProof(value: unknown): PaymentProof | null {
  const proof = value as Partial<PaymentProof> | null;
  if (!proof || typeof proof.id !== "string" || typeof proof.key !== "string" || !UUID.test(proof.id) || !UUID.test(proof.key)) return null;
  return { id: proof.id, key: proof.key };
}

export async function findCheckoutAttempt(proof: PaymentProof) {
  const { data, error } = await createAdminClient().from("tap_checkout_attempts").select("*")
    .eq("id", proof.id).eq("key_hash", keyHash(proof.key)).maybeSingle();
  if (error) throw new Error("Online payments are currently unavailable.");
  return data as Attempt | null;
}

export async function startCheckoutPayment(
  req: Request, config: TapConfig, proof: PaymentProof, method: TapMethod, order: OrderData,
  lines: Line[], profile: CheckoutProfileInput, locale: "en" | "ar", sandboxStaffId?: string,
) {
  const db = createAdminClient();
  const common = {
    p_id: proof.id, p_key_hash: keyHash(proof.key), p_method: method, p_merchant: config.merchantScope,
    p_origin: config.origin, p_locale: locale,
  };
  if (config.staffSandbox) {
    if (!sandboxStaffId) throw new Error("Staff access required");
    const { data, error } = await db.rpc("tap_checkout_begin_sandbox", {
      ...common, p_staff: sandboxStaffId, p_amount: order.total,
      p_customer: { customer_name: order.customer_name, phone: order.phone, email: order.email },
    });
    if (error) throw new Error(error.message);
    return continueCheckoutPayment(data as Attempt, config);
  }
  const session = await analyticsSession(req, false, 0, order.user_id).catch(() => null);
  const { data, error } = await db.rpc("tap_checkout_begin", {
    ...common, p_live: config.live, p_order: order, p_lines: lines, p_context: { profile, session },
  });
  if (error) throw new Error(error.message);
  after(() => refreshCheckoutStock(lines.map(({ slug }) => slug)));
  return continueCheckoutPayment(data as Attempt, config);
}

function matchesConfig(attempt: Attempt, config: TapConfig) {
  return attempt.merchant_id === config.merchantScope && attempt.live_mode === config.live && attempt.origin === config.origin
    && Boolean(attempt.sandbox_staff_id) === config.staffSandbox;
}

export function sandboxConfigChanged(attempt: Attempt, config: TapConfig) {
  return Boolean(attempt.sandbox_staff_id) && !matchesConfig(attempt, config);
}

async function updateAttempt(attempt: Attempt, id: string | null, state: Attempt["state"], url?: string) {
  const db = createAdminClient();
  const { data, error } = await db.rpc(attempt.sandbox_staff_id ? "tap_checkout_update_sandbox" : "tap_checkout_update", {
    p_id: attempt.id, p_charge: id, p_state: state, p_url: url ?? null,
  });
  if (error) {
    console.error("Tap checkout persistence failed", { attempt: attempt.id, code: error.code });
    throw new Error("Unable to reconcile Tap payment");
  }
  const result = data as PaymentResult & { created: boolean };
  if (attempt.sandbox_staff_id) return result;
  if (result.state !== "pending") after(() => refreshCheckoutStock(attempt.lines.map(({ slug }) => slug)));
  if (result.created && result.order_id) {
    const orderId = result.order_id;
    const order = attempt.order_data;
    after(async () => {
      await Promise.allSettled([
        saveCheckoutCustomer(db, orderId, order, {
          ...attempt.context.profile, city: order.city, state: order.state_name, emirate: order.emirate,
          postcode: order.postcode, address_label: order.address_label, lat: order.delivery_lat, lng: order.delivery_lng,
        }),
        processTelegramQueue(),
        recordCheckoutPurchase(attempt.context.session, orderId, order.total, attempt.lines.filter(l => l.slug !== "gift")
          .map(l => ({ product_id: l.slug, product_name: l.title, price: l.unit, quantity: l.qty })), order.payment_method),
      ]);
    });
  }
  return { state: result.state, order_id: result.order_id };
}

async function applyCharge(attempt: Attempt, charge: TapCharge, config: TapConfig): Promise<PaymentResult> {
  const merchant = charge.merchant?.id || charge.merchant_id;
  if (!matchesConfig(attempt, config) || charge.live_mode !== attempt.live_mode || charge.currency !== "AED" ||
      Number(charge.amount) !== Number(attempt.order_data.total) || charge.reference?.order !== attempt.id ||
      charge.reference?.transaction !== attempt.id ||
      (attempt.charge_id && attempt.charge_id !== charge.id)) {
    throw new Error("Tap charge does not match checkout attempt");
  }
  if (config.merchant && merchant && String(merchant) !== config.merchant) {
    console.warn("Tap returned a different merchant", { attempt: attempt.id, expected: config.merchant, actual: String(merchant) });
    throw new Error(TAP_MERCHANT_MISMATCH);
  }

  const terminal = charge.status === "CAPTURED" || failedStatuses.has(charge.status);
  const url = terminal ? undefined : tapPaymentUrl(charge.transaction?.url, attempt.method)
    ?? (charge.status === "INITIATED" ? tapPaymentUrl(attempt.payment_url ?? undefined, attempt.method) : undefined);
  const bound = await updateAttempt(attempt, charge.id, "pending", url);
  if (bound.state !== "pending") return bound;
  if (charge.status === "CAPTURED") return updateAttempt(attempt, charge.id, "paid");
  if (failedStatuses.has(charge.status)) return updateAttempt(attempt, charge.id, "failed");
  return { state: "pending", url, awaitingConfirmation: !url && !["INITIATED", "PENDING"].includes(charge.status) };
}

export async function continueCheckoutPayment(attempt: Attempt, config: TapConfig, returnedId?: string): Promise<PaymentResult> {
  if (!matchesConfig(attempt, config)) throw new Error("Tap configuration changed during payment");
  if (attempt.state !== "pending") return { state: attempt.state, order_id: attempt.order_id, charge_id: attempt.charge_id };
  const chargeId = attempt.charge_id ?? returnedId;
  if (chargeId) return applyCharge(attempt, await retrieveTapCharge(config, chargeId), config);
  // Tap's idempotency window is 24 hours. Leave uncertain older attempts for reconciliation.
  if (Date.now() - Date.parse(attempt.created_at) >= 23 * 3600_000) return { state: "pending" };
  const { customer_name: name, phone, email, total } = attempt.order_data;
  const number = tapPhone(phone);
  if (!number) throw new Error("Invalid payment phone number");
  const [first, ...last] = name.split(/\s+/);
  let charge: TapCharge;
  try {
    charge = await createTapCharge(config, {
      id: attempt.id, method: attempt.method, amount: total, locale: attempt.locale,
      customer: { first_name: first, last_name: last.join(" ") || undefined, email: email || undefined, phone: number },
    });
  } catch (error) {
    if (error instanceof TapRequestError) console.warn("Tap charge creation failed", {
      attempt: attempt.id, sandbox: !attempt.live_mode, status: error.httpStatus, code: error.code,
    });
    if (error instanceof TapRequestError && error.rejected) return updateAttempt(attempt, null, "failed");
    throw error;
  }
  // The Tamara guide shows an abbreviated create response. Use Retrieve a
  // Charge when Tap omits the fields needed to match the attempt.
  if (charge.live_mode === undefined || !charge.reference?.order || !charge.reference.transaction) {
    const retrieved = await retrieveTapCharge(config, charge.id);
    return applyCharge(attempt, {
      ...retrieved,
      transaction: { ...retrieved.transaction, url: retrieved.transaction?.url ?? charge.transaction?.url },
    }, config);
  }
  return applyCharge(attempt, charge, config);
}

export async function reconcileTapWebhook(config: TapConfig, chargeId: string, attemptId?: string) {
  if (!attemptId || !UUID.test(attemptId)) return;
  const { data, error } = await createAdminClient().from("tap_checkout_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (error) throw new Error("Could not look up Tap checkout");
  if (data?.state === "pending") await continueCheckoutPayment(data as Attempt, config, chargeId);
}

export async function reconcilePendingTapPayments() {
  const config = tapConfig();
  if (!config) return { checked: 0, errors: 0 };
  const { data, error } = await createAdminClient().rpc("tap_checkout_due", {
    p_merchant: config.merchantScope, p_live: config.live, p_origin: config.origin,
  });
  if (error) throw new Error("Could not load pending Tap payments");
  const results = await Promise.allSettled((data as Attempt[]).map(attempt => continueCheckoutPayment(attempt, config)));
  return { checked: results.length, errors: results.filter(result => result.status === "rejected").length };
}

export async function checkoutPaymentReceipt(orderId: string) {
  const db = createAdminClient();
  const { data: order, error } = await db.from("orders")
    .select("order_no,total,customer_name,address,city,state_name,user_id,order_items(product_slug,title,qty,unit_price)")
    .eq("id", orderId).is("deleted_at", null).maybeSingle();
  if (error) throw new Error("Could not load paid order");
  if (!order) return null;
  const orderUrl = await getOrderAccessPath(db, orderId);
  await rememberOrderAccess(orderUrl.split("/").at(-1)!).catch(() => {});
  const shopper = await createClient().then(client => client.auth.getUser()).catch(() => null);
  return {
    loggedIn: Boolean(order.user_id),
    cartOwnerMatches: shopper !== null && (shopper.data.user?.id ?? null) === order.user_id,
    order: {
      orderNo: order.order_no, orderUrl, total: Number(order.total), paid: true, recipient: order.customer_name,
      deliveryAddress: [order.address, order.city, order.state_name].filter(Boolean).join(", "),
      items: order.order_items.map(line => ({ slug: line.product_slug, title: line.title, qty: line.qty, unit: Number(line.unit_price), image: "" })),
    },
  };
}
