"use client";

import { useEffect, useRef } from "react";

const bottle =
  "M 60 42 L 140 42 L 143 46 L 143 70 L 140 74 L 119 74 L 119 100 L 165 100 Q 170 100, 170 105 L 170 255 Q 170 260, 165 260 L 35 260 Q 30 260, 30 255 L 30 105 Q 30 100, 35 100 L 81 100 L 81 74 L 60 74 L 57 70 L 57 46 Z";

const drop =
  "M100 42 C117.5 77 160.5 126.3 160.5 174.1 C160.5 221.8 135 255.2 100 260 C65 255.2 39.5 221.8 39.5 174.1 C39.5 126.3 82.5 77 100 42 Z";

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

      const [{ gsap }, { MorphSVGPlugin }] = await Promise.all([
        import("gsap"),
        import("gsap/MorphSVGPlugin"),
      ]);

      if (!live || attempt !== generation || media.matches || !path.current)
        return;

      gsap.registerPlugin(MorphSVGPlugin);

      const animation = gsap.timeline({ repeat: -1, repeatDelay: 0.35 });
      animation
        .to(path.current, {
          morphSVG: drop,
          duration: 1.25,
          ease: "sine.inOut",
        })
        .to(path.current, {
          morphSVG: bottle,
          duration: 1.25,
          delay: 0.3,
          ease: "sine.inOut",
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
      viewBox="0 0 200 308"
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
        strokeWidth="2.4" 
        strokeLinejoin="round"
      />
    </svg>
  );
}