"use client";

import { useEffect, useRef } from "react";
import { atelierGsap } from "./atelier-gsap";

// A bottle becomes a drop of perfume, then returns to its original form.
const bottle =
  "M21 6H79Q83 6 83 10V27Q83 31 79 31H66V43L82 53Q88 57 88 66V138Q88 146 80 146H20Q12 146 12 138V66Q12 57 18 53L34 43V31H21Q17 31 17 27V10Q17 6 21 6Z";
const drop =
  "M50 9C61 31 88 62 88 92C88 122 72 143 50 146C28 143 12 122 12 92C12 62 39 31 50 9Z";

export function OriginalesLoadingMark() {
  const path = useRef<SVGPathElement>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let live = true;
    let generation = 0;
    let release = () => {};
    const start = async () => {
      const attempt = ++generation;
      release();
      if (media.matches) return;
      const { gsap } = await atelierGsap();
      if (!live || attempt !== generation || media.matches || !path.current)
        return;
      const animation = gsap.timeline({ repeat: -1, repeatDelay: 0.35 });
      animation
        .to(path.current, {
          morphSVG: drop,
          duration: 1.25,
          ease: "power2.inOut",
        })
        .to(path.current, {
          morphSVG: bottle,
          duration: 1.25,
          delay: 0.3,
          ease: "power2.inOut",
        });
      const visibility = () => animation.paused(document.hidden);
      visibility();
      document.addEventListener("visibilitychange", visibility);
      release = () => {
        animation.kill();
        path.current?.setAttribute("d", bottle);
        document.removeEventListener("visibilitychange", visibility);
      };
    };
    void start();
    media.addEventListener("change", start);
    return () => {
      live = false;
      release();
      media.removeEventListener("change", start);
    };
  }, []);
  return (
    <svg
      data-originales-loading-mark
      viewBox="0 0 100 154"
      width="64"
      height="98"
      aria-hidden="true"
    >
      <path
        ref={path}
        d={bottle}
        fill="currentColor"
        fillOpacity=".14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
