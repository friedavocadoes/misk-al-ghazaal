"use client";

import { useState, useTransition } from "react";
import { Phone } from "lucide-react";
import { saveContactDetails } from "./actions";

/** Account contact editor: name + mobile live here (not locked anywhere —
    checkout only borrows them as editable autofill). */
export function ProfileContactForm({
  initialName,
  initialPhone,
  labels,
}: {
  initialName: string;
  initialPhone: string;
  labels: { title: string; name: string; phone: string; save: string; saving: string; saved: string; hint: string };
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    name.trim() !== initialName.trim() || phone.trim() !== initialPhone.trim();

  return (
    <section className="mt-6 border border-ink/10 bg-white p-6 md:p-8">
      <p className="eyebrow flex items-center gap-2 text-gold">
        <Phone className="size-4" /> {labels.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-espresso">{labels.hint}</p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          startTransition(async () => {
            const r = await saveContactDetails({ name: name.trim(), phone: phone.trim() });
            setMsg(r.ok ? { ok: true, text: labels.saved } : { ok: false, text: r.error });
          });
        }}
      >
        <label className="block text-sm">
          {labels.name}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            className="mt-1 w-full border border-ink/20 px-3 py-2.5 text-ink"
          />
        </label>
        <label className="block text-sm">
          {labels.phone}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={24}
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder="+971 …"
            className="mt-1 w-full border border-ink/20 px-3 py-2.5 text-ink"
          />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending || !dirty}
            className="cursor-pointer bg-ink px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-gold-soft hover:text-ink disabled:cursor-default disabled:opacity-40"
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
    </section>
  );
}
