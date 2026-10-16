import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Award, Sparkles, ShieldCheck } from "lucide-react";

// Haute Parfumerie Heritage & Atelier Story Block
export async function StoryBlock() {
  const t = await getTranslations("Sections");
  const locale = await getLocale();
  const isAr = locale === "ar";

  const credentials = [
    {
      Icon: Award,
      title: isAr ? "مباشرة من مصنعنا" : "Direct From Our Manufactory",
      desc: isAr
        ? "تُركّب وتُعتّق كل قطرة في مصنعنا بالإمارات دون وسطاء."
        : "Compounded, macerated, and sealed in our own UAE atelier.",
    },
    {
      Icon: Sparkles,
      title: isAr ? "زيوت وعود أصيل" : "Noble Raw Ingredients",
      desc: isAr
        ? "دهن عود معتّق، مسك الغزال، وزعفران وورد طبيعي."
        : "Aged agarwood, deer musk accords, saffron, and pure floral absolutes.",
    },
    {
      Icon: ShieldCheck,
      title: isAr ? "ضيافة الدار" : "Maison Hospitality",
      desc: isAr
        ? "عينات مجانية في كل طرد وتوصيل سريع لكافة الإمارات."
        : "Complimentary discovery samples in every parcel across the Emirates.",
    },
  ];

  return (
    <section className="relative overflow-hidden border-y border-ink/10 bg-sand/55 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.08fr_1fr] lg:gap-16 md:px-8">
        {/* Left: Overlapping Architectural Dual-Frame Composition */}
        <div className="relative pb-8 pr-6 sm:pb-12 sm:pr-12">
          <div className="relative aspect-[16/11] overflow-hidden border border-ink/10 bg-ink shadow-[0_32px_64px_-28px_rgba(28,25,23,0.35)]">
            <Image
              src="/banners/brand-maison-boutique.jpg"
              alt="Misk Al Ghazaal Boutique & Sanctuary"
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-3 border border-gold-soft/35"
            />
          </div>

          {/* Overlapping Secondary Atelier Frame */}
          <div className="absolute bottom-0 right-0 w-[52%] overflow-hidden border-2 border-cream bg-ink shadow-[0_24px_48px_-20px_rgba(28,25,23,0.45)]">
            <div className="relative aspect-[16/10]">
              <Image
                src="/banners/hero-misk-signature.jpg"
                alt="Misk Al Ghazaal Signature Flacon"
                fill
                sizes="(min-width:1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Floating Provenance Seal */}
          <div className="absolute left-4 top-4 border border-gold/40 bg-cream/95 px-4 py-2.5 backdrop-blur-md">
            <p className="font-display text-xs italic tracking-[0.18em] text-gold">
              {isAr ? "تأسست في الإمارات" : "DUBAI & AJMAN · UAE"}
            </p>
          </div>
        </div>

        {/* Right: Maison Narrative & Pillars */}
        <div>
          <p className="eyebrow flex items-center gap-3 text-gold">
            <span className="inline-block h-px w-8 bg-gold" />
            {t("storyEyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-[1.1] text-ink md:text-5xl">
            {t("storyTitle")}
          </h2>
          <span className="mt-5 block h-px w-16 bg-gold-soft" />
          <p className="mt-6 text-[14.5px] leading-[1.8] text-espresso">
            {t("storyText")}
          </p>

          {/* 3 Heritage Credentials */}
          <div className="mt-8 space-y-4 border-y border-ink/10 py-6">
            {credentials.map(({ Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center border border-gold/35 bg-cream text-gold">
                  <Icon className="size-4" />
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-medium text-ink">
                    {title}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-fog">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/pages/about"
              className="group inline-flex items-center gap-2.5 border border-ink bg-ink px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-all duration-300 hover:border-gold hover:bg-gold"
            >
              <span>{t("storyCta")}</span>
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/locate-us"
              className="link-underline text-[11px] font-semibold uppercase tracking-[0.22em] text-ink hover:text-gold"
            >
              {isAr ? "زُر البوتيك والمصنع" : "Visit Boutique & Manufactory"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
