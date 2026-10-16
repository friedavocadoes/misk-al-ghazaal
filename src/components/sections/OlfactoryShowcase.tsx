"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowUpRight,
  Check,
  Droplets,
  Flame,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import type { Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { flyToBag } from "@/lib/fly-to-bag";

interface CuratedProfile {
  concentrationEn: string;
  concentrationAr: string;
  familyEn: string;
  familyAr: string;
  storyEn: string;
  storyAr: string;
  top: { nameEn: string; nameAr: string; color: string }[];
  heart: { nameEn: string; nameAr: string; color: string }[];
  base: { nameEn: string; nameAr: string; color: string }[];
}

const DEFAULT_PROFILES: Record<string, CuratedProfile> = {
  "misk-al-ghazaal-abukhalid-50ml": {
    concentrationEn: "Extrait de Misk · 50ml",
    concentrationAr: "خلاصة المسك · 50 مل",
    familyEn: "Royal Deer Musk & Ambergris",
    familyAr: "مسك الغزال الملكي والعنبر",
    storyEn:
      "Our house signature: aged Tibetan deer musk accord softened with Damascus rose otto, warm Kashmir saffron, and golden sandalwood.",
    storyAr:
      "توقيع الدار الأيقوني: تناغم مسك الغزال المعتّق مع الورد الدمشقي وزعفران كشمير وخشب الصندل الذهبي.",
    top: [
      { nameEn: "Kashmir Saffron", nameAr: "زعفران كشمير", color: "#b3924a" },
      { nameEn: "Bergamot Zest", nameAr: "برغموت", color: "#d4af37" },
    ],
    heart: [
      { nameEn: "Damascus Rose", nameAr: "ورد دمشقي", color: "#9c2b2e" },
      { nameEn: "White Lotus", nameAr: "لوتس أبيض", color: "#e9e1d2" },
    ],
    base: [
      { nameEn: "Aged Misk Al Ghazaal", nameAr: "مسك الغزال المعتّق", color: "#8a6d2f" },
      { nameEn: "Mysore Sandalwood", nameAr: "صندل مايسور", color: "#44403c" },
    ],
  },
  "dukhoonak-big-boss": {
    concentrationEn: "Artisanal Majlis Dukhoon",
    concentrationAr: "دخون المجالس الفاخر",
    familyEn: "Spiced Agarwood & Balsamic Amber",
    familyAr: "عود متبّل وعنبر بلسمي",
    storyEn:
      "Hand-kneaded incense macerated in pure fragrance oils — releasing plumes of spiced Cambodi agarwood, sweet labdanum, and warm vanilla resin.",
    storyAr:
      "دخون يدوي الصنع مشبّع بالزيوت العطرية النقية — يطلق سحباً من العود الكمبودي المتبّل والعنبر الدافئ.",
    top: [
      { nameEn: "Ceylon Cinnamon", nameAr: "قرفة سيلان", color: "#8a6d2f" },
      { nameEn: "Cardamom Pod", nameAr: "هيل أخضر", color: "#78716c" },
    ],
    heart: [
      { nameEn: "Balsamic Labdanum", nameAr: "لابدانوم بلسمي", color: "#b3924a" },
      { nameEn: "Taif Rose", nameAr: "ورد طائفي", color: "#9c2b2e" },
    ],
    base: [
      { nameEn: "Cambodi Agarwood", nameAr: "عود كمبودي", color: "#1c1917" },
      { nameEn: "Smoked Vanilla Amber", nameAr: "عنبر وفانيليا", color: "#8a6d2f" },
    ],
  },
  "noorjes-imagine": {
    concentrationEn: "Eau de Parfum · 75ml",
    concentrationAr: "أو دو بارفان · 75 مل",
    familyEn: "Luminous Citrus & White Florals",
    familyAr: "حمضيات مشرقة وزهور بيضاء",
    storyEn:
      "A crystalline breeze of Calabrian bergamot and neroli blossom settling into a velvety cushion of white musk and sunlit cedarwood.",
    storyAr:
      "نسمة بلورية من البرغموت وزهر النيرولي تستقر على قاعدة مخملية من المسك الأبيض وخشب الأرز.",
    top: [
      { nameEn: "Calabrian Bergamot", nameAr: "برغموت كالابريا", color: "#b3924a" },
      { nameEn: "Mandarin Leaf", nameAr: "ورق المندرين", color: "#78716c" },
    ],
    heart: [
      { nameEn: "Jasmine Sambac", nameAr: "ياسمين سامباك", color: "#f2ede2" },
      { nameEn: "Neroli Blossom", nameAr: "زهر النيرولي", color: "#d4af37" },
    ],
    base: [
      { nameEn: "Crystal White Musk", nameAr: "مسك أبيض بلوري", color: "#e9e1d2" },
      { nameEn: "Atlas Cedar", nameAr: "أرز أطلسي", color: "#44403c" },
    ],
  },
};

const FALLBACK_PROFILE: CuratedProfile = {
  concentrationEn: "Eau de Parfum · Haute Concentration",
  concentrationAr: "أو دو بارفان · تركيز فاخر",
  familyEn: "Oriental Oud, Amber & Noble Woods",
  familyAr: "عود شرقي، عنبر وأخشاب نبيلة",
  storyEn:
    "Macerated and bottled at origin in our UAE manufactory for extraordinary sillage — marrying noble Arabian resins with contemporary French perfumery.",
  storyAr:
    "معتّق ومعبّأ في مصنعنا بالإمارات لثبات وفوحان استثنائي يجمع بين الراتنجات العربية الأصيلة وفن العطور المعاصر.",
  top: [
    { nameEn: "Saffron & Bergamot", nameAr: "زعفران وبرغموت", color: "#b3924a" },
    { nameEn: "Pink Pepper", nameAr: "فلفل وردي", color: "#9c2b2e" },
  ],
  heart: [
    { nameEn: "Damask Rose & Incense", nameAr: "ورد دمشقي وبخور", color: "#8a6d2f" },
    { nameEn: "Warm Amber", nameAr: "عنبر دافئ", color: "#d4af37" },
  ],
  base: [
    { nameEn: "Aged Agarwood (Oudh)", nameAr: "عود معتّق", color: "#1c1917" },
    { nameEn: "Pure Misk & Sandalwood", nameAr: "مسك وصندل نقي", color: "#44403c" },
  ],
};

const ROMAN = ["I", "II", "III", "IV"];

export function OlfactoryShowcase({ products }: { products: Product[] }) {
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const router = useRouter();
  const { add } = useCart();

  const items = products.slice(0, 4);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [angleIdx, setAngleIdx] = useState(0);
  const [addedSlug, setAddedSlug] = useState<string | null>(null);

  if (!items.length) return null;

  const activeProduct = items[selectedIdx] ?? items[0]!;
  const title = tx(activeProduct.title, activeProduct.titleAr, locale);
  const profile =
    DEFAULT_PROFILES[activeProduct.slug] ?? FALLBACK_PROFILE;

  // Use database notes if populated, otherwise curated olfactory pyramid
  const topNotes =
    activeProduct.notes?.filter((n) => n.kind === "top").length > 0
      ? activeProduct.notes
          .filter((n) => n.kind === "top")
          .map((n) => ({
            nameEn: n.name,
            nameAr: n.nameAr ?? n.name,
            color: n.color,
          }))
      : profile.top;

  const heartNotes =
    activeProduct.notes?.filter((n) => n.kind === "heart").length > 0
      ? activeProduct.notes
          .filter((n) => n.kind === "heart")
          .map((n) => ({
            nameEn: n.name,
            nameAr: n.nameAr ?? n.name,
            color: n.color,
          }))
      : profile.heart;

  const baseNotes =
    activeProduct.notes?.filter((n) => n.kind === "base").length > 0
      ? activeProduct.notes
          .filter((n) => n.kind === "base")
          .map((n) => ({
            nameEn: n.name,
            nameAr: n.nameAr ?? n.name,
            color: n.color,
          }))
      : profile.base;

  const images = activeProduct.images.length
    ? activeProduct.images
    : ["/products/misk-al-ghazaal-abukhalid-50ml-1.jpg"];
  const currentImage = images[angleIdx] ?? images[0]!;

  const handleSelectProduct = (idx: number) => {
    setSelectedIdx(idx);
    setAngleIdx(0);
  };

  const handleAddToBag = (e: React.MouseEvent<HTMLButtonElement>) => {
    add({
      productSlug: activeProduct.slug,
      variantId: activeProduct.variants[0]?.id,
      qty: 1,
    });
    flyToBag(e.currentTarget, currentImage);
    setAddedSlug(activeProduct.slug);
    setTimeout(() => setAddedSlug(null), 1600);
  };

  const handleBuyNow = () => {
    add({
      productSlug: activeProduct.slug,
      variantId: activeProduct.variants[0]?.id,
      qty: 1,
    });
    router.push("/checkout");
  };

  const pillars = [
    {
      Icon: Flame,
      labelEn: "Sealed at Origin in the UAE",
      labelAr: "مختوم في المصدر بالإمارات",
    },
    {
      Icon: Droplets,
      labelEn: "Extrait & Pure Oil Concentrations",
      labelAr: "تركيزات زيتية وخلاصات نقية",
    },
    {
      Icon: Sparkles,
      labelEn: "Complimentary Samples in Every Order",
      labelAr: "عينات مجانية مع كل طلب",
    },
    {
      Icon: Truck,
      labelEn: "Free UAE Delivery Above AED 200 · COD",
      labelAr: "توصيل مجاني فوق 200 درهم · الدفع عند الاستلام",
    },
  ];

  return (
    <section
      aria-label={
        locale === "ar" ? "معرض الدار العطري" : "The Maison Olfactory Showcase"
      }
      className="relative border-b border-ink/10 bg-cream"
    >
      {/* 1. Whisper-quiet Maison Provenance Bar */}
      <div className="border-b border-ink/10 bg-sand/70">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 py-4 md:grid-cols-4 md:px-8">
          {pillars.map(({ Icon, labelEn, labelAr }, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center gap-2.5 text-center md:justify-start md:text-left rtl:md:text-right"
            >
              <span className="flex size-7 shrink-0 items-center justify-center border border-gold/30 bg-cream text-gold">
                <Icon className="size-3.5" />
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-espresso">
                {locale === "ar" ? labelAr : labelEn}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Interactive Haute Parfumerie Spotlight (Showcase + Direct Commerce) */}
      <div className="maison-stage relative overflow-hidden py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          {/* Header Row */}
          <div className="mb-12 flex flex-col items-start justify-between gap-4 border-b border-ink/10 pb-7 md:flex-row md:items-end">
            <div>
              <p className="eyebrow flex items-center gap-3 text-gold">
                <span className="inline-block h-px w-8 bg-gold" />
                {locale === "ar"
                  ? "تحف الدار العطرية"
                  : "Haute Parfumerie · Curated Plinth"}
              </p>
              <h2 className="mt-2.5 font-display text-3xl leading-tight text-ink md:text-5xl">
                {locale === "ar"
                  ? "فن العطور والطقوس الملكية"
                  : "The Art of High Perfumery"}
              </h2>
            </div>
            <p className="max-w-md text-[13px] leading-relaxed text-espresso">
              {locale === "ar"
                ? "استكشف الهرم العطري لأشهر ابتكارات مسك الغزال واقتنِ عطرك المفضل مباشرة من منصة العرض."
                : "Inspect the olfactory architecture of our signature creations — top, heart, and base notes — and acquire directly from the plinth."}
            </p>
          </div>

          {/* 3-Column Museum Plinth Grid */}
          <div className="grid items-stretch gap-8 lg:grid-cols-[300px_1fr_380px] lg:gap-10">
            {/* LEFT: Edition Selector Tabs */}
            <div className="flex flex-col justify-between border border-ink/10 bg-cream/90 p-5">
              <div>
                <p className="border-b border-ink/10 pb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-fog">
                  {locale === "ar"
                    ? "اختر الابتكار العطري"
                    : "Select Creation (01 — 04)"}
                </p>
                <div className="mt-3 divide-y divide-ink/10">
                  {items.map((item, idx) => {
                    const isSelected = idx === selectedIdx;
                    const itemTitle = tx(item.title, item.titleAr, locale);
                    const itemProf =
                      DEFAULT_PROFILES[item.slug] ?? FALLBACK_PROFILE;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectProduct(idx)}
                        className={`group flex w-full cursor-pointer items-start gap-3.5 py-4 text-left transition-all duration-300 rtl:text-right ${
                          isSelected
                            ? "text-ink"
                            : "text-espresso/65 hover:text-ink"
                        }`}
                      >
                        <span
                          className={`mt-0.5 font-display text-xs italic transition-colors ${
                            isSelected
                              ? "font-semibold text-gold"
                              : "text-fog group-hover:text-gold"
                          }`}
                        >
                          {ROMAN[idx] ?? `0${idx + 1}`}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-[17px] leading-snug">
                            {itemTitle}
                          </span>
                          <span className="mt-0.5 block truncate text-[10.5px] uppercase tracking-[0.18em] text-fog">
                            {locale === "ar"
                              ? itemProf.familyAr
                              : itemProf.familyEn}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold tracking-wider text-gold">
                          AED {item.price.toFixed(0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 border-t border-ink/10 pt-4">
                <Link
                  href="/collection/best-sellers"
                  className="group flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition hover:text-gold"
                >
                  <span>
                    {locale === "ar"
                      ? "تصفح جميع الأيقونات"
                      : "Explore Full Archive"}
                  </span>
                  <ArrowUpRight className="size-4 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>

            {/* CENTER: Illuminated Architectural Arch & Flacon Stage */}
            <div
              key={activeProduct.slug}
              className="flacon-pedestal animate-luxury-reveal relative flex flex-col items-center justify-between border border-ink/10 p-6 md:p-10"
            >
              {/* Decorative Arch & Gold Corner Hairlines */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-3 border border-gold/25"
              />
              <div className="relative z-10 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-fog">
                <span>
                  {locale === "ar"
                    ? profile.concentrationAr
                    : profile.concentrationEn}
                </span>
                <span className="border border-gold/30 bg-gold-wash/70 px-2.5 py-0.5 text-[9.5px] text-gold">
                  {ROMAN[selectedIdx]} / {ROMAN[items.length - 1] ?? "IV"}
                </span>
              </div>

              {/* Main Flacon Spotlight */}
              <Link
                href={`/product/${activeProduct.slug}`}
                className="group relative my-6 block aspect-square w-full max-w-[340px]"
              >
                <Image
                  src={currentImage}
                  alt={title}
                  fill
                  sizes="(min-width:1024px) 360px, 75vw"
                  className="object-contain p-3 mix-blend-multiply transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  priority
                />
              </Link>

              {/* Secondary Angle Switcher Thumbnails */}
              <div className="relative z-10 flex w-full items-center justify-between border-t border-ink/10 pt-4">
                <div className="flex items-center gap-2">
                  {images.slice(0, 4).map((img, i) => (
                    <button
                      key={img + i}
                      type="button"
                      onClick={() => setAngleIdx(i)}
                      aria-label={`View angle ${i + 1}`}
                      className={`relative size-11 cursor-pointer overflow-hidden border bg-white transition-all ${
                        angleIdx === i
                          ? "border-gold ring-1 ring-gold/40"
                          : "border-ink/10 opacity-65 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
                <Link
                  href={`/product/${activeProduct.slug}`}
                  className="link-underline text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink hover:text-gold"
                >
                  {locale === "ar" ? "صفحة العطر الكاملة" : "Full Dossier →"}
                </Link>
              </div>
            </div>

            {/* RIGHT: Olfactory Pyramid & Direct Acquisition Box */}
            <div
              key={activeProduct.slug + "-dossier"}
              className="animate-luxury-reveal flex flex-col justify-between border border-ink/10 bg-cream/95 p-6 md:p-7"
            >
              <div>
                <p className="eyebrow text-gold">
                  {locale === "ar" ? profile.familyAr : profile.familyEn}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-snug text-ink md:text-3xl">
                  <Link
                    href={`/product/${activeProduct.slug}`}
                    className="transition hover:text-gold"
                  >
                    {title}
                  </Link>
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-espresso">
                  {tx(
                    activeProduct.shortDesc ?? profile.storyEn,
                    activeProduct.shortDescAr ?? profile.storyAr,
                    locale,
                  )}
                </p>

                {/* Olfactory Pyramid (Top / Heart / Base) */}
                <div className="mt-6 space-y-3 border-y border-ink/10 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-fog">
                    {locale === "ar"
                      ? "الهرم العطري (النوتات)"
                      : "Olfactory Architecture"}
                  </p>
                  {(
                    [
                      {
                        tierEn: "Top",
                        tierAr: "المقدمة",
                        list: topNotes,
                      },
                      {
                        tierEn: "Heart",
                        tierAr: "القلب",
                        list: heartNotes,
                      },
                      {
                        tierEn: "Base",
                        tierAr: "القاعدة",
                        list: baseNotes,
                      },
                    ] as const
                  ).map((row) => (
                    <div
                      key={row.tierEn}
                      className="grid grid-cols-[68px_1fr] items-center gap-2 text-xs"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fog">
                        {locale === "ar" ? row.tierAr : row.tierEn}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {row.list.map((n, ni) => (
                          <span
                            key={ni}
                            className="inline-flex items-center gap-1.5 border border-ink/10 bg-sand/60 px-2.5 py-1 text-[11px] font-medium text-ink"
                          >
                            <span
                              className="size-2 rounded-full border border-ink/20"
                              style={{ backgroundColor: n.color }}
                            />
                            {locale === "ar" ? n.nameAr : n.nameEn}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price & Direct Purchase Block */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">
                      {locale === "ar" ? "السعر" : "Maison Price"}
                    </span>
                    <div className="mt-0.5 flex items-baseline gap-2.5">
                      <span className="font-display text-2xl text-ink">
                        AED {activeProduct.price.toFixed(2)}
                      </span>
                      {activeProduct.compareAtPrice &&
                        activeProduct.compareAtPrice > activeProduct.price && (
                          <s className="text-xs text-fog">
                            AED {activeProduct.compareAtPrice.toFixed(2)}
                          </s>
                        )}
                    </div>
                  </div>
                  {activeProduct.variants[0]?.title && (
                    <span className="border border-ink/15 bg-sand px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink">
                      {activeProduct.variants[0].title}
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleAddToBag}
                    className="flex cursor-pointer items-center justify-center gap-2 border border-ink bg-ink py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-gold hover:bg-gold"
                  >
                    {addedSlug === activeProduct.slug ? (
                      <>
                        <Check className="size-3.5" />
                        {locale === "ar" ? "أُضيفت" : "In Your Bag"}
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="size-3.5" />
                        {locale === "ar" ? "أضف للسلة" : "Add to Bag"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex cursor-pointer items-center justify-center gap-2 border border-ink bg-transparent py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:bg-gold-wash"
                  >
                    <Zap className="size-3.5 text-gold" />
                    {locale === "ar" ? "اشترِ الآن" : "Acquire Now"}
                  </button>
                </div>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-fog">
                  <ShieldCheck className="size-3.5 text-gold" />
                  {locale === "ar"
                    ? "يُسلّم مع عينات مجانية · الدفع عند الاستلام متاح"
                    : "Includes complimentary discovery samples · UAE COD"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
