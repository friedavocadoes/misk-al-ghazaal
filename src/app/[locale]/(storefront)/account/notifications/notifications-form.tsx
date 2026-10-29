"use client";

import { useState, useTransition } from "react";
import { saveEmailPrefs } from "../actions";

/** Email preferences: two real switches. Saving writes profiles — the
    mail paths (noreply order mails, promo campaigns) read these flags. */
export function NotificationsForm({
  initialPromo,
  accountEmail,
  labels,
}: {
  initialOrder: boolean;
  initialPromo: boolean;
  accountEmail: string;
  labels: {
    orderTitle: string;
    orderText: string;
    promoTitle: string;
    promoText: string;
    save: string;
    saving: string;
    saved: string;
    to: string;
  };
}) {
  const order = true;
  const [promo, setPromo] = useState(initialPromo);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = promo !== initialPromo;

  const row = (
    checked: boolean,
    set: (v: boolean) => void,
    title: string,
    text: string,
  ) => (
    <label className="flex cursor-pointer items-start gap-3 border border-ink/10 bg-cream/50 p-4 transition hover:border-gold/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => set(e.target.checked)}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-[#8a6d2f]"
      />
      <span>
        <span className="block text-[15px] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-fog">
          {text}
        </span>
      </span>
    </label>
  );

  return (
    <form
      className="mt-6 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => {
          const r = await saveEmailPrefs({ orderUpdates: order, promo });
          setMsg(
            r.ok
              ? { ok: true, text: labels.saved }
              : { ok: false, text: r.error },
          );
        });
      }}
    >
      <p className="text-[13px] text-fog" dir="ltr">
        {labels.to}:{" "}
        <span className="font-medium text-ink">{accountEmail}</span>
      </p>
      <label className="flex gap-3 border border-ink/10 p-4 opacity-55">
        <input type="checkbox" checked disabled />
        <span className="text-sm">
          {labels.orderTitle}
          <span className="mt-1 block text-xs leading-6">
            {labels.orderText}
          </span>
        </span>
      </label>
      {row(promo, setPromo, labels.promoTitle, labels.promoText)}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="cursor-pointer bg-ink px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-gold-soft hover:text-ink disabled:cursor-default disabled:opacity-40"
        >
          {pending ? labels.saving : labels.save}
        </button>
        {msg && (
          <span
            className={`text-[13px] ${msg.ok ? "text-[#1e7a46]" : "text-[#9c2b2e]"}`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
