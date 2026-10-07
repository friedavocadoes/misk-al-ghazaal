import type { Locale } from "@/i18n/routing";
import { getAnnouncement } from "@/lib/site";

// Slim ink strip carrying the delivery/COD promise — lives on commerce
// pages (collection tops, PDP) instead of above the navbar.
export function PromoStrip({ locale }: { locale: Locale }) {
  return (
    <div className="bg-ink">
      <p className="mx-auto max-w-7xl whitespace-nowrap px-5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 md:px-8">
        {getAnnouncement(locale)}
      </p>
    </div>
  );
}
