"use client";

import { Truck, PackageCheck, Banknote, RotateCcw } from "lucide-react";
import { getPerks } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

export function TrustBadges({ locale, editorial = false }: { locale: Locale; editorial?: boolean }) {
  const perks = getPerks(locale);
  const icons = [Truck, PackageCheck, Banknote, RotateCcw];
  return (
    <div className={editorial ? "pdp-assurances" : "grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 lg:grid-cols-4"}>
      {perks.map((item, index) => { const Icon = icons[index % icons.length]; return (
        <div key={item.title} className="bg-cream px-4 py-4">
          {editorial && <Icon size={17} strokeWidth={1.25} />}
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
            {item.title}
          </p>
          <p className="mt-1 text-xs text-fog">{item.desc}</p>
        </div>
      ); })}
    </div>
  );
}
