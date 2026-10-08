"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** One-tap copy for phone numbers — clipboard API with execCommand fallback. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border transition-all",
        done
          ? "border-[#1e7a46]/50 bg-[#1e7a46]/10 text-[#1e7a46]"
          : "border-ink/15 text-fog hover:border-ink/40 hover:text-ink",
        className,
      )}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" strokeWidth={1.75} />}
    </button>
  );
}
