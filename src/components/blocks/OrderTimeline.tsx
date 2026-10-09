import { Check, X } from "lucide-react";
import { JOURNEY, journeyIndex } from "@/lib/order-status";
import type { Locale } from "@/i18n/routing";

/** Shopper-facing journey: a completion timeline, not a status chip.
    Linear progress for live orders; a two-node branch for terminal ones. */
export function OrderTimeline({ status, locale }: { status: string; locale: Locale }) {
  const idx = journeyIndex(status);
  const terminal = status === "cancelled" || status === "returned";
  const terminalLabel = status === "cancelled"
    ? locale === "ar" ? "ملغي" : "Cancelled"
    : locale === "ar" ? "مُرجع" : "Returned";

  if (terminal) {
    return (
      <ol className="mt-4 space-y-0" aria-label={status}>
        <Step done label={locale === "ar" ? JOURNEY[0].labelAr : JOURNEY[0].label} first last={false} />
        <Step terminal label={terminalLabel} first={false} last />
      </ol>
    );
  }

  const current = idx < 0 ? 0 : idx;
  return (
    <ol className="mt-4" aria-label={status}>
      {JOURNEY.map((s, i) => (
        <Step
          key={s.id}
          done={i < current}
          current={i === current}
          label={locale === "ar" ? s.labelAr : s.label}
          first={i === 0}
          last={i === JOURNEY.length - 1}
        />
      ))}
    </ol>
  );
}

function Step({
  done = false,
  current = false,
  terminal = false,
  label,
  first,
  last,
}: {
  done?: boolean;
  current?: boolean;
  terminal?: boolean;
  label: string;
  first: boolean;
  last: boolean;
}) {
  const meta = terminal
    ? { ring: "border-[#9c2b2e] bg-[#9c2b2e] text-white", line: "bg-[#9c2b2e]/40" }
    : done
      ? { ring: "border-gold bg-gold text-ink", line: "bg-gold/60" }
      : current
        ? { ring: "border-gold bg-white", line: "bg-ink/10" }
        : { ring: "border-ink/25 bg-white", line: "bg-ink/10" };
  return (
    <li className="flex gap-3">
      <span className="flex flex-col items-center" aria-hidden>
        {!first && <span className={`h-2 w-px ${done || current ? "bg-gold/60" : "bg-ink/10"}`} />}
        <span className={`relative flex size-6 items-center justify-center rounded-full border ${meta.ring}`}>
          {current && !terminal && (
            <span className="absolute inset-0 animate-ping rounded-full border border-gold" />
          )}
          {done && <Check className="size-3.5" strokeWidth={2.5} />}
          {terminal && <X className="size-3.5" strokeWidth={2.5} />}
          {current && !terminal && <span className="size-1.5 rounded-full bg-gold" />}
        </span>
        {!last && <span className={`w-px flex-1 ${done ? "bg-gold/60" : meta.line}`} style={{ minHeight: 14 }} />}
      </span>
      <span
        className={`pb-5 text-[13px] ${done || current ? "font-semibold text-ink" : "text-fog"} ${first ? "-mt-0.5" : ""}`}
      >
        {label}
      </span>
    </li>
  );
}
