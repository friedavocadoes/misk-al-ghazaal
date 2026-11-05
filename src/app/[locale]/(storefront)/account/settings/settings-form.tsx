"use client";

import { useTranslations } from "next-intl";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useTransition } from "react";
import { DIAL_CODES, combinePhone, splitPhone } from "@/lib/dial-codes";
import { saveContactDetails } from "../actions";

const dialOptions = Array.from(new Set(DIAL_CODES.map(entry => entry.code))).map(code => ({
  value: code,
  label: "+" + code + " · " + DIAL_CODES.filter(entry => entry.code === code).map(entry => entry.country).join(", "),
}));

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
  const t = useTranslations("Account");
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
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="name"
          placeholder={labels.nameHint}
          className="mt-2 text-[15px]"
        />
      </label>

      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {labels.phone}
        </span>
        <p className="mt-1 text-[13px] text-fog">{labels.phoneHint}</p>
        <div className="mt-2 flex gap-2" dir="ltr">
          <div className="w-40 shrink-0 sm:w-52">
            <Combobox
              value={dial}
              onChange={setDial}
              options={dialOptions}
              placeholder={labels.code}
              ariaLabel={labels.code}
              searchPlaceholder={t("searchDialCode")}
              emptyText={t("noDialCodes")}
            />
          </div>
          <Input
            aria-label={labels.phone}
            value={national}
            onChange={(e) => setNational(e.target.value.replace(/[^\d\s-]/g, ""))}
            inputMode="tel"
            autoComplete="tel"
            className="h-auto min-w-0 flex-1 text-[15px]"
          />
        </div>
        {combined && (
          <p className="mt-1.5 text-[13px] text-fog" dir="ltr">
            {combined}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? labels.saving : labels.save}
        </Button>
        {msg && (
          <span className={`text-[13px] ${msg.ok ? "text-[#1e7a46]" : "text-[#9c2b2e]"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
