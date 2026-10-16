"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCreative, Parallax } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import type { Banner } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";

import "swiper/css";
import "swiper/css/effect-creative";

gsap.registerPlugin(ScrollTrigger);

export function HeroSlider({ slides }: { slides: Banner[] }) {
  const t = useTranslations("Hero");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;

  const sliderWrapperRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  const [active, setActive] = useState(0);

  // Memoize Swiper modules/config so autoplay and creative effect never tear down on re-render
  const modules = useMemo(() => [Autoplay, EffectCreative, Parallax], []);
  const autoplayConfig = useMemo(
    () => ({
      delay: 6200,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    }),
    [],
  );
  const creativeEffectConfig = useMemo(
    () => ({
      prev: {
        shadow: true,
        translate: ["-22%", 0, -160] as [string, number, number],
        scale: 0.94,
        opacity: 0.35,
      },
      next: {
        translate: ["100%", 0, 0] as [string, number, number],
        scale: 1.08,
      },
    }),
    [],
  );

  // 1. First scroll takes the user straight into the fullscreen banner lock
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sliderWrapperRef.current,
        { clipPath: "inset(22px 24px 22px 24px round 20px)" },
        {
          clipPath: "inset(0px 0px 0px 0px round 0px)",
          ease: "none",
          scrollTrigger: {
            start: 0,
            end: 160,
            scrub: 0.45,
            snap: {
              snapTo: (value, self) => {
                const dir = self?.direction ?? 0;
                if (dir > 0) return 1;
                if (dir < 0) return 0;
                return value > 0.5 ? 1 : 0;
              },
              duration: 0.42,
              delay: 0.06,
              ease: "power2.inOut",
            },
          },
        },
      );
    }, sliderWrapperRef);

    return () => ctx.revert();
  }, []);

  // 2. Minimalist masked text reveal synced to Swiper slide transitions
  const animateText = (swiper: SwiperType) => {
    setActive(swiper.realIndex);

    gsap.killTweensOf(".slide-text-el");
    gsap.set(".slide-text-el", { opacity: 0, y: 24 });

    const activeSlide = swiper.slides[swiper.activeIndex];
    if (activeSlide) {
      const targets = activeSlide.querySelectorAll(".slide-text-el");
      if (targets.length) {
        gsap.to(targets, {
          y: 0,
          opacity: 1,
          duration: 1.05,
          stagger: 0.12,
          ease: "expo.out",
          delay: 0.25,
          overwrite: "auto",
        });
      }
    }
  };

  const goTo = (i: number) => {
    if (!swiperRef.current) return;
    swiperRef.current.slideToLoop(i);
  };

  if (!slides.length) return null;

  return (
    <section
      aria-label="Featured"
      className="ivory-flow relative w-full"
      style={{ height: "calc(100svh + 160px)" }}
    >
      <div
        ref={sliderWrapperRef}
        className="sticky top-[68px] h-[calc(100svh-68px)] w-full overflow-hidden bg-ink lg:top-[72px] lg:h-[calc(100svh-72px)]"
      >
        <Swiper
          modules={modules}
          effect="creative"
          creativeEffect={creativeEffectConfig}
          speed={1350}
          loop={slides.length > 1}
          parallax
          grabCursor
          autoplay={autoplayConfig}
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
            const lineText = tx(s.title ?? "", s.titleAr, locale).trim();
            const ctaText = tx(s.cta ?? "", s.ctaAr, locale).trim();
            const hasCta = Boolean(ctaText && s.href);
            const isCenter = s.align === "center";

            return (
              <SwiperSlide
                key={s.src + i}
                className="relative h-full w-full overflow-hidden bg-ink"
              >
                {/* Parallax wrapper so image glides with depth during creative curtain transition */}
                <div
                  data-swiper-parallax="-18%"
                  className="absolute inset-0 h-full w-full"
                >
                  <SafeImage
                    src={s.src}
                    fallback={s.fallback}
                    alt={s.alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    style={s.focal ? { objectPosition: s.focal } : undefined}
                    className={`absolute inset-0 h-full w-full max-w-none ${
                      s.fit === "contain" ? "object-contain" : "object-cover"
                    } transition-transform duration-[9000ms] ease-out ${
                      isActive ? "scale-100" : "scale-[1.09]"
                    }`}
                  />
                </div>

                {/* Subtle directional scrim ONLY when text or button is present */}
                {(lineText || hasCta) &&
                  (isCenter ? (
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(28,25,23,0.42)_0%,rgba(28,25,23,0.12)_65%,transparent_100%)]" />
                  ) : (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/15 to-transparent" />
                  ))}

                {/* Single Line of Text + Optional Button — Dead Center OR Bottom-Left Corner */}
                {(lineText || hasCta) && (
                  <div
                    data-swiper-parallax="-260"
                    className={
                      isCenter
                        ? "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
                        : "pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-7xl flex-col items-start justify-end px-7 pb-20 text-left md:px-12 md:pb-24 rtl:items-end rtl:text-right"
                    }
                  >
                    {lineText && (
                      <h2 className="slide-text-el max-w-3xl font-display text-3xl font-normal leading-[1.1] tracking-[0.01em] text-cream drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)] sm:text-4xl md:text-5xl opacity-0">
                        {lineText}
                      </h2>
                    )}
                    {hasCta && s.href && (
                      <div className="slide-text-el pointer-events-auto mt-6 opacity-0">
                        <Link
                          href={s.href}
                          className="inline-block border border-cream/80 bg-cream/95 px-8 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.26em] text-ink backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-gold-soft hover:bg-gold-wash"
                        >
                          {ctaText}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Minimalist Dot-Only Indicator (Tappable on Mobile & Desktop, No Arrows) */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center pb-5 md:pb-7">
          <div
            role="tablist"
            aria-label="Slide navigation"
            className="flex items-center gap-1"
          >
            {slides.map((s, i) => {
              const isCurrent = i === active;
              return (
                <button
                  key={s.src + i}
                  type="button"
                  role="tab"
                  onClick={() => goTo(i)}
                  aria-label={`${t("next")} ${i + 1} / ${slides.length}`}
                  aria-selected={isCurrent}
                  aria-current={isCurrent}
                  className="group cursor-pointer px-1.5 py-3"
                >
                  <span
                    className={`relative block h-[3px] overflow-hidden rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isCurrent
                        ? "w-14 bg-white/25"
                        : "w-5 bg-white/35 group-hover:bg-white/75"
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
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}