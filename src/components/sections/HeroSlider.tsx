"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import { tx } from "@/lib/i18n";
import type { Banner } from "@/lib/types";

const isVideo = (src: string) => /\.mp4(?:[?#]|$)/i.test(src);
export function HeroSlider({ slides }: { slides: Banner[] }) {
  const locale = useLocale() === "ar" ? "ar" : "en";
  const t = useTranslations("Hero");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || reduced || slides.length < 2 || isVideo(slides[active]?.src || "")) return;
    const timer = setInterval(() => { if (!document.hidden) setActive((i) => (i + 1) % slides.length); }, 6200);
    return () => clearInterval(timer);
  }, [paused, reduced, slides, active]);
  useEffect(() => {
    videos.current.forEach((video, index) => {
      if (!video) return;
      if (index === active && !paused && !reduced) {
        if (video.ended) video.currentTime = 0;
        void video.play().catch(() => undefined);
      } else video.pause();
    });
  }, [active, paused, reduced]);
  if (!slides.length) return null;
  return <section className="fullscreen-hero" data-home-hero aria-label="Featured" aria-roledescription="carousel">
    {slides.map((slide, index) => {
      const current = active === index;
      const title = tx(slide.title || "", slide.titleAr, locale);
      const cta = tx(slide.cta || "", slide.ctaAr, locale);
      return <div key={slide.id || slide.src + index} className="hero-dissolve-slide" data-active={current} aria-hidden={!current} inert={!current}>
        {isVideo(slide.src) ? <video ref={(node) => { videos.current[index] = node; }} className="hero-film" src={index === 0 || current ? slide.src : undefined} poster={slide.fallback || undefined} muted playsInline loop={slides.length < 2} onEnded={() => { if (current && !paused && !reduced && slides.length > 1) setActive((i) => (i + 1) % slides.length); }} preload={index === 0 ? "auto" : "none"} aria-label={slide.alt} /> : <div className="hero-image-drift"><SafeImage src={slide.src} fallback={slide.fallback} alt={slide.alt} fill priority={index === 0} sizes="100vw" className="object-cover" style={{ objectPosition: slide.focal || "center" }} /></div>}
        <div className="hero-legibility" />
        <div className={`hero-copy ${slide.align === "center" ? "hero-copy-center" : ""}`}>
          {title && <h2>{title}</h2>}
          {cta && slide.href && <Link href={slide.href} className="hero-action">{cta}</Link>}
        </div>
      </div>;
    })}
    <div className="hero-controls">
      <div className="hero-indicators" role="group" aria-label="Slides">{slides.map((slide, index) => <button key={slide.id || index} type="button" aria-label={`${t("next")} ${index + 1} / ${slides.length}`} aria-current={index === active ? "true" : undefined} onClick={() => setActive(index)}><span>{index === active && <i key={`${active}-${paused}-${reduced}`} style={{ animationPlayState: paused || reduced ? "paused" : "running" }} />}</span></button>)}</div>
      <button className="hero-pause" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} aria-label={paused ? (locale === "ar" ? "تشغيل العرض" : "Play slideshow") : (locale === "ar" ? "إيقاف العرض" : "Pause slideshow")}>{paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}</button>
    </div>
  </section>;
}