"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

// Total sticky runway (px).
// 0 -> 160px: clip-path expands from framed inset to 100% fullscreen.
// 160 -> 420px: fullscreen hold zone so even fast wheel/trackpad flicks
// stay locked flush between the navbar bottom and 100svh with zero gap.
const EXPAND_END_PX = 160;
const STICKY_RUNWAY_PX = 420;

export function HeroSlider({ slides }: { slides: Banner[] }) {
  const t = useTranslations("Hero");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;

  const sectionRef = useRef<HTMLElement>(null);
  const sliderWrapperRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  const [active, setActive] = useState(0);
  // Live header height so the sticky box top is always flush with the bottom
  // of #site-header and its bottom is always flush with 100svh.
  const [headerH, setHeaderH] = useState(72);

  useLayoutEffect(() => {
    const hdr = document.getElementById("site-header");
    if (!hdr) return;
    const sync = () => {
      // Once scrolled into the lock zone (>36px), desktop header settles at 72px.
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (isDesktop && window.scrollY > 36) {
        setHeaderH(72);
      } else {
        setHeaderH(hdr.offsetHeight || 72);
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(hdr);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

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

  // First scroll expands into fullscreen and snaps cleanly into the hold zone
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          start: 0,
          end: STICKY_RUNWAY_PX,
          scrub: 0.3,
          snap: {
            snapTo: (value, self) => {
              const dir = self?.direction ?? 0;
              const lockProgress = EXPAND_END_PX / STICKY_RUNWAY_PX;
              // Scrolling down from top: lock onto fullscreen plateau
              if (dir > 0 && value < 0.85) return lockProgress;
              // Scrolling up inside the plateau: release back to top
              if (dir < 0 && value <= lockProgress + 0.15) return 0;
              return value > 0.85 ? 1 : lockProgress;
            },
            duration: { min: 0.25, max: 0.45 },
            delay: 0.04,
            ease: "power2.inOut",
          },
        },
      });

      // Phase 1 (0 -> 160px): expand inset frame to full bleed
      tl.fromTo(
        sliderWrapperRef.current,
        { clipPath: "inset(20px 24px 20px 24px round 18px)" },
        {
          clipPath: "inset(0px 0px 0px 0px round 0px)",
          ease: "none",
          duration: EXPAND_END_PX,
        },
      );
      // Phase 2 (160 -> 420px): hold 100% fullscreen while sticky remains pinned
      tl.to(sliderWrapperRef.current, {
        clipPath: "inset(0px 0px 0px 0px round 0px)",
        ease: "none",
        duration: STICKY_RUNWAY_PX - EXPAND_END_PX,
      });
    }, sliderWrapperRef);

    return () => ctx.revert();
  }, []);

  const animateText = (swiper: SwiperType) => {
    setActive(swiper.realIndex);

    gsap.killTweensOf(".slide-text-el");
    gsap.set(".slide-text-el", { opacity: 0, y: 22 });

    const activeSlide = swiper.slides[swiper.activeIndex];
    if (activeSlide) {
      const targets = activeSlide.querySelectorAll(".slide-text-el");
      if (targets.length) {
        gsap.to(targets, {
          y: 0,
          opacity: 1,
          duration: 1.0,
          stagger: 0.12,
          ease: "expo.out",
          delay: 0.22,
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
      ref={sectionRef}
      aria-label="Featured"
      data-home-hero
      className="relative w-full bg-cream"
      style={{
        height: `calc(100svh - ${headerH}px + ${STICKY_RUNWAY_PX}px)`,
      }}
    >
      <div
        ref={sliderWrapperRef}
        style={{
          top: `${headerH}px`,
          height: `calc(100svh - ${headerH}px)`,
        }}
        className="sticky w-full overflow-hidden bg-ink"
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
                    className={`absolute inset-0 h-full w-full max-w-none object-cover transition-transform duration-[9000ms] ease-out ${
                      isActive ? "scale-100" : "scale-[1.08]"
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
                    data-swiper-parallax="-240"
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