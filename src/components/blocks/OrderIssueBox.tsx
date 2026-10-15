"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type IssueType = "change_address" | "change_date" | "cancel" | "refund_status" | "other";

const TYPES: IssueType[] = ["change_address", "change_date", "cancel", "refund_status", "other"];

const TYPE_EN: Record<IssueType, { label: string; hint: string }> = {
  change_address: { label: "Change address", hint: "Moved? Fix the delivery address before dispatch." },
  change_date: { label: "Change delivery date", hint: "Unavailable? Pick a better day." },
  cancel: { label: "Cancel order", hint: "Stop this order before it ships." },
  refund_status: { label: "Refund status", hint: "For cancelled / returned orders." },
  other: { label: "Something else", hint: "Anything not covered above." },
};

/** "Having trouble with your order?" multistep → orders@ → support@. */
export function OrderIssueBox({
  orderId,
  orderNo,
  status,
}: {
  orderId: string;
  orderNo: string;
  status: string;
}) {
  const t = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<IssueType>(
    status === "cancelled" || status === "returned" ? "refund_status" : "change_address",
  );
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const validDetails = (): boolean => {
    if (type === "change_address") return !!(fields.address ?? "").trim();
    if (type === "change_date") return !!(fields.date ?? "").trim();
    if (type === "cancel") return !!(fields.reason ?? "").trim();
    if (type === "other") return !!((fields.subject ?? "").trim() && (fields.description ?? "").trim());
    return true;
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/order-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, type, fields }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Something went wrong — try again.");
      setDone(true);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full border border-ink/20 bg-white px-3 py-2 text-sm text-ink";

  return (
    <div className="mt-4 border border-dashed border-gold/50 bg-gold-wash/30 p-4 md:p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full cursor-pointer text-left"
        >
          <span className="block font-display text-lg text-ink">{t("orderIssueTitle")}</span>
          <span className="mt-0.5 block text-[13px] text-espresso">{t("orderIssueText")}</span>
          <span className="mt-2 inline-block text-[12px] font-semibold uppercase tracking-[0.18em] text-gold underline underline-offset-4">
            {t("orderIssueCta")} →
          </span>
        </button>
      ) : done ? (
        <div className="text-sm text-espresso">
          <p className="font-display text-xl text-ink">Received with thanks.</p>
          <p className="mt-1">
            Our client-care desk has your request for order {orderNo} and will reply within 24
            hours.
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setDone(false);
              setStep(0);
              setFields({});
            }}
            className="mt-3 cursor-pointer text-[12px] font-semibold uppercase tracking-[0.18em] text-fog underline underline-offset-4"
          >
            Close
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
              {orderNo} · step {Math.min(step + 1, 3)} / 3
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer text-[12px] text-fog underline underline-offset-4"
            >
              Close
            </button>
          </div>

          {step === 0 && (
            <div className="mt-3 grid gap-2">
              {TYPES.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setType(k);
                    setStep(1);
                  }}
                  className={`cursor-pointer border p-3 text-left transition ${
                    type === k ? "border-gold bg-white" : "border-ink/15 bg-white/60 hover:border-gold/60"
                  }`}
                >
                  <span className="block text-sm font-medium text-ink">{TYPE_EN[k].label}</span>
                  <span className="block text-[13px] text-fog">{TYPE_EN[k].hint}</span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="mt-3 grid gap-3">
              {type === "change_address" && (
                <>
                  <label className="block text-sm">New street address*<input value={fields.address ?? ""} onChange={set("address")} className={inputCls} placeholder="Building, street, area" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">City<input value={fields.city ?? ""} onChange={set("city")} className={inputCls} /></label>
                    <label className="block text-sm">Region<input value={fields.state ?? ""} onChange={set("state")} className={inputCls} /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">Pincode<input value={fields.postcode ?? ""} onChange={set("postcode")} className={inputCls} /></label>
                    <label className="block text-sm">Phone<input value={fields.phone ?? ""} onChange={set("phone")} className={inputCls} dir="ltr" /></label>
                  </div>
                  <label className="block text-sm">Note (optional)<input value={fields.note ?? ""} onChange={set("note")} className={inputCls} /></label>
                </>
              )}
              {type === "change_date" && (
                <>
                  <label className="block text-sm">Preferred delivery date*<input type="date" value={fields.date ?? ""} onChange={set("date")} className={inputCls} /></label>
                  <label className="block text-sm">Why are you unavailable?<input value={fields.note ?? ""} onChange={set("note")} className={inputCls} placeholder="e.g. travelling until Friday" /></label>
                </>
              )}
              {type === "cancel" && (
                <>
                  <label className="block text-sm">
                    Reason*
                    <select value={fields.reason ?? ""} onChange={set("reason")} className={inputCls}>
                      <option value="">Select…</option>
                      <option>Ordered by mistake</option>
                      <option>Found it elsewhere</option>
                      <option>Delivery is taking too long</option>
                      <option>Changed my mind</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="block text-sm">Details<textarea value={fields.note ?? ""} onChange={set("note")} rows={3} className={inputCls} /></label>
                </>
              )}
              {type === "refund_status" && (
                <label className="block text-sm">Anything we should know?<textarea value={fields.note ?? ""} onChange={set("note")} rows={3} className={inputCls} placeholder="e.g. paid by card machine, waiting 5 days" /></label>
              )}
              {type === "other" && (
                <>
                  <label className="block text-sm">Subject*<input value={fields.subject ?? ""} onChange={set("subject")} className={inputCls} /></label>
                  <label className="block text-sm">Description*<textarea value={fields.description ?? ""} onChange={set("description")} rows={4} className={inputCls} /></label>
                </>
              )}
              {error && <p className="text-[12px] font-semibold text-[#9c2b2e]">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(0)} className="cursor-pointer border border-ink/20 px-4 py-2 text-[12px] uppercase tracking-[0.16em]">Back</button>
                <button
                  type="button"
                  onClick={() => validDetails() ? setStep(2) : setError("Please complete the required fields.")}
                  className="cursor-pointer bg-ink px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-white"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-3 text-sm">
              <p className="text-espresso">
                Send <strong>{TYPE_EN[type].label}</strong> for order <strong>{orderNo}</strong> to
                our client-care desk?
              </p>
              {error && <p className="mt-2 text-[12px] font-semibold text-[#9c2b2e]">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="cursor-pointer border border-ink/20 px-4 py-2 text-[12px] uppercase tracking-[0.16em]">Back</button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="cursor-pointer bg-ink px-4 py-2 text-[12px] uppercase tracking-[0.16em] text-white disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send request"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
