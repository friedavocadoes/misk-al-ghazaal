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
import { ArrowLeft, ArrowRight } from "lucide-react";
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

  // 1. Hardware-Accelerated Expansion (No Pinning)
  useEffect(() => {
    const ctx = gsap.context(() => {
      // By using absolute scroll values (0 to 150), this animation is completely
      // immune to the navbar height changes. It starts exactly on the first scroll pixel.
      gsap.fromTo(
        sliderWrapperRef.current,
        { clipPath: "inset(24px 24px 24px 24px round 24px)" },
        { 
          clipPath: "inset(0px 0px 0px 0px round 0px)", 
          ease: "none",
          scrollTrigger: {
            start: 0,       // Triggers the millisecond the user scrolls down
            end: 150,       // Finishes after 150px of scrolling
            scrub: 0.5,     // Smooth, tight response
            snap: {
              snapTo: [0, 1], // Magnetically snaps to either fully boxed or fully expanded
              duration: 0.4,
              ease: "power2.inOut"
            }
          }
        }
      );
    }, sliderWrapperRef);

    return () => ctx.revert();
  }, []);

  // 2. Cinematic Text Reveal on Slide Change
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".active-slide-content > *",
        { y: 24, opacity: 0, scale: 0.98 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: "power3.out",
          delay: 0.2 // Let the image crossfade begin first
        }
      );
    }, sliderWrapperRef);

    return () => ctx.revert();
  }, [active]);

  const go = (dir: 1 | -1) => {
    if (!swiperRef.current) return;
    dir === 1 ? swiperRef.current.slideNext() : swiperRef.current.slidePrev();
  };

  const goTo = (i: number) => {
    if (!swiperRef.current) return;
    swiperRef.current.slideToLoop(i);
  };

  return (
    // The section is given extra height (150px) to act as the scrollable track for the expansion.
    <section 
      aria-label="Featured" 
      className="ivory-flow relative w-full"
      style={{ height: "calc(100svh + 150px)" }} 
    >
      {/* 
        Native CSS Sticky: This is the magic. 
        It sticks at exactly your navbar's compact heights (68px mobile, 72px desktop).
        When the user scrolls, the hero flows up 36px (perfectly matching the navbar shrink), 
        and then locks into place organically. Zero GSAP layout bugs.
      */}
      <div 
        ref={sliderWrapperRef} 
        className="sticky top-[68px] lg:top-[72px] h-[calc(100svh-68px)] lg:h-[calc(100svh-72px)] w-full overflow-hidden bg-ink"
      >
        <Swiper
          modules={[Autoplay, EffectFade, Parallax]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1000} // Snappier crossfade
          loop
          parallax
          autoplay={{
            delay: 6500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onSwiper={(s) => (swiperRef.current = s)}
          onSlideChange={(s) => setActive(s.realIndex)}
          onAutoplayTimeLeft={(_, __, p) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${1 - p})`;
            }
          }}
          className="h-full w-full"
        >
          {slides.map((s, i) => {
            const isActive = i === active;
            
            return (
              <SwiperSlide key={s.src} className="relative h-full w-full overflow-hidden">
                {/* 
                  Deep Reverse Ken Burns. Starts scaled up and slowly sinks into place.
                */}
                <SafeImage
                  src={s.src}
                  fallback={s.fallback}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  style={s.focal ? { objectPosition: s.focal } : undefined}
                  className={`absolute inset-0 max-w-none opacity-90 transition-transform duration-[8500ms] ease-out ${
                    s.fit === "contain" ? "object-contain" : "object-cover"
                  } ${isActive ? "scale-100" : "scale-[1.12]"}`}
                />
                
                {/* Volumetric Gradients for Text Legibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-ink/10 via-transparent to-ink/70" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/40 via-transparent to-transparent" />

                <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-28 md:px-10 md:pb-32">
                  <div className={isActive ? "active-slide-content" : "opacity-0"}>
                    <p
                      data-swiper-parallax="-100"
                      className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft"
                    >
                      <span className="inline-block h-px w-10 bg-gold-soft" />
                      {tx(s.eyebrow ?? s.alt, s.eyebrowAr, locale)}
                    </p>
                    {s.title && (
                      <h2
                        data-swiper-parallax="-200"
                        className="mt-4 max-w-2xl font-display text-5xl leading-[1.05] text-white md:text-7xl drop-shadow-md"
                      >
                        {tx(s.title, s.titleAr, locale)}
                      </h2>
                    )}
                    {s.desc && (
                      <p
                        data-swiper-parallax="-300"
                        className="mt-5 max-w-lg text-sm leading-relaxed text-white/85 md:text-base"
                      >
                        {tx(s.desc, s.descAr, locale)}
                      </p>
                    )}
                    {s.cta && s.href && (
                      <div data-swiper-parallax="-400" className="mt-10 flex items-center gap-8">
                        <Link
                          href={s.href}
                          className="bg-white px-8 py-4 text-[12px] font-bold uppercase tracking-[0.2em] text-ink transition-all hover:scale-105 hover:bg-gold-wash active:scale-95"
                        >
                          {tx(s.cta, s.ctaAr, locale)}
                        </Link>
                        <Link
                          href="/collections"
                          className="link-underline hidden text-[12px] font-semibold uppercase tracking-[0.2em] text-white/90 sm:inline"
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

        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-8">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("prev")}
              className="p-2 text-white/60 transition-colors hover:text-white cursor-pointer"
            >
              <ArrowLeft className="size-5 rtl:rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`${t("next")} ${i + 1} / ${slides.length}`}
                  aria-current={i === active}
                  className={`relative h-[3px] overflow-hidden rounded-full transition-all duration-700 ease-out cursor-pointer ${
                    i === active
                      ? "w-16 bg-white/20"
                      : "w-6 bg-white/30 hover:bg-white/70"
                  }`}
                >
                  {i === active && (
                    <span
                      ref={progressRef}
                      className="absolute inset-0 origin-left bg-gold-soft rtl:origin-right"
                      style={{ transform: "scaleX(0)" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("next")}
              className="p-2 text-white/60 transition-colors hover:text-white cursor-pointer"
            >
              <ArrowRight className="size-5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}