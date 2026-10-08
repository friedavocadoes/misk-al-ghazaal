"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  // Instance in a ref (never state): re-renders must never hand the
  // buttons a stale/destroyed Swiper (dev StrictMode double-mounts).
  const swiperRef = useRef<SwiperType | null>(null);
  const [active, setActive] = useState(0);
  // Memoized: fresh object identities every render make Swiper React
  // tear down + rebuild autoplay/creative each slide change — the
  // slideshow advances once, then stalls with a frozen progress rail.
  const modules = useMemo(() => [Autoplay, EffectCreative, Parallax], []);
  const autoplay = useMemo(
    () => ({
      delay: 6500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    }),
    []
  );
  // Push-pull crossfade: the outgoing settles back and dissolves while the
  // incoming arrives slightly close and eases into place — depth instead
  // of the old lateral shove. No shadow scrims (they muddied the whites).
  const creativeEffect = useMemo(
    () => ({
      prev: {
        shadow: false,
        scale: 0.965,
        opacity: 0,
      },
      next: {
        shadow: false,
        translate: [0, 0, 0] as [number, number, number],
        scale: 1.07,
        opacity: 0,
      },
    }),
    []
  );
  // Navigation self-heals: prefer the live ref, but fall back to the
  // instance on the DOM node (and never call into a destroyed one).
  const live = () => {
    const el = document.querySelector(".hero-swiper") as unknown as {
      swiper?: SwiperType;
    } | null;
    const inst =
      swiperRef.current && !swiperRef.current.destroyed
        ? swiperRef.current
        : el?.swiper && !el.swiper.destroyed
          ? el.swiper
          : null;
    if (inst) swiperRef.current = inst;
    return inst;
  };
  const go = (dir: 1 | -1) => {
    const inst = live();
    if (!inst) return;
    if (dir === 1) inst.slideNext();
    else inst.slidePrev();
  };
  const goTo = (i: number) => {
    const inst = live();
    if (!inst) return;
    inst.slideToLoop(i);
  };
  const boxRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cached chrome height (ResizeObserver-kept): the scroll path must never
  // read offsetHeight — read-then-write per frame is forced reflow, which
  // is what made the image visibly stutter mid-journey.
  const headerH = useRef(108);
  // Write guards: touching margin/--hero-h invalidates layout, so frames
  // that changed nothing (rounded snaps, RO echoes) write nothing.
  const last = useRef({ m: -1, h: -1 });
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
      //  The header height comes from the cache — zero layout reads here.
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
      if (Math.abs(m - last.current.m) > 0.05) {
        last.current.m = m;
        if (boxRef.current) boxRef.current.style.margin = `0px ${m}px ${m}px`;
      }
      if (sectionRef.current) {
        const grown = y + window.innerHeight - headerH.current;
        const h = Math.max(440, Math.min(grown, window.innerHeight));
        if (Math.abs(h - last.current.h) > 0.05) {
          last.current.h = h;
          sectionRef.current.style.setProperty("--hero-h", `${h}px`);
        }
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
    // Track the chrome continuously: the navbar morphs on CSS transitions
    // AFTER scroll settles, so scroll/resize events alone leave a stale
    // hero height (the old fullscreen whitespace gap). The observer writes
    // the cache (never the hero directly), so this cannot feed back.
    const header = document.querySelector("header");
    if (header) headerH.current = header.offsetHeight;
    const ro = header
      ? new ResizeObserver(() => {
          headerH.current = (header as HTMLElement).offsetHeight;
          sync();
        })
      : null;
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
            modules={modules}
            effect="creative"
            speed={1500}
            loop
            parallax
            autoplay={autoplay}
            creativeEffect={creativeEffect}
            onSwiper={(s) => {
              swiperRef.current = s;
            }}
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
                {/* The frame animates (var(--hero-h)); the image is a fixed
                    viewport-sized plate (100vw × 100svh) centered on the
                    frame, so gutters melting only re-clip it — the raster
                    never re-crops or re-rasterizes per scroll frame, which
                    is what read as stutter. max-w-none defeats the global
                    img cap; the slide's overflow:hidden does the clipping.
                    Centering rides the `translate` property while Ken Burns
                    rides `transform`, so the two compose instead of
                    fighting. */}
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
                    className={`absolute top-0 left-1/2 h-[100svh] w-[100vw] max-w-none -translate-x-1/2 opacity-90 ${
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

          {/* Controls: whisper-quiet — slim prev/next chevrons around dot
              dashes. The active dash stretches and fills gold with the live
              autoplay progress; every dot jumps straight to its slide.
              Nothing hardcoded: count derives from `slides`. z-10 pins
              hit-testing above the 3D-transformed slides. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-6">
            <div className="pointer-events-auto flex items-center gap-5">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("prev")}
                className="p-1 text-white/55 transition hover:text-white"
              >
                <ArrowLeft className="size-4 rtl:rotate-180" />
              </button>
              <div className="flex items-center gap-2">
                {slides.map((s, i) => (
                  <button
                    key={s.src}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`${t("next")} ${i + 1} / ${slides.length}`}
                    aria-current={i === active}
                    className={`relative h-[3px] overflow-hidden rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      i === active
                        ? "w-12 bg-white/30"
                        : "w-5 bg-white/30 hover:bg-white/70"
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
                className="p-1 text-white/55 transition hover:text-white"
              >
                <ArrowRight className="size-4 rtl:rotate-180" />
              </button>
              <span className="sr-only" aria-live="polite">
                {active + 1} / {slides.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
