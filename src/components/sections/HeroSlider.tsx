"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCreative, Parallax } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";

gsap.registerPlugin(ScrollToPlugin);

// Cinematic hero: 3D fly-through slide transitions (Swiper Creative),
// Ken Burns drift on the active image, parallax captions, autoplay
// progress rail. Boxed with margins at the top; melts to full-bleed
// on scroll via direct-DOM margin writes (no re-render, no jank).
const BOX_MARGIN = 20;
// Scroll distance past the lock over which the hero re-frames.
const EXIT = 340;
// Fullscreen lock point: compact navbar + full-bleed hero.
// MUST equal the compact header height: at scrollY === LOCK the sticky
// navbar occupies visual [0, LOCK] and the hero (top glued at document
// LOCK, height LOCK+vh−LOCK… exactly vh) fills [LOCK, LOCK+vh] — navbar +
// hero are the only things on screen, on any screen size. Snapping
// anywhere else leaves the hero half above the viewport.
const lockFor = () =>
  typeof window !== "undefined" && window.innerWidth >= 1024 ? 72 : 68;

export function HeroSlider({ slides }: { slides: Banner[] }) {
  const t = useTranslations("Hero");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Journey phase: top → locked → free. A natural first scroll lands
  // ~300px; phases make every stop decisive instead of re-trapping.
  const phase = useRef<"top" | "locked" | "free">("top");

  useEffect(() => {
    const sync = () => {
      // Framing progress p (0 = boxed gutters, 1 = full-bleed):
      //  DESKTOP: 0 → LOCK melts gutters out, LOCK → LOCK+EXIT returns
      //          them as the hero re-frames and exits.
      //  MOBILE: starts at 1 (fullscreen from load — no navbar morph
      //          there), returns gutters past 8px of scroll, same exit.
      //  Hero height = scrollY + viewport − live header, capped at one
      //  viewport: never scroll-zooms, always exactly fills its frame.
      //  Subpixel values (no rounding): whole-pixel steps read as stutter.
      const header = document.querySelector("header");
      const lock = lockFor();
      const y = window.scrollY;
      const mobile = window.innerWidth < 1024;
      let p: number;
      if (mobile) {
        const span = lock + EXIT - 8;
        p = y <= 8 ? 1 : y <= lock + EXIT ? Math.max(0, 1 - (y - 8) / span) : 0;
      } else {
        p = y <= lock ? y / lock : y <= lock + EXIT ? 1 - (y - lock) / EXIT : 0;
      }
      const m = BOX_MARGIN * (1 - p);
      if (boxRef.current) boxRef.current.style.margin = `0px ${m}px ${m}px`;
      if (sectionRef.current && header) {
        const grown = y + window.innerHeight - header.offsetHeight;
        const h = Math.max(440, Math.min(grown, window.innerHeight));
        sectionRef.current.style.setProperty("--hero-h", `${h}px`);
      }
    };
    const snapTo = (y: number) => {
      gsap.to(window, {
        scrollTo: y,
        duration: 0.55,
        ease: "expo.out",
        overwrite: "auto",
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(sync);
      // Journey-aware snap (gsap ScrollTo does the motion): any stop
      // before RELEASE completes into the fullscreen lock; past RELEASE
      // the journey is free until you return up into the hero. The timer
      // fires only after the LAST event, so flowing motion is untouched.
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => {
        const lock = lockFor();
        const release = lock + EXIT;
        const yy = window.scrollY;
        if (yy < 0) return;
        if (phase.current !== "free") {
          if (yy <= 24) {
            phase.current = "top";
            snapTo(0);
          } else if (yy < release) {
            phase.current = "locked";
            snapTo(lock);
          } else {
            phase.current = "free";
          }
        } else if (yy <= 24) {
          phase.current = "top";
          snapTo(0);
        } else if (yy < lock) {
          phase.current = "locked";
          snapTo(lock);
        }
      }, 160);
    };
    // Grabbing the page mid-snap hands control straight back to the user.
    const cancelSnap = () => gsap.killTweensOf(window);
    sync();
    // Track the chrome continuously: the navbar morphs on 0.5s CSS
    // transitions AFTER scroll settles, so scroll/resize events alone
    // leave a stale hero height (the old fullscreen whitespace gap).
    // The header never depends on the hero, so this cannot feed back.
    const header = document.querySelector("header");
    const ro = header ? new ResizeObserver(() => sync()) : null;
    ro?.observe(header as Element);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", cancelSnap, { passive: true });
    window.addEventListener("touchmove", cancelSnap, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", cancelSnap);
      window.removeEventListener("touchmove", cancelSnap);
      ro?.disconnect();
      if (settle.current) clearTimeout(settle.current);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Featured"
      className="ivory-flow"
    >
      <div ref={boxRef} style={{ margin: `0px ${BOX_MARGIN}px ${BOX_MARGIN}px` }}>
        <div className="relative bg-ink text-white">
          <Swiper
            modules={[Autoplay, EffectCreative, Parallax]}
            effect="creative"
            speed={1300}
            loop
            parallax
            autoplay={{ delay: 6500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            creativeEffect={{
              prev: {
                shadow: true,
                translate: ["-18%", 0, -350],
                rotate: [0, 0, -2],
                opacity: 0.4,
              },
              next: {
                translate: ["18%", 0, -350],
                rotate: [0, 0, 2],
                opacity: 0,
              },
            }}
            onSwiper={setSwiper}
            onSlideChange={(s) => setActive(s.realIndex)}
            onAutoplayTimeLeft={(_, __, p) => {
              if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${1 - p})`;
              }
            }}
            className="hero-swiper"
          >
            {slides.map((s, i) => (
              <SwiperSlide key={s.src}>
                {/* The frame animates (var(--hero-h)); the image inside stays
                    a stable 100svh and is only clipped — it never re-crops
                    or re-rasterizes per scroll frame, so no flicker. */}
                <div
                  className="relative overflow-hidden"
                  style={{ height: "var(--hero-h,86svh)", minHeight: 440 }}
                >
                  <SafeImage
                    src={s.src}
                    fallback={s.fallback}
                    alt={s.alt}
                    width={2000}
                    height={1100}
                    priority={i === 0}
                    style={s.focal ? { objectPosition: s.focal } : undefined}
                    className={`absolute inset-0 h-[100svh] w-full opacity-90 ${
                      s.fit === "contain" ? "object-contain" : "object-cover"
                    } ${i === active ? "kenburns" : ""}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-24 md:px-10 md:pb-28">
                    <p
                      data-swiper-parallax="-350"
                      className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft"
                    >
                      <span className="inline-block h-px w-10 bg-gold-soft" />
                      {tx(s.eyebrow ?? s.alt, s.eyebrowAr, locale)}
                    </p>
                    {s.title && (
                      <h2
                        data-swiper-parallax="-250"
                        className="mt-4 max-w-2xl font-display text-5xl leading-[1.02] md:text-7xl"
                      >
                        {tx(s.title, s.titleAr, locale)}
                      </h2>
                    )}
                    {s.desc && (
                      <p
                        data-swiper-parallax="-150"
                        className="mt-4 max-w-md text-sm leading-relaxed text-white/80 md:text-base"
                      >
                        {tx(s.desc, s.descAr, locale)}
                      </p>
                    )}
                    {s.cta && s.href && (
                      <div data-swiper-parallax="-80" className="mt-8 flex items-center gap-8">
                        <Link
                          href={s.href}
                          className="bg-white px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-gold-wash"
                        >
                          {tx(s.cta, s.ctaAr, locale)}
                        </Link>
                        <Link
                          href="/collections"
                          className="link-underline hidden text-[12px] font-semibold uppercase tracking-[0.2em] text-white/85 sm:inline"
                        >
                          {t("exploreAll")}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Controls: glass pill — prev, live counter/total, autoplay
              progress, next. All values derive from `slides`, nothing
              hardcoded (a future admin panel edits slides in one place). */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-5 md:justify-end md:px-10 md:pb-7">
            <div className="pointer-events-auto flex items-center gap-3 border border-white/25 bg-black/35 px-3 py-2 text-white backdrop-blur-md">
              <button
                onClick={() => swiper?.slidePrev()}
                aria-label={t("prev")}
                className="p-1.5 transition hover:text-gold-soft"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="font-display text-sm italic tracking-wider" aria-live="polite">
                {String(active + 1).padStart(2, "0")}
                <span className="mx-1.5 text-white/50">/</span>
                <span className="text-white/70">
                  {String(slides.length).padStart(2, "0")}
                </span>
              </span>
              <span
                className="relative block h-[2px] w-16 overflow-hidden bg-white/25 md:w-24"
                role="progressbar"
                aria-label={t("timeLeft")}
              >
                <span
                  ref={progressRef}
                  className="absolute inset-0 origin-left bg-gold-soft"
                  style={{ transform: "scaleX(0)" }}
                />
              </span>
              <button
                onClick={() => swiper?.slideNext()}
                aria-label={t("next")}
                className="p-1.5 transition hover:text-gold-soft"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
