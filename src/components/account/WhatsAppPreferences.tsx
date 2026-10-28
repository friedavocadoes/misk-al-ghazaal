"use client";
import { useState } from "react";
import { toast } from "sonner";
export function WhatsAppPreferences({
  initialPhone = "",
  initialOrders = false,
  initialMarketing = false,
  ar = false,
}: {
  initialPhone?: string;
  initialOrders?: boolean;
  initialMarketing?: boolean;
  ar?: boolean;
}) {
  const [phone, setPhone] = useState(initialPhone),
    [orders, setOrders] = useState(initialOrders),
    [marketing, setMarketing] = useState(initialMarketing),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 grid gap-4 border border-ink/10 bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await fetch("/api/whatsapp/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, orders, marketing }),
          });
          const b = await r.json();
          if (!r.ok) throw Error(b.error);
          toast.success(ar ? "تم الحفظ" : "WhatsApp preferences saved");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg">WhatsApp</h2>
      <label className="grid gap-2 text-sm">
        {ar
          ? "رقم الهاتف مع رمز الدولة"
          : "Mobile number, including country code"}
        <input
          required
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+971 50 123 4567"
          dir="ltr"
          className="border border-ink/20 p-3"
        />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={orders}
          onChange={(e) => setOrders(e.target.checked)}
        />
        {ar
          ? "أوافق على تلقي تحديثات الطلبات عبر واتساب"
          : "Send me order updates on WhatsApp for orders where I request them."}
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
        />
        {ar
          ? "أوافق على تلقي عروض مسك الغزال عبر واتساب"
          : "I agree to receive Misk Al Ghazaal offers and new arrivals on WhatsApp."}
      </label>
      <p className="text-xs leading-6 text-fog">
        {ar
          ? "يمكنك إرسال STOP لإيقاف الرسائل. تفضيلات واتساب مستقلة عن البريد الإلكتروني."
          : "Optional and separate from email. Reply STOP to stop WhatsApp messages. Saving a new number removes these permissions from your previous saved number."}
      </p>
      <button
        disabled={busy}
        className="bg-ink p-3 text-sm text-white disabled:opacity-50"
      >
        {busy
          ? ar
            ? "جارٍ الحفظ…"
            : "Saving…"
          : ar
            ? "حفظ"
            : "Save WhatsApp preferences"}
      </button>
    </form>
  );
}
