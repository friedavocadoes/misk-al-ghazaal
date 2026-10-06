"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCreative, Parallax } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";

gsap.registerPlugin(ScrollToPlugin);

// Cinematic hero: 3D fly-through slide transitions (Swiper Creative),
// Ken Burns drift on the active image, parallax captions, autoplay
// progress rail. Boxed with margins at the top; melts to full-bleed
// on scroll via direct-DOM margin writes (no re-render, no jank).
const MELT_RANGE = 200;
const BOX_MARGIN = 20;
// Fullscreen lock point: compact navbar + full-bleed hero.
// MUST equal the compact header height: at scrollY === LOCK the sticky
// navbar occupies visual [0, LOCK] and the hero (top glued at document
// LOCK, height LOCK+vh−LOCK… exactly vh) fills [LOCK, LOCK+vh] — navbar +
// hero are the only things on screen, on any screen size. Snapping
// anywhere else leaves the hero half above the viewport.
const lockFor = () =>
  typeof window !== "undefined" && window.innerWidth >= 1024 ? 72 : 68;

export function HeroSlider({ slides }: { slides: Banner[] }) {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastY = useRef(0);

  useEffect(() => {
    const sync = () => {
      // Side gutters melt 20px → 0, completing exactly at the lock point.
      // Hero height = scrollY + viewport − live header height, so its top
      // stays glued under the navbar while its bottom pins to the viewport
      // bottom — at LOCK the hero is exactly one fullscreen.
      const header = document.querySelector("header");
      const lock = lockFor();
      const p = Math.min(window.scrollY / lock, 1);
      const m = Math.round(BOX_MARGIN * (1 - p));
      if (boxRef.current) boxRef.current.style.margin = `0px ${m}px ${m}px`;
      if (sectionRef.current && header) {
        const h = Math.max(
          480,
          window.scrollY + window.innerHeight - header.offsetHeight
        );
        sectionRef.current.style.setProperty("--hero-h", `${Math.round(h)}px`);
      }
    };
    const snapTo = (y: number) => {
      gsap.to(window, {
        scrollTo: y,
        duration: 0.7,
        ease: "expo.out",
        overwrite: "auto",
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(sync);
      const y = window.scrollY;
      const dir = y > lastY.current ? "down" : "up";
      lastY.current = y;
      // Strict snap (home only): a stopped scroll always lands locked.
      // Any downward pause past a nudge completes the fullscreen takeover
      // at LOCK (== compact header height, so the hero lands pixel-glued
      // under the navbar in exact full view). Pausing below the lock while
      // moving up settles back to the top. Pushing through with continuous
      // motion passes freely — the timer only fires after the LAST event.
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => {
        const lock = lockFor();
        const yy = window.scrollY;
        if (yy <= 24 && yy > 0) snapTo(0);
        else if (yy > 24 && yy < lock) snapTo(dir === "up" ? 0 : lock);
        else if (dir === "down" && yy >= lock && yy <= lock + 140)
          snapTo(lock);
      }, 160);
    };
    // Grabbing the page mid-snap hands control straight back to the user.
    const cancelSnap = () => gsap.killTweensOf(window);
    sync();
    lastY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", cancelSnap, { passive: true });
    window.addEventListener("touchmove", cancelSnap, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", cancelSnap);
      window.removeEventListener("touchmove", cancelSnap);
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
                <div className="relative">
                  <span
                    key={i === active ? "on" : "off"}
                    className={`block overflow-hidden ${i === active ? "kenburns" : ""}`}
                  >
                    <SafeImage
                      src={s.src}
                      fallback={s.fallback}
                      alt={s.alt}
                      width={2000}
                      height={1100}
                      priority={i === 0}
                      className="h-[var(--hero-h,86svh)] min-h-[480px] w-full object-cover opacity-90"
                    />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-24 md:px-10 md:pb-28">
                    <p
                      data-swiper-parallax="-350"
                      className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft"
                    >
                      <span className="inline-block h-px w-10 bg-gold-soft" />
                      {s.eyebrow}
                    </p>
                    {s.title && (
                      <h2
                        data-swiper-parallax="-250"
                        className="mt-4 max-w-2xl font-display text-5xl leading-[1.02] md:text-7xl"
                      >
                        {s.title}
                      </h2>
                    )}
                    {s.desc && (
                      <p
                        data-swiper-parallax="-150"
                        className="mt-4 max-w-md text-sm leading-relaxed text-white/80 md:text-base"
                      >
                        {s.desc}
                      </p>
                    )}
                    {s.cta && s.href && (
                      <div data-swiper-parallax="-80" className="mt-8 flex items-center gap-8">
                        <Link
                          href={s.href}
                          className="bg-white px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-gold-wash"
                        >
                          {s.cta}
                        </Link>
                        <Link
                          href="/collections"
                          className="link-underline hidden text-[12px] font-semibold uppercase tracking-[0.2em] text-white/85 sm:inline"
                        >
                          Explore All
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Counter + autoplay progress + arrows */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-8 md:px-10">
            <div className="flex items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="font-display text-lg italic">
                  {String(active + 1).padStart(2, "0")}
                </span>
                <span className="relative block h-px w-28 overflow-hidden bg-white/25 md:w-44">
                  <span
                    ref={progressRef}
                    className="absolute inset-0 origin-left bg-gold-soft"
                    style={{ transform: "scaleX(0)" }}
                  />
                </span>
                <span className="text-xs tracking-[0.2em] text-white/60">
                  {String(slides.length).padStart(2, "0")}
                </span>
              </div>
              <div className="pointer-events-auto flex gap-2">
                <button
                  onClick={() => swiper?.slidePrev()}
                  aria-label="Previous slide"
                  className="border border-white/40 p-2.5 text-white transition hover:border-white hover:bg-white hover:text-ink"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <button
                  onClick={() => swiper?.slideNext()}
                  aria-label="Next slide"
                  className="border border-white/40 p-2.5 text-white transition hover:border-white hover:bg-white hover:text-ink"
                >
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
