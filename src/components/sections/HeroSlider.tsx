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

  // 1. Hardware-Accelerated Expansion
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sliderWrapperRef.current,
        { clipPath: "inset(24px 24px 24px 24px round 24px)" },
        { 
          clipPath: "inset(0px 0px 0px 0px round 0px)", 
          ease: "none",
          scrollTrigger: {
            start: 0, 
            end: 150, 
            scrub: 0.5, 
            snap: {
              snapTo: [0, 1], 
              duration: 0.4,
              ease: "power2.inOut"
            }
          }
        }
      );
    }, sliderWrapperRef);

    return () => ctx.revert();
  }, []);

  // 2. Flawless Text Reveal (Hooked directly to Swiper to prevent ghosting)
  const animateText = (swiper: SwiperType) => {
    setActive(swiper.realIndex);
    
    // Kill any ongoing tweens to prevent stuttering if the user clicks "Next" rapidly
    gsap.killTweensOf(".slide-text-el");
    
    // Reset all text globally to hidden
    gsap.set(".slide-text-el", { opacity: 0, y: 15 });
    
    // Animate ONLY the nodes inside the currently visible slide
    const activeSlide = swiper.slides[swiper.activeIndex];
    if (activeSlide) {
      const targets = activeSlide.querySelectorAll(".slide-text-el");
      gsap.to(targets, {
        y: 0, 
        opacity: 1, 
        duration: 0.8, 
        stagger: 0.1, 
        ease: "power3.out",
        delay: 0.2, // Waits for the image crossfade to begin
        overwrite: "auto"
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

  return (
    <section 
      aria-label="Featured" 
      className="ivory-flow relative w-full"
      style={{ height: "calc(100svh + 150px)" }} 
    >
      <div 
        ref={sliderWrapperRef} 
        className="sticky top-[68px] lg:top-[72px] h-[calc(100svh-68px)] lg:h-[calc(100svh-72px)] w-full overflow-hidden bg-ink"
      >
        <Swiper
          modules={[Autoplay, EffectFade, Parallax]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1000}
          loop
          parallax
          autoplay={{
            delay: 6500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onSwiper={(s) => {
            swiperRef.current = s;
            animateText(s); // Trigger initial load animation
          }}
          onSlideChange={animateText}
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
                  Strictly object-cover to prevent black borders. 
                */}
                <SafeImage
                  src={s.src}
                  fallback={s.fallback}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  style={s.focal ? { objectPosition: s.focal } : undefined}
                  className={`absolute inset-0 h-full w-full max-w-none object-cover opacity-90 transition-transform duration-[8500ms] ease-out ${
                    isActive ? "scale-100" : "scale-[1.12]"
                  }`}
                />
                
                {/* Refined side-gradient to support left-aligned text */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/10 to-transparent rtl:bg-gradient-to-l" />

                {/* Left/Bottom Aligned Content Container */}
                <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-6 pb-24 md:px-10 md:pb-28">
                  <div className="max-w-xl text-left rtl:text-right">
                    <p className="slide-text-el flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-soft opacity-0">
                      <span className="inline-block h-px w-8 bg-gold-soft" />
                      {tx(s.eyebrow ?? s.alt, s.eyebrowAr, locale)}
                    </p>
                    {s.title && (
                      <h2 className="slide-text-el mt-3 font-display text-4xl leading-[1.05] text-white drop-shadow-md md:text-5xl lg:text-6xl opacity-0">
                        {tx(s.title, s.titleAr, locale)}
                      </h2>
                    )}
                    {s.desc && (
                      <p className="slide-text-el mt-4 text-[13px] leading-relaxed text-white/85 md:text-sm opacity-0">
                        {tx(s.desc, s.descAr, locale)}
                      </p>
                    )}
                    {s.cta && s.href && (
                      <div className="slide-text-el mt-8 flex items-center gap-6 opacity-0">
                        <Link
                          href={s.href}
                          className="bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-all hover:scale-105 hover:bg-gold-wash active:scale-95"
                        >
                          {tx(s.cta, s.ctaAr, locale)}
                        </Link>
                        <Link
                          href="/collections"
                          className="link-underline hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 sm:inline"
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
              className="cursor-pointer p-2 text-white/60 transition-colors hover:text-white"
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
                  className={`relative h-[3px] cursor-pointer overflow-hidden rounded-full transition-all duration-700 ease-out ${
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
              className="cursor-pointer p-2 text-white/60 transition-colors hover:text-white"
            >
              <ArrowRight className="size-5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}