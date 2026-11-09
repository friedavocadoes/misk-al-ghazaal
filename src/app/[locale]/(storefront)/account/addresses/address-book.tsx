"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { DeliveryAddress } from "@/components/blocks/DeliveryAddress";
import { Button } from "@/components/ui/button";
import { addressIsSupported, addressSummary, type SavedAddress } from "@/lib/saved-address";
import type { DeliveryAnswer, DeliveryCountry } from "@/lib/types";
import type { Locale } from "@/i18n/routing";

export function AddressBook({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [countries, setCountries] = useState<DeliveryCountry[]>([]);
  const [answer, setAnswer] = useState<DeliveryAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const errorMessage = ar ? "تعذر تحديث العناوين. يرجى المحاولة مرة أخرى." : "Couldn’t update your addresses. Please try again.";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/profile", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setAddresses(data.savedAddresses ?? []);
      })
      .catch(() => { if (!controller.signal.aborted) setMessage(errorMessage); });
    return () => controller.abort();
  }, [errorMessage]);

  async function edit(saved: SavedAddress) {
    setBusy(true);
    setMessage("");
    try {
      let options = countries;
      if (!options.length) {
        const response = await fetch("/api/countries");
        if (!response.ok) throw new Error();
        options = (await response.json()).countries ?? [];
        if (!options.length) throw new Error();
        setCountries(options);
      }
      setAnswer(null);
      setEditing(saved);
    } catch {
      setMessage(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy || !answer || !editing) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, address: answer }),
      });
      if (!response.ok) throw new Error();
      const updated: SavedAddress = await response.json();
      setAddresses((rows) => rows?.map((row) => row.id === editing.id ? updated : row) ?? []);
      setEditing(null);
      setMessage(ar ? "تم حفظ العنوان." : "Address saved.");
    } catch {
      setMessage(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {message && <p role="status" className="text-sm text-espresso">{message}</p>}
      {!addresses && !message && <p role="status" className="text-sm text-fog">{ar ? "جارٍ التحميل…" : "Loading addresses…"}</p>}
      {addresses?.length === 0 && <p className="border border-ink/10 bg-white p-5 text-sm text-espresso">{ar ? "ستظهر عناوينك هنا بعد إتمام طلب." : "Your delivery addresses will appear here after you place an order."}</p>}
      {addresses?.map((saved) => (
        <section key={saved.id} className={`border bg-white p-5 ${editing?.id === saved.id ? "border-gold" : "border-ink/10"}`}>
          <div className="flex items-center gap-3">
            <MapPin aria-hidden className="size-5 shrink-0 text-gold" />
            <div className="min-w-0 flex-1 text-sm">
              <h2 className="font-semibold text-ink">{saved.address.label === "work" ? (ar ? "العمل" : "Work") : (ar ? "المنزل" : "Home")}</h2>
              <p className="break-words text-espresso">{addressSummary(saved.address)}</p>
            </div>
            <Button variant="outline" disabled={busy} onClick={() => edit(saved)}>{ar ? "تعديل" : "Edit"}</Button>
          </div>
          {editing?.id === saved.id && (
            <div className="mt-5 border-t border-ink/10 pt-5">
              <DeliveryAddress locale={locale} countries={countries}
                initial={addressIsSupported(saved.address, countries) ? saved.address : { ...saved.address, countryCode: undefined, state: "", lat: null, lng: null }}
                onChange={(value, valid) => setAnswer(valid ? value : null)} />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={!answer || busy} onClick={save}>{ar ? "حفظ العنوان" : "Save address"}</Button>
                <Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>{ar ? "إلغاء" : "Cancel"}</Button>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
