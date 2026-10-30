"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import { tx } from "@/lib/i18n";
import type { Banner } from "@/lib/types";

const isVideo = (src: string) => /\.mp4(?:[?#]|$)/i.test(src);
export function HeroSlider({ slides: originalSlides }: { slides: Banner[] }) {
  useEffect(() => {
    if (originalSlides.length) return;
    window.dispatchEvent(new Event("home-hero-availability"));
    return () => { queueMicrotask(() => window.dispatchEvent(new Event("home-hero-availability"))); };
  }, [originalSlides.length]);
  const [mobile,setMobile]=useState<boolean|null>(null);
  useEffect(()=>{const q=matchMedia("(max-width: 767px)");const update=()=>setMobile(q.matches);update();q.addEventListener("change",update);return()=>q.removeEventListener("change",update);},[]);
  const slides=originalSlides.map(s=>s.mobileSrc ? {...s,src:mobile===null?"":mobile?s.mobileSrc:s.src,fallback:mobile===null?"":mobile?s.mobileFallback||"":s.fallback}:s);
  const locale = useLocale() === "ar" ? "ar" : "en";
  const t = useTranslations("Hero");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [videoTiming, setVideoTiming] = useState({ duration: 0, time: 0, rev: 0 });
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
      if (index === active) {
        if (video.ended) video.currentTime = 0;
        setVideoTiming((prev) => ({ duration: Number.isFinite(video.duration) ? video.duration : 0, time: video.currentTime || 0, rev: prev.rev + 1 }));
        if (!paused && !reduced) void video.play().catch(() => undefined);
        else video.pause();
      } else video.pause();
    });
  }, [active, paused, reduced, mobile]);
  if (!slides.length) return <span hidden data-home-no-hero />;
  const syncVideo = (video: HTMLVideoElement, current: boolean) => {
    if (current && Number.isFinite(video.duration) && video.duration > 0) {
      setVideoTiming((prev) => ({ duration: video.duration, time: video.currentTime, rev: prev.rev + 1 }));
    }
  };
  return <section className="fullscreen-hero" data-home-hero aria-label="Featured" aria-roledescription="carousel">
    {slides.map((slide, index) => {
      const current = active === index;
      const title = tx(slide.title || "", slide.titleAr, locale);
      const cta = tx(slide.cta || "", slide.ctaAr, locale);
      return <div key={slide.id || slide.src + index} className="hero-dissolve-slide" data-active={current} aria-hidden={!current} inert={!current}>
        {!slide.src ? null : isVideo(slide.src) ? <video ref={(node) => { videos.current[index] = node; }} className="hero-film" style={{objectFit:slide.fit||"cover",objectPosition:slide.focal||"center"}} src={index === 0 || current ? slide.src : undefined} poster={slide.fallback || undefined} muted playsInline loop={slides.length < 2} onLoadedMetadata={(e) => syncVideo(e.currentTarget, current)} onDurationChange={(e) => syncVideo(e.currentTarget, current)} onSeeked={(e) => syncVideo(e.currentTarget, current)} onEnded={() => { if (current && !paused && !reduced && slides.length > 1) setActive((i) => (i + 1) % slides.length); }} preload={index === 0 ? "auto" : "none"} aria-label={slide.alt} /> : <div className="hero-image-drift"><SafeImage src={slide.src} fallback={slide.fallback} alt={slide.alt} fill priority={index === 0} sizes="100vw" className="object-cover" style={{ objectPosition: slide.focal || "center", objectFit: slide.fit || "cover" }} /></div>}
        <div className="hero-legibility" />
        <div className={`hero-copy ${slide.align === "center" ? "hero-copy-center" : slide.align === "bottom-center" ? "hero-copy-bottom-center" : ""}`}>
          {title && <h2>{title}</h2>}
          {cta && slide.href && <Link href={slide.href} className="hero-action">{cta}</Link>}
        </div>
      </div>;
    })}
    <div className="hero-controls">
      <div className="hero-indicators" role="group" aria-label="Slides">{slides.map((slide, index) => {
        const activeVideo = index === active && isVideo(slide.src);
        return <button key={slide.id || index} type="button" aria-label={`${t("next")} ${index + 1} / ${slides.length}`} aria-current={index === active ? "true" : undefined} onClick={() => setActive(index)}><span>{index === active && <i key={`${active}-${paused}-${reduced}-${activeVideo ? videoTiming.rev : 0}`} style={{ ...(activeVideo ? (videoTiming.duration > 0 ? { animationDuration: `${videoTiming.duration}s`, animationDelay: `-${videoTiming.time}s` } : { animationName: "none" }) : undefined), animationPlayState: paused || reduced ? "paused" : "running" }} />}</span></button>;
      })}</div>
      <button className="hero-pause" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} aria-label={paused ? (locale === "ar" ? "تشغيل العرض" : "Play slideshow") : (locale === "ar" ? "إيقاف العرض" : "Pause slideshow")}>{paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}</button>
    </div>
  </section>;
}
