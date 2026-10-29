"use client";
import { useState } from "react";
export function CommunicationPreferences({
  token,
  email,
  phone,
  emailPromo,
  waOrders,
  waPromo,
  emailAvailable = true,
  ar = false,
}: {
  token: string;
  email: string;
  phone: string | null;
  emailPromo: boolean;
  waOrders: boolean;
  waPromo: boolean;
  emailAvailable?: boolean;
  ar?: boolean;
}) {
  const [promo, setPromo] = useState(emailPromo),
    [orders, setOrders] = useState(waOrders),
    [marketing, setMarketing] = useState(waPromo),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="mx-auto w-full max-w-xl border border-ink/10 bg-white p-6 md:p-10"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const r = await fetch(`/api/preferences/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailPromo: promo,
              waOrders: orders,
              waPromo: marketing,
            }),
          });
          const b = await r.json();
          if (!r.ok) throw Error(b.error);
          setMessage(ar ? "تم حفظ تفضيلاتك" : "Your preferences are saved.");
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="eyebrow text-gold">Misk Al Ghazaal</p>
      <h1 className="mt-4 text-3xl font-light">
        {ar ? "كما تفضل" : "On your terms."}
      </h1>
      <p className="mt-3 break-all text-sm text-fog">{email}</p>
      <div className="mt-8 grid gap-5">
        {emailAvailable && (
          <>
            <label className="flex gap-3 opacity-55">
              <input type="checkbox" checked disabled />
              <span>
                <span className="block text-sm">
                  {ar
                    ? "تحديثات الطلبات بالبريد الإلكتروني"
                    : "Essential order emails"}
                </span>
                <span className="mt-1 block text-xs leading-6 text-fog">
                  {ar
                    ? "إشعارات تأكيد الطلب والشحن ضرورية ولا يمكن إيقافها."
                    : "Confirmation and delivery information are essential to your order and cannot be switched off here."}
                </span>
              </span>
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={promo}
                onChange={(e) => setPromo(e.target.checked)}
              />
              <span className="text-sm">
                {ar
                  ? "عروض وإصدارات جديدة بالبريد الإلكتروني"
                  : "Offers & new arrivals by email"}
              </span>
            </label>
          </>
        )}
        <div className="border-t border-ink/10 pt-5">
          <p className="text-xs text-fog">
            WhatsApp{" "}
            {phone ?? (ar ? "· لا يوجد رقم مسجل" : "· no number on file")}
          </p>
          <label className="mt-4 flex gap-3">
            <input
              type="checkbox"
              disabled={!phone}
              checked={orders}
              onChange={(e) => setOrders(e.target.checked)}
            />
            <span className="text-sm">
              {ar ? "تحديثات الطلبات عبر واتساب" : "Order updates on WhatsApp"}
            </span>
          </label>
          <label className="mt-4 flex gap-3">
            <input
              type="checkbox"
              disabled={!phone}
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span className="text-sm">
              {ar ? "العروض عبر واتساب" : "Offers on WhatsApp"}
            </span>
          </label>
        </div>
      </div>
      <button
        disabled={busy}
        className="mt-8 w-full bg-ink px-6 py-4 text-xs uppercase tracking-[.16em] text-white disabled:opacity-50"
      >
        {busy
          ? ar
            ? "جارٍ الحفظ…"
            : "Saving…"
          : ar
            ? "حفظ تفضيلاتي"
            : "Save my preferences"}
      </button>
      <p role="status" className="mt-4 text-sm">
        {message}
      </p>
    </form>
  );
}
