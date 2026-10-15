"use client";

import { useState, useTransition } from "react";
import { DIAL_CODES, combinePhone, splitPhone } from "@/lib/dial-codes";
import { saveContactDetails } from "../actions";

/** Personal details editor: name + dial-code mobile. Initial values are
    the live profile (autopulled server-side) — saving rewrites the
    account name everywhere (auth metadata + profile). */
export function SettingsForm({
  initialName,
  initialPhone,
  labels,
}: {
  initialName: string;
  initialPhone: string;
  labels: {
    name: string;
    nameHint: string;
    phone: string;
    phoneHint: string;
    code: string;
    save: string;
    saving: string;
    saved: string;
  };
}) {
  const start = splitPhone(initialPhone);
  const [name, setName] = useState(initialName);
  const [dial, setDial] = useState(start.dial);
  const [national, setNational] = useState(start.national);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const combined = combinePhone(dial, national);
  const dirty =
    name.trim() !== initialName.trim() || combined !== (initialPhone || "");

  return (
    <form
      className="mt-6 grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => {
          const r = await saveContactDetails({ name: name.trim(), phone: combined });
          setMsg(r.ok ? { ok: true, text: labels.saved } : { ok: false, text: r.error });
        });
      }}
    >
      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {labels.name}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="name"
          placeholder={labels.nameHint}
          className="mt-2 w-full border border-ink/20 px-4 py-3 text-[15px] text-ink placeholder:text-fog/60 focus:border-gold focus:outline-none"
        />
      </label>

      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {labels.phone}
        </span>
        <p className="mt-1 text-[13px] text-fog">{labels.phoneHint}</p>
        <div className="mt-2 flex gap-2" dir="ltr">
          <label className="shrink-0">
            <span className="sr-only">{labels.code}</span>
            <select
              value={dial}
              onChange={(e) => setDial(e.target.value)}
              className="h-full cursor-pointer border border-ink/20 bg-white px-3 py-3 text-[15px] text-ink focus:border-gold focus:outline-none"
            >
              {DIAL_CODES.map((d) => (
                <option key={`${d.code}-${d.country}`} value={d.code}>
                  +{d.code} · {d.country}
                </option>
              ))}
            </select>
          </label>
          <input
            value={national}
            onChange={(e) => setNational(e.target.value.replace(/[^\d\s-]/g, ""))}
            inputMode="tel"
            autoComplete="tel"
            className="min-w-0 flex-1 border border-ink/20 px-4 py-3 text-[15px] text-ink focus:border-gold focus:outline-none"
          />
        </div>
        {combined && (
          <p className="mt-1.5 text-[13px] text-fog" dir="ltr">
            {combined}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="cursor-pointer bg-ink px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-gold-soft hover:text-ink disabled:cursor-default disabled:opacity-40"
        >
          {pending ? labels.saving : labels.save}
        </button>
        {msg && (
          <span className={`text-[13px] ${msg.ok ? "text-[#1e7a46]" : "text-[#9c2b2e]"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
