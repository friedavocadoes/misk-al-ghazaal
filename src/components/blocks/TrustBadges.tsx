"use client";

import { getPerks } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

export function TrustBadges({ locale }: { locale: Locale }) {
  const perks = getPerks(locale);
  return (
    <div className="grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 lg:grid-cols-4">
      {perks.map((item) => (
        <div key={item.title} className="bg-cream px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
            {item.title}
          </p>
          <p className="mt-1 text-xs text-fog">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}
