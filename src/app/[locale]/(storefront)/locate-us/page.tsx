import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Clock,
  Factory,
  MapPin,
  Navigation,
  Phone,
  Store as StoreIcon,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { CopyButton } from "@/components/ui/copy-button";
import { LOCATIONS, STORE_CONTACT, waLink, type StoreLocation } from "@/lib/site";
import { pick, type Localizable } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
import { L } from "@/lib/site";
import { toLocale } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { customJsonLd, getPageSeo, seoMetadata } from "@/lib/seo";

const WA_GREEN = "text-[#1e7a46]";

/** One number, two ways to reach it: WhatsApp chat (green bubble) and voice
    call (ink handset) side by side — visually distinct, no words needed
    beyond the line label. Stands apart from the landline row below. */
function DirectLine({
  number,
  label,
  chatLabel,
  callLabel,
  copyLabel,
}: {
  number: string;
  label: string;
  chatLabel: string;
  callLabel: string;
  copyLabel: string;
}) {
  return (
    <div className="flex items-center gap-4 border border-ink/10 bg-sand/60 p-4">
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
          {label}
        </span>
        <span className="mt-0.5 block text-sm font-medium text-ink" dir="ltr">
          {number}
        </span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <a
          href={waLink(number)}
          target="_blank"
          rel="noreferrer"
          aria-label={chatLabel}
          title={chatLabel}
          className="flex size-10 items-center justify-center rounded-full border border-[#1e7a46]/35 bg-white transition-all hover:border-[#1e7a46] hover:bg-[#1e7a46]/[0.12]"
        >
          <WhatsAppIcon className={`size-[18px] ${WA_GREEN}`} />
        </a>
        <a
          href={`tel:${number.replace(/\s/g, "")}`}
          aria-label={callLabel}
          title={callLabel}
          className="flex size-10 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-gold-soft hover:text-ink"
        >
          <Phone className="size-4" strokeWidth={1.75} />
        </a>
        <CopyButton value={number} label={copyLabel} className="bg-white cursor-pointer" />
      </span>
    </div>
  );
}

