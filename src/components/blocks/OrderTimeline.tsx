import { Check, X } from "lucide-react";
import { JOURNEY, journeyIndex } from "@/lib/order-status";
import type { Locale } from "@/i18n/routing";

/** Shopper-facing journey: a horizontal completion rail. Done nodes are
    gold checks, the live step pulses, the future stays hollow. Terminal
    states (cancelled/returned) collapse to placed ✓ + red endpoint. */
export function OrderTimeline({ status, locale }: { status: string; locale: Locale }) {
  const idx = journeyIndex(status);
  const terminal = status === "cancelled" || status === "returned";
  const terminalLabel =
    status === "cancelled"
      ? locale === "ar" ? "ملغي" : "Cancelled"
      : locale === "ar" ? "مُرجع" : "Returned";
  const labelOf = (i: number) => (locale === "ar" ? JOURNEY[i].labelAr : JOURNEY[i].label);

  if (terminal) {
    return (
      <ol className="mt-5 flex items-start" aria-label={status}>
        <Node done label={labelOf(0)} />
        <Connector done={false} />
        <Node terminal label={terminalLabel} />
      </ol>
    );
  }

  const current = idx < 0 ? 0 : idx;
  return (
    <ol className="mt-5 flex items-start" aria-label={status}>
      {JOURNEY.map((s, i) => (
        <span key={s.id} className="flex flex-1 items-start last:flex-none">
          <Node
            done={i < current}
            current={i === current}
            label={locale === "ar" ? s.labelAr : s.label}
          />
          {i < JOURNEY.length - 1 && <Connector done={i < current} />}
        </span>
      ))}
    </ol>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <span aria-hidden className="mx-1 mt-[11px] h-px min-w-3 flex-1 bg-ink/15">
      <span className={`block h-full ${done ? "bg-gold" : ""}`} />
    </span>
  );
}

function Node({
  done = false,
  current = false,
  terminal = false,
  label,
}: {
  done?: boolean;
  current?: boolean;
  terminal?: boolean;
  label: string;
}) {
  const ring = terminal
    ? "border-[#9c2b2e] bg-[#9c2b2e] text-white"
    : done
      ? "border-gold bg-gold text-ink"
      : current
        ? "border-gold bg-white"
        : "border-ink/25 bg-white";
  return (
    <span className="flex w-14 shrink-0 flex-col items-center gap-1.5 text-center">
      <span className={`relative flex size-6 items-center justify-center rounded-full border ${ring}`}>
        {current && !terminal && (
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-gold" />
        )}
        {done && <Check className="size-3.5" strokeWidth={2.5} />}
        {terminal && <X className="size-3.5" strokeWidth={2.5} />}
        {current && !terminal && <span aria-hidden className="size-1.5 rounded-full bg-gold" />}
      </span>
      <span
        className={`text-[10px] leading-tight ${
          done || current || terminal ? "font-semibold text-ink" : "text-fog"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
