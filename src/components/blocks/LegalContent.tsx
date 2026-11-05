import { PrivacySettingsButton } from "@/components/analytics/PrivacyNotice";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CHECKOUT_TERMS_VERSION } from "@/lib/checkout-terms";
import { PRIVACY, TERMS } from "@/lib/legal-copy";
import { pick } from "@/lib/i18n";
import { SITE, STORE_CONTACT, SUPPORT_EMAIL } from "@/lib/site";

export function LegalContent({ locale, policy }: { locale: Locale; policy: "privacy" | "terms" }) {
  const ar = locale === "ar";
  const privacy = policy === "privacy";
  const sections = (privacy ? PRIVACY : TERMS)[locale];
  const merchant = (ar ? process.env.STORE_LEGAL_NAME_AR : process.env.STORE_LEGAL_NAME) || (ar ? "مسك الغزال" : "Misk Al Ghazaal");
  const address = (ar ? process.env.STORE_LEGAL_ADDRESS_AR : process.env.STORE_LEGAL_ADDRESS) || pick(SITE.address, locale);
  const licence = process.env.STORE_TRADE_LICENCE;
  const licenceUrl = process.env.STORE_TRADE_LICENCE_URL;
  const authority = (ar ? process.env.STORE_LICENSING_AUTHORITY_AR : process.env.STORE_LICENSING_AUTHORITY) || process.env.STORE_LICENSING_AUTHORITY;

  return (
    <article className="mx-auto max-w-3xl space-y-8 text-sm leading-7 text-espresso">
      {!privacy && <p className="text-xs text-fog">{ar ? "الإصدار" : "Version"} · <bdi>{CHECKOUT_TERMS_VERSION}</bdi></p>}
      {sections.map(([title, body]) => (
        <section key={title}>
          <h2 className="mb-2 text-lg font-medium text-ink">{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      <section>
        <h2 className="mb-2 text-lg font-medium text-ink">{ar ? "بيانات التاجر والتواصل" : "Merchant and contact details"}</h2>
        <address className="not-italic">
          <p>{merchant}</p>
          <p>{address}</p>
          {licence && <p>{ar ? "الرخصة التجارية" : "Trade licence"} · {licence}</p>}
          {licenceUrl?.startsWith("https://") && <p><a href={licenceUrl} className="underline underline-offset-4">{ar ? "عرض الرخصة التجارية" : "View trade licence"}</a></p>}
          {authority && <p>{ar ? "جهة الترخيص" : "Licensing authority"} · {authority}</p>}
          <p><a href={`tel:${STORE_CONTACT.landline.replace(/\s/g, "")}`} dir="ltr">{STORE_CONTACT.landline}</a></p>
          <p><a href={`mailto:${SUPPORT_EMAIL}`} dir="ltr" className="underline underline-offset-4">{SUPPORT_EMAIL}</a></p>
        </address>
        <p className="mt-3"><Link href="/pages/contact" className="underline underline-offset-4">{ar ? "تواصل مع خدمة العملاء" : "Contact customer care"}</Link></p>
      </section>
      <div className="flex flex-wrap gap-4 border-t border-ink/10 pt-5">
        <PrivacySettingsButton />
        {privacy ? (
          <a href="https://www.tap.company/en-ae/privacy" className="underline underline-offset-4">{ar ? "إشعار خصوصية Tap Payments" : "Tap Payments privacy notice"}</a>
        ) : (
          <Link href="/pages/privacy" className="underline underline-offset-4">{ar ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
        )}
      </div>
    </article>
  );
}