function MapFrame({ loc }: { loc: StoreLocation }) {
  if (!loc.embedSrc) {
    // Factory map intentionally empty — owner pastes the embed URL in
    // LOCATIONS.factory (lib/site.ts) when ready.
    return (
      <div className="relative w-full overflow-hidden bg-ink/5 p-2 lg:p-3">
        <div className="flex h-[320px] w-full flex-col items-center justify-center gap-4 border border-dashed border-gold/50 bg-cream md:h-[420px]">
          <span className="flex size-12 items-center justify-center rounded-full border border-gold/40 text-gold">
            <MapPin className="size-5" strokeWidth={1.5} />
          </span>
          <p className="eyebrow text-gold">Map coming soon</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full overflow-hidden bg-ink/5 p-2 lg:p-3">
      <div className="relative h-[320px] w-full overflow-hidden border border-ink/10 md:h-[420px]">
        <iframe
          title="Store map"
          src={loc.embedSrc}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0 transition-all duration-1000 ease-in-out filter grayscale hover:grayscale-0"
        />
      </div>
    </div>
  );
}

export async function generateMetadata(props: PageProps<"/[locale]/locate-us">): Promise<Metadata> {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  const seo = await getPageSeo("locate-us");
  return seoMetadata(
    seo,
    {
      title: "Locate Us — Misk Al Ghazaal Boutique & Factory",
      description: "Visit the Mamzar boutique or talk manufacturing at the factory.",
    },
    locale,
  );
}

export default async function LocateUsPage(
  props: PageProps<"/[locale]/locate-us">,
) {
  const { locale: raw } = await props.params;
  const locale: Locale = toLocale(raw);
  setRequestLocale(locale);
  const seo = await getPageSeo("locate-us");

  const eyebrow = pick(L("Locate Us", "موقعنا"), locale);
  const title = pick(L("Two doors, one maison.", "بابان ودار واحدة."), locale);
  const sub = pick(
    L(
      "Smell the collection at the boutique — or talk manufacturing at the factory. Pick your door.",
      "شمّوا التشكيلة في البوتيك — أو حدّثوا التصنيع في المصنع. اختاروا بابكم.",
    ),
    locale,
  );
  const directions = pick(L("Get Directions", "احصلوا على الاتجاهات"), locale);
  const hoursTitle = pick(L("Hours", "الساعات"), locale);
  const addressTitle = pick(L("Address", "العنوان"), locale);
  const talkTitle = pick(L("Talk to us", "كلّمونا"), locale);
  const landlineLabel = pick(L("Landline", "أرضي"), locale);
  const mobileLabel = pick(L("Mobile", "جوال"), locale);
  const chatLabel = pick(L("WhatsApp", "واتساب"), locale);
  const callLabel = pick(L("Call", "اتصال"), locale);
  const copyLabel = pick(L("Copy number", "نسخ الرقم"), locale);
  const meetingCta = pick(
    L("Planning a label? Book a factory meeting", "تخطط لعلامة؟ احجز اجتماع المصنع"),
    locale,
  );
  const writeCta = pick(
    L("Prefer to write? Send a message", "تفضل الكتابة؟ أرسل رسالة"),
    locale,
  );

  const store = LOCATIONS.store;
  const factory = LOCATIONS.factory;

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <SeoJsonLd blocks={customJsonLd(seo)} />
      {/* Editorial header */}
      <div className="flex flex-col items-center text-center">
        <p className="eyebrow flex items-center gap-3 tracking-[0.3em] text-gold">
          <span className="h-px w-8 bg-gold/50" />
          {eyebrow}
          <span className="h-px w-8 bg-gold/50" />
        </p>
        <h1 className="mt-6 max-w-2xl font-display text-4xl leading-tight text-ink md:text-6xl">
          {tx(seo?.h1 ?? "", seo?.h1Ar, locale) || title}
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-espresso md:text-base">
          {sub}
        </p>
      </div>

      {/* 01 — The Boutique */}
      <section className="mt-16 lg:mt-24">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 lg:pr-8">
            <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-fog">
              <span className="font-display text-lg italic text-gold">01</span>
              <StoreIcon className="size-4 text-gold" strokeWidth={1.5} />
              {pick(store.kind, locale)}
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
              {pick(store.name, locale)}
            </h2>
            <span className="mt-5 block h-px w-12 bg-gold-soft" />

            <div className="mt-8 space-y-7">
              <div className="flex items-start gap-5">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold">
                  <MapPin className="size-4" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
                    {addressTitle}
                  </h3>
                  {store.lines.map((ln, i) => (
                    <p key={i} className="mt-1.5 text-sm leading-relaxed text-espresso">
                      {pick(ln as Localizable<string>, locale)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-5">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold">
                  <Clock className="size-4" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
                    {hoursTitle}
                  </h3>
                  {store.hours.map((h, i) => (
                    <p key={i} className="mt-1.5 text-sm leading-relaxed text-espresso">
                      {pick(h as Localizable<string>, locale)}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
                  <span className="flex size-10 items-center justify-center rounded-full border border-gold/30 text-gold">
                    <Phone className="size-4" strokeWidth={1.5} />
                  </span>
                  {talkTitle}
                </h3>
                <div className="sm:ps-[60px]">
                  <DirectLine
                    number={STORE_CONTACT.shopMobile}
                    label={mobileLabel}
                    chatLabel={chatLabel}
                    callLabel={callLabel}
                    copyLabel={copyLabel}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 border border-ink/10 bg-sand/60 px-4 py-3">
                    <span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
                        {landlineLabel}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-ink" dir="ltr">
                        {STORE_CONTACT.landline}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <a
                        href={`tel:${STORE_CONTACT.landline.replace(/\s/g, "")}`}
                        aria-label={callLabel}
                        title={callLabel}
                        className="flex size-10 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-gold-soft hover:text-ink"
                      >
                        <Phone className="size-4" strokeWidth={1.75} />
                      </a>
                      <CopyButton
                        value={STORE_CONTACT.landline}
                        label={copyLabel}
                        className="bg-white cursor-pointer"
                      />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href={store.mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-ink px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition-all hover:bg-gold-soft hover:text-ink"
              >
                <Navigation className="size-4" />
                {directions}
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <MapFrame loc={store} />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="my-16 flex items-center gap-4 md:my-24" aria-hidden>
        <span className="h-px flex-1 bg-ink/10" />
        <span className="size-1.5 rotate-45 bg-gold-soft" />
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      {/* 02 — The Factory */}
      <section>
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <MapFrame loc={factory} />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-5 lg:pl-8">
            <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-fog">
              <span className="font-display text-lg italic text-gold">02</span>
              <Factory className="size-4 text-gold" strokeWidth={1.5} />
              {pick(factory.kind, locale)}
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
              {pick(factory.name, locale)}
            </h2>
            <span className="mt-5 block h-px w-12 bg-gold-soft" />

            <div className="mt-8 space-y-7">
              <div className="flex items-start gap-5">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold">
                  <MapPin className="size-4" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
                    {addressTitle}
                  </h3>
                  {factory.lines.map((ln, i) => (
                    <p key={i} className="mt-1.5 text-sm leading-relaxed text-espresso">
                      {pick(ln as Localizable<string>, locale)}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
                  <span className="flex size-10 items-center justify-center rounded-full border border-gold/30 text-gold">
                    <Phone className="size-4" strokeWidth={1.5} />
                  </span>
                  {talkTitle}
                </h3>
                <div className="sm:ps-[60px]">
                  <DirectLine
                    number={STORE_CONTACT.factoryPhone}
                    label={mobileLabel}
                    chatLabel={chatLabel}
                    callLabel={callLabel}
                    copyLabel={copyLabel}
                  />
                </div>
              </div>
            </div>

            <Link
              href="/pages/contact?topic=meeting"
              className="group mt-9 inline-flex items-center gap-3 border border-ink px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition-all hover:bg-ink hover:text-white"
            >
              {meetingCta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Way out to Contact */}
      <div className="mt-16 border border-ink/10 bg-sand/50 px-6 py-8 text-center md:mt-24 md:py-10">
        <p className="font-display text-2xl text-ink md:text-3xl">{writeCta}</p>
        <Link
          href="/pages/contact"
          className="group mt-4 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
        >
          <span className="border-b border-ink/30 pb-1 transition-colors group-hover:border-gold group-hover:text-gold">
            {pick(L("Write to the Maison", "راسلوا الدار"), locale)}
          </span>
          <ArrowRight className="size-4 text-gold transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
