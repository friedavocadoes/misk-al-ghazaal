"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
export function GuestOrderAccess({
  token,
  locale,
  orderId,
}: {
  token: string;
  locale: "en" | "ar";
  orderId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<
    "loading" | "guest" | "saved" | "owned" | "preview" | "error"
  >("loading");
  const ar = locale === "ar";
  const next = `/orders/${token}`;
  useEffect(() => {
    let alive = true;
    let pending = false;
    const register = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch("/api/orders/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          keepalive: true,
        });
        const data = await response.json();
        if (alive)
          setState(
            response.ok
              ? data.preview
                ? "preview"
                : data.saved
                  ? "saved"
                  : data.owned
                    ? "owned"
                    : "guest"
              : "error",
          );
      } catch {
        if (alive) setState("error");
      } finally {
        pending = false;
      }
    };
    void register();
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange(() => {
      void register();
    });
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, 45000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      subscription.unsubscribe();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token, router]);
  if (state === "preview")
    return (
      <section className="order-save-panel">
        <p className="eyebrow">{ar ? "معاينة الفريق" : "Staff preview"}</p>
        <h2>
          {ar ? "رابط العميل الخاص" : "The customer’s private order link."}
        </h2>
        <p>
          {ar
            ? "المعاينة لا تحفظ الطلب في حسابك."
            : "Previewing this page does not save or transfer the customer’s order to your account."}
        </p>
      </section>
    );
  return (
    <section className="order-save-panel">
      <p className="eyebrow">
        {ar ? "مكان لكل طلباتك" : "A place for every order"}
      </p>
      <h2>
        {state === "saved"
          ? ar
            ? "طلبك محفوظ في حسابك"
            : "Your order is saved to your account."
          : ar
            ? "احتفظ بطلبك بالقرب منك"
            : "Keep your order close."}
      </h2>
      <p>
        {state === "saved" ? (ar ? "يمكنك العثور على هذا الطلب وتحديثاته في قسم طلباتي بحسابك." : "You can find this order and its updates in My orders whenever you sign in.") : state === "owned"
          ? ar
            ? "هذا الطلب مرتبط بحساب بالفعل. سجّل الدخول إلى ذلك الحساب لعرضه ضمن طلباتك."
            : "This order is already linked to an account. Sign in to that account to find it in your orders."
          : state === "error"
            ? ar
              ? "تعذر حفظ الطلب الآن. يمكنك متابعة تفاصيله هنا والمحاولة مجدداً."
              : "We couldn’t remember this order just now. Your updates are still available here; reload to retry."
            : ar
              ? "سجّل الدخول أو أنشئ حساباً لحفظ هذا الطلب والاطلاع على تحديثاته في أي وقت."
              : "Sign in or create an account to keep this order and its updates in your order history."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {state === "saved" ? (
          <Link
            href={`/account/orders/${orderId}`}
            className="order-primary-link"
          >
            {ar ? "عرض في حسابي" : "View in my account"} ↗
          </Link>
        ) : (
          <>
            <Link
              href={`/account/login?next=${encodeURIComponent(next)}`}
              className="order-primary-link"
            >
              {ar ? "تسجيل الدخول" : "Sign in & save order"} ↗
            </Link>
            <Link
              href={`/account/register?next=${encodeURIComponent(next)}`}
              className="order-secondary-link"
            >
              {ar ? "إنشاء حساب" : "Create an account"}
            </Link>
          </>
        )}
      </div>
      <p className="!mt-5 !text-[10px]">
        {ar
          ? "رابط خاص بطلبك. شاركه فقط مع من تثق به."
          : "This is a private order link. Only share it with someone you trust."}
      </p>
    </section>
  );
}
