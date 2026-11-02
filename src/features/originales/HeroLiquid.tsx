"use client";
import { useEffect, useId, useRef } from "react";
import { atelierGsap } from "./atelier-gsap";
import s from "./atelier.module.css";

/** Local reference-inspired treatment; 21st's implementation isn't publicly available. */
export function HeroLiquid() {
  const root = useRef<SVGSVGElement>(null),
    id = useId().replaceAll(":", "");
  useEffect(() => {
    let live = true,
      stop = () => {};
    void atelierGsap().then(({ gsap }) => {
      if (
        !live ||
        !root.current ||
        matchMedia("(prefers-reduced-motion:reduce)").matches ||
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData
      )
        return;
      const el = root.current,
        page = el.closest("[data-originales-product]")!;
      const ctx = gsap.context(() => {
        const flow = gsap.timeline({
          repeat: -1,
          yoyo: true,
          defaults: { duration: 7, ease: "sine.inOut" },
        });
        flow
          .to(
            el.querySelector("feTurbulence"),
            { attr: { baseFrequency: ".006 .012" } },
            0,
          )
          .to(el.querySelector("feDisplacementMap"), { attr: { scale: 32 } }, 0)
          .to(
            el.querySelector("[data-liquid-band]"),
            {
              morphSVG:
                "M-120 710 C250 900 340 120 760 390 C1080 650 1180 30 1560 190 L1570 235 C1160 70 1100 715 750 445 C330 165 250 955 -120 755 Z",
            },
            0,
          );
        let intersecting = true;
        const update = () => {
          if (
            document.hidden ||
            !intersecting ||
            page.getAttribute("data-price-ready") === "true"
          )
            flow.pause();
          else flow.resume();
        };
        const observer = new IntersectionObserver((entries) => {
          intersecting = entries[0].isIntersecting;
          update();
        });
        observer.observe(el);
        const attrs = new MutationObserver(update);
        attrs.observe(page, {
          attributes: true,
          attributeFilter: ["data-price-ready"],
        });
        document.addEventListener("visibilitychange", update);
        update();
        stop = () => {
          observer.disconnect();
          attrs.disconnect();
          document.removeEventListener("visibilitychange", update);
          ctx.revert();
        };
      }, el);
    });
    return () => {
      live = false;
      stop();
    };
  }, []);
  return (
    <svg
      ref={root}
      className={s.heroLiquid}
      viewBox="0 0 1400 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-hero-liquid
    >
      <defs>
        <linearGradient id={`liquid-${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#dae3d2" stopOpacity=".01" />
          <stop offset=".5" stopColor="#e3e3ca" stopOpacity=".22" />
          <stop offset=".7" stopColor="#a1b5b1" stopOpacity=".03" />
          <stop offset="1" stopColor="#fff6d9" stopOpacity=".14" />
        </linearGradient>
        <filter id={`flow-${id}`} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".003 .008"
            numOctaves="2"
            seed="4"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="12"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter={`url(#flow-${id})`} fill={`url(#liquid-${id})`}>
        <path
          data-liquid-band
          d="M-120 500 C220 740 480 100 790 390 C1120 700 1220 330 1560 100 L1570 145 C1210 390 1110 760 780 445 C470 165 220 795 -120 545 Z"
        />
        <path
          d="M-40 850 C500 640 610 1100 1080 710 C1320 500 1200 80 1500 10 L1510 45 C1250 150 1380 540 1100 750 C610 1160 510 710 -40 890 Z"
          opacity=".5"
        />
      </g>
    </svg>
  );
}
