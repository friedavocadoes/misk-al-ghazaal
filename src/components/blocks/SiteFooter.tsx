import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { NewsletterSection } from "./NewsletterSection";
import { SITE, getFooterColumns } from "@/lib/site";
import { pick } from "@/lib/i18n";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  const tn = await getTranslations({ locale, namespace: "Newsletter" });
  const columns = getFooterColumns(locale);
  return (
    <footer className="mt-20 border-t border-ink/10 bg-sand/60">
      <NewsletterSection
        eyebrow={tn("eyebrow")}
        title={tn("title")}
        text={tn("text")}
        placeholder={tn("placeholder")}
        join={tn("join")}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl tracking-[0.08em] text-ink">
            MISK AL GHAZAAL
          </p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-espresso">
            {pick(SITE.tagline, locale)} {t("taglineSuffix")}
          </p>
          <p className="mt-4 text-[12px] text-fog">
            {pick(SITE.address, locale)}
            <br />
            {pick(SITE.hours, locale)}
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
        © 2026 Misk Al Ghazaal · {t("rights")}
      </div>
    </footer>
  );
}
