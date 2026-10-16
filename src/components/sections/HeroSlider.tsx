"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Parallax } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { ArrowLeft, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import type { Banner } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";

import "swiper/css";
import "swiper/css/effect-fade";

gsap.registerPlugin(ScrollTrigger);

export function HeroSlider({ slides }: { slides: Banner[] }) {
  const t = useTranslations("Hero");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;

  const sliderWrapperRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  const [active, setActive] = useState(0);

  // Fluid, non-hijacking architectural frame expansion on scroll
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sliderWrapperRef.current,
        { clipPath: "inset(16px 20px 16px 20px round 4px)" },
        {
          clipPath: "inset(0px 0px 0px 0px round 0px)",
          ease: "none",
          scrollTrigger: {
            start: 0,
            end: 140,
            scrub: 0.35,
          },
        },
      );
    }, sliderWrapperRef);

    return () => ctx.revert();
  }, []);

  // Staggered haute-parfumerie text choreography
  const animateText = (swiper: SwiperType) => {
    setActive(swiper.realIndex);

    gsap.killTweensOf(".slide-text-el");
    gsap.set(".slide-text-el", { opacity: 0, y: 22 });

    const activeSlide = swiper.slides[swiper.activeIndex];
    if (activeSlide) {
      const targets = activeSlide.querySelectorAll(".slide-text-el");
      gsap.to(targets, {
        y: 0,
        opacity: 1,
        duration: 1.05,
        stagger: 0.11,
        ease: "expo.out",
        delay: 0.18,
        overwrite: "auto",
      });
    }
  };

  const go = (dir: 1 | -1) => {
    if (!swiperRef.current) return;
    dir === 1 ? swiperRef.current.slideNext() : swiperRef.current.slidePrev();
  };

  const goTo = (i: number) => {
    if (!swiperRef.current) return;
    swiperRef.current.slideToLoop(i);
  };

  if (!slides.length) return null;

  return (
    <section
      aria-label="Featured Creations"
      className="ivory-flow relative w-full"
    >
      <div
        ref={sliderWrapperRef}
        className="relative h-[calc(100svh-68px)] min-h-[580px] max-h-[960px] w-full overflow-hidden bg-ink lg:h-[calc(100svh-88px)]"
      >
        {/* Subtle inner gold frame border */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 z-20 border border-gold-soft/20 md:inset-7"
        />

        <Swiper
          modules={[Autoplay, EffectFade, Parallax]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1300}
          loop
          parallax
          autoplay={{
            delay: 6800,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onSwiper={(s) => {
            swiperRef.current = s;
            animateText(s);
          }}
          onSlideChange={animateText}
          onAutoplayTimeLeft={(_, __, p) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${1 - p})`;
            }
          }}
          className="hero-swiper h-full w-full"
        >
          {slides.map((s, i) => {
            const isActive = i === active;
            const slideNum = String(i + 1).padStart(2, "0");
            const totalNum = String(slides.length).padStart(2, "0");

            return (
              <SwiperSlide
                key={s.src + i}
                className="relative h-full w-full overflow-hidden bg-ink"
              >
                <SafeImage
                  src={s.src}
                  fallback={s.fallback}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  style={s.focal ? { objectPosition: s.focal } : undefined}
                  className={`absolute inset-0 h-full w-full max-w-none object-cover transition-transform duration-[9500ms] ease-out ${
                    isActive ? "scale-100" : "scale-[1.1]"
                  }`}
                />

                {/* Multi-layered editorial chiaroscuro scrims for crisp legibility on both light and dark art */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-ink/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent rtl:bg-gradient-to-l" />

                {/* Top Maison Provenance Badge */}
                <div className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-8 pt-10 md:px-14 md:pt-12">
                  <div className="slide-text-el flex items-center gap-3 opacity-0">
                    <span className="font-display text-xs italic tracking-[0.2em] text-gold-soft">
                      {slideNum}
                    </span>
                    <span className="h-px w-8 bg-gold-soft/50" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/60">
                      {totalNum} · MAISON MISK AL GHAZAAL
                    </span>
                  </div>
                  <div className="hidden items-center gap-2 border border-white/15 bg-ink/35 px-3.5 py-1.5 backdrop-blur-md md:flex">
                    <Sparkles className="size-3 text-gold-soft" />
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-gold-wash">
                      {locale === "ar"
                        ? "صُنع في الإمارات · أصالة مضمونة"
                        : "Haute Parfumerie · Crafted in the UAE"}
                    </span>
                  </div>
                </div>

                {/* Main Editorial Narrative Block */}
                <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-8 pb-28 md:px-14 md:pb-32">
                  <div className="max-w-2xl text-left rtl:text-right">
                    <p className="slide-text-el flex items-center gap-3.5 text-[10.5px] font-semibold uppercase tracking-[0.32em] text-gold-soft opacity-0">
                      <span className="inline-block h-px w-10 bg-gold-soft" />
                      {tx(s.eyebrow ?? s.alt, s.eyebrowAr, locale)}
                    </p>

                    {s.title && (
                      <h2 className="slide-text-el mt-4 font-display text-4xl leading-[1.03] tracking-[-0.01em] text-cream drop-shadow-sm sm:text-5xl md:text-6xl lg:text-[4.25rem] opacity-0">
                        {tx(s.title, s.titleAr, locale)}
                      </h2>
                    )}

                    {s.desc && (
                      <p className="slide-text-el mt-5 max-w-lg text-[13.5px] leading-[1.75] text-cream/85 md:text-[15px] opacity-0">
                        {tx(s.desc, s.descAr, locale)}
                      </p>
                    )}

                    {s.cta && s.href && (
                      <div className="slide-text-el mt-9 flex flex-wrap items-center gap-5 opacity-0">
                        <Link
                          href={s.href}
                          className="group relative inline-flex items-center gap-3 overflow-hidden border border-gold-soft/60 bg-cream px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-gold-soft hover:bg-gold-wash"
                        >
                          <span>{tx(s.cta, s.ctaAr, locale)}</span>
                          <ArrowUpRight className="size-3.5 text-gold transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                        <Link
                          href="/collections"
                          className="inline-flex items-center gap-2 border border-white/20 bg-white/5 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-sm transition-all duration-500 hover:border-gold-soft/60 hover:bg-white/15"
                        >
                          {t("exploreAll")}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Bottom Architectural Gallery Navigation Bar */}
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/45 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-14">
            {/* Numbered Slide Chapters */}
            <div className="flex flex-1 items-center gap-3 sm:gap-5">
              {slides.map((s, i) => {
                const isCurrent = i === active;
                return (
                  <button
                    key={s.src + i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`${t("next")} ${i + 1} / ${slides.length}`}
                    aria-current={isCurrent}
                    className="group flex cursor-pointer items-center gap-2.5 py-1 text-left transition-opacity"
                  >
                    <span
                      className={`font-display text-xs tracking-[0.16em] transition-colors duration-500 ${
                        isCurrent
                          ? "font-semibold text-gold-soft"
                          : "text-white/45 group-hover:text-white/80"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`relative h-[2px] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isCurrent
                          ? "w-14 bg-white/20 sm:w-20"
                          : "w-4 bg-white/15 group-hover:bg-white/40"
                      }`}
                    >
                      {isCurrent && (
                        <span
                          ref={progressRef}
                          className="absolute inset-0 origin-left bg-gold-soft rtl:origin-right"
                          style={{ transform: "scaleX(0)" }}
                        />
                      )}
                    </span>
                    {isCurrent && s.title && (
                      <span className="hidden max-w-[150px] truncate text-[10px] font-medium uppercase tracking-[0.2em] text-white/80 lg:inline-block">
                        {tx(s.title, s.titleAr, locale)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tactile Prev / Next Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("prev")}
                className="flex size-9 cursor-pointer items-center justify-center border border-white/15 text-white/75 transition-all duration-300 hover:border-gold-soft hover:bg-gold-soft/15 hover:text-white"
              >
                <ArrowLeft className="size-4 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t("next")}
                className="flex size-9 cursor-pointer items-center justify-center border border-white/15 text-white/75 transition-all duration-300 hover:border-gold-soft hover:bg-gold-soft/15 hover:text-white"
              >
                <ArrowRight className="size-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}