import { ContactMotion } from "./ContactMotion";
import { Suspense } from "react";
import { ContactChannels } from "./ContactChannels";
import { ContactExperience, type ContactTopic } from "./ContactExperience";
import { SITE } from "@/lib/site";
import { pick } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
export function ContactLanding({
  locale,
  title,
  eyebrow,
  products,
  initialTopic,
}: {
  locale: Locale;
  title: string;
  eyebrow: string;
  products:
    | { slug: string; title: string; titleAr?: string }[]
    | Promise<{ slug: string; title: string; titleAr?: string }[]>;
  initialTopic: ContactTopic | null;
}) {
  const ar = locale === "ar";
  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero-light" aria-hidden />
        <div className="contact-hero-art" aria-hidden>
          <svg viewBox="0 0 600 600" fill="none">
            <defs>
              <linearGradient id="contact-line" x1="0" y1="0" x2="600" y2="600">
                <stop stopColor="#e8dcb5" stopOpacity=".7" />
                <stop offset="1" stopColor="#fff" stopOpacity=".03" />
              </linearGradient>
            </defs>
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d={`M ${80 + i * 13} 550 C ${540 - i * 9} ${500 - i * 10}, ${-120 + i * 22} ${110 + i * 8}, ${440 + i * 10} ${30 + i * 5}`}
                stroke="url(#contact-line)"
                strokeWidth="1"
              />
            ))}
            <path
              d="M245 215h110v225c0 20-110 20-110 0V215Zm10-8h90v-18h-90v18Zm18-25h54v-58h-54v58Z"
              stroke="url(#contact-line)"
            />
            <path d="M265 290h70v70h-70z" stroke="url(#contact-line)" />
            <text
              x="300"
              y="333"
              textAnchor="middle"
              fill="#eadfc4"
              fontSize="22"
              fontWeight="200"
              opacity=".6"
            >
              M
            </text>
          </svg>
        </div>
        <div className="contact-hero-content">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>
            {ar
              ? "لفكرة جديدة، أو سؤال صغير، أو حديث عن العطر. نحن بالقرب منك."
              : "For a new idea, a small question, or a conversation about scent. We’re close by."}
          </p>
          <a href="#correspondence" className="contact-hero-cta">
            {ar ? "اكتب إلينا" : "Start a conversation"}
            <span aria-hidden>↓</span>
          </a>
        </div>
        <div className="contact-hero-caption">
          <span>
            {ar
              ? "دبي، الإمارات العربية المتحدة"
              : "Dubai, United Arab Emirates"}
          </span>
          <span>{ar ? "لمسة شخصية، دائماً" : "Always personal."}</span>
        </div>
      </section>
      <ContactMotion>
        <ContactChannels locale={locale} />
        <section id="correspondence" className="contact-correspondence">
          <div
            className="contact-section-heading studio-form-heading"
            data-contact-reveal
          >
            <p className="eyebrow">{ar ? "على مهل" : "At your own pace"}</p>
            <h2>{ar ? "لنجعله حديثاً شخصياً" : "Make it personal."}</h2>
          </div>
          <Suspense
            fallback={
              <div
                className="contact-experience min-h-96 animate-pulse p-8"
                aria-busy="true"
              >
                <p className="text-sm text-fog">
                  {ar ? "جارٍ تجهيز رسالتك…" : "Preparing your conversation…"}
                </p>
              </div>
            }
          >
            <ContactInquiry products={products} initialTopic={initialTopic} />
          </Suspense>
        </section>
        <p className="contact-address-line">{pick(SITE.address, locale)}</p>
      </ContactMotion>
    </div>
  );
}

async function ContactInquiry({
  products,
  initialTopic,
}: {
  products:
    | { slug: string; title: string; titleAr?: string }[]
    | Promise<{ slug: string; title: string; titleAr?: string }[]>;
  initialTopic: ContactTopic | null;
}) {
  return (
    <ContactExperience products={await products} initialTopic={initialTopic} />
  );
}
