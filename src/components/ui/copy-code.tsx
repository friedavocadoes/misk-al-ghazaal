"use client";

import { useState } from "react";
import { Check } from "lucide-react";

/** Copy-to-clipboard ticket button (CSS flips on data-done, no re-render). */
export function CopyCode({ code, label, copied }: { code: string; label: string; copied: string }) {
  const onCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    try {
      navigator.clipboard?.writeText(code).catch(() => {});
    } catch {
      /* clipboard unavailable — code stays visible to type manually */
    }
    el.dataset.done = "1";
    setTimeout(() => {
      delete el.dataset.done;
    }, 1500);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className="shrink-0 border border-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition hover:bg-ink hover:text-white data-[done]:border-[#1e7a46] data-[done]:bg-[#1e7a46] data-[done]:text-white"
    >
      <span className="hidden data-[done]:inline">
        <Check className="mr-1 inline size-3.5" />
        {copied}
      </span>
      <span className="data-[done]:hidden">{label}</span>
    </button>
  );
}
