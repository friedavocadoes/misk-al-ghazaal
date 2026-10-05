import Link from "next/link";
import { NewsletterSection } from "./NewsletterSection";
import { SITE, getFooterColumns } from "@/lib/site";

export function SiteFooter() {
  const columns = getFooterColumns();
  return (
    <footer className="mt-20 border-t border-ink/10 bg-sand/60">
      <NewsletterSection />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl tracking-[0.08em] text-ink">
            GAZAAL
          </p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-espresso">
            {SITE.tagline} Crafted for the Emirates.
          </p>
          <p className="mt-4 text-[12px] text-fog">
            {SITE.address}
            <br />
            {SITE.hours}
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
              {col.heading}
            </p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-espresso transition hover:text-gold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ink/10 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-fog">
        © 2026 Gazaal Perfumes · Prices in AED · Cash on Delivery within UAE
      </div>
    </footer>
  );
}
