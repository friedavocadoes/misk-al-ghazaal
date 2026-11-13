"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { markPurchase } from "@/lib/analytics/client";
import { useCart } from "@/lib/cart";
import { forgetPaymentProof, paymentBag, PAYMENT_ATTEMPT_KEY, readPaymentProof } from "@/lib/checkout-payment";
import { haptic } from "@/lib/haptics";
import { formatAED } from "@/lib/utils";
import { readSamples } from "@/lib/sample-tiers";
import { Button } from "@/components/ui/button";
import { OrderReceived, type ReceivedOrder } from "./OrderReceived";

type Receipt = { state: "paid"; order: ReceivedOrder; loggedIn: boolean; cartOwnerMatches: boolean };
type Status = Receipt | { state: "sandbox_paid"; total: number; chargeId?: string }
  | { state: "pending" | "unavailable" | "failed" | "sandbox_reconfigured"; url?: string };

export function CheckoutPaymentStatus({ locale, id, chargeId }: { locale: Locale; id: string; chargeId?: string }) {
  const ar = locale === "ar";
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(true);
  const [check, setCheck] = useState(0);
  const { lines, checkoutReady, clear } = useCart();

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const proof = readPaymentProof();
    const attemptId = id || (chargeId && proof?.id);

    async function verify(remaining: number) {
      if (controller.signal.aborted) return;
      if (!proof || proof.id !== attemptId) {
        setStatus({ state: "unavailable" });
        setChecking(false);
        return;
      }
      try {
        const response = await fetch("/api/checkout/payment/status", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ attempt: { id: attemptId, key: proof.key }, tap_id: chargeId }),
        });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (result.state === "sandbox_paid") {
          try { sessionStorage.setItem(PAYMENT_ATTEMPT_KEY, JSON.stringify({ id: proof.id, key: proof.key, settled: true })); } catch {}
          setStatus(result);
          setChecking(false);
          return;
        }
        if (result.state === "paid") {
          if (!proof.settled) {
            markPurchase(result.order.orderNo);
            haptic("order");
            try { sessionStorage.setItem(PAYMENT_ATTEMPT_KEY, JSON.stringify({ ...proof, settled: true })); } catch {}
          }
          setStatus(result);
          setChecking(false);
          return;
        }
        if (result.state === "failed" || result.state === "sandbox_reconfigured" || result.state === "unavailable" || (result.state === "missing" && remaining === 0)) {
          if (result.state !== "unavailable" || result.settled) forgetPaymentProof(proof.id);
          setStatus({ state: result.state === "missing" ? "unavailable" : result.state });
          setChecking(false);
          return;
        }
        setStatus({ state: "pending", url: result.url });
        // A payment link can be opened again while the same charge is initiated.
        if (result.url && !chargeId) remaining = 0;
      } catch {
        if (controller.signal.aborted) return;
        setStatus({ state: "pending" });
      }
      setChecking(false);
      if (remaining > 0) timer = setTimeout(() => void verify(remaining - 1), 4000);
    }

    void verify(5);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [check, id, chargeId]);

  useEffect(() => {
    if (status?.state !== "paid" || !checkoutReady) return;
    const proof = readPaymentProof();
    if (!proof || (id && proof.id !== id) || proof.bag === undefined) return;
    try {
      sessionStorage.setItem(PAYMENT_ATTEMPT_KEY, JSON.stringify({ id: proof.id, key: proof.key, settled: true }));
      if (!status.cartOwnerMatches || paymentBag(lines) !== proof.bag) return;
      clear();
      if (localStorage.getItem("misk-coupon") === proof.coupon) localStorage.removeItem("misk-coupon");
      if (JSON.stringify(readSamples()) === proof.samples) {
        localStorage.removeItem("misk-samples");
        window.dispatchEvent(new Event("samples-change"));
      }
    } catch { /* Storage can be unavailable after a redirect. */ }
  }, [checkoutReady, clear, id, lines, status]);

  if (status?.state === "paid") return <OrderReceived order={status.order} locale={locale} loggedIn={status.loggedIn} />;
  if (status?.state === "sandbox_paid") return <section className="mx-auto max-w-xl px-5 py-16 text-center">
    <h1 className="font-display text-3xl text-ink">{ar ? "نجح الدفع التجريبي" : "Test payment succeeded"}</h1>
    <p className="mt-4 text-sm text-espresso">{ar ? "أكد Tap الدفعة التجريبية بقيمة" : "Tap confirmed a sandbox payment of"} {formatAED(status.total)}.</p>
    {status.chargeId && <p className="mt-2 break-all text-xs text-fog" dir="ltr">{status.chargeId}</p>}
    <Button asChild className="mt-6"><Link href="/checkout">{ar ? "العودة إلى الدفع" : "Back to checkout"}</Link></Button>
  </section>;
  const state = status?.state;
  const title = state === "failed" ? (ar ? "لم يكتمل الدفع" : "Payment wasn’t completed")
    : state === "sandbox_reconfigured" ? (ar ? "تغيّرت إعدادات اختبار Tap" : "Tap sandbox settings changed")
    : state === "unavailable" ? (ar ? "تعذر عرض حالة الدفع" : "Payment status unavailable")
    : (ar ? "حالة الدفع" : "Payment status");
  const detail = state === "failed" ? (ar ? "يمكنك العودة إلى صفحة الدفع واختيار طريقة أخرى." : "Return to checkout to try again or choose another payment method.")
    : state === "sandbox_reconfigured" ? (ar ? "ارجع إلى صفحة الدفع وابدأ دفعة تجريبية جديدة." : "Return to checkout to start a new test payment.")
    : state === "unavailable" ? (ar ? "افتح صفحة الدفع من نفس علامة التبويب التي بدأت منها العملية." : "Open the payment status from the tab where you started checkout.")
    : checking ? (ar ? "جارٍ التحقق من الدفعة مع Tap Payments…" : "Checking your payment with Tap Payments…")
    : (ar ? "ننتظر تأكيد الدفعة. يمكنك التحقق من الحالة مرة أخرى." : "We’re waiting for payment confirmation. You can check again here.");

  return <section className="mx-auto max-w-xl px-5 py-16 text-center">
    <h1 className="font-display text-3xl text-ink md:text-4xl">{title}</h1>
    <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm leading-6 text-espresso">
      {checking && <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />}{detail}
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      {status?.state === "pending" && status.url && <Button asChild><a href={status.url} referrerPolicy="no-referrer">{ar ? "متابعة الدفع" : "Resume payment"}</a></Button>}
      {state === "pending" && <Button variant="outline" disabled={checking} onClick={() => { setChecking(true); setCheck(n => n + 1); }}>
        {ar ? "التحقق من حالة الدفع" : "Check payment status"}
      </Button>}
      {(state === "failed" || state === "sandbox_reconfigured") && <Button asChild><Link href="/checkout">{ar ? "العودة إلى الدفع" : "Back to checkout"}</Link></Button>}
      {state === "unavailable" && <Button asChild variant="outline"><Link href="/cart">{ar ? "عرض الحقيبة" : "View your bag"}</Link></Button>}
    </div>
  </section>;
}
