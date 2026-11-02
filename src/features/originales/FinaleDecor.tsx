"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { atelierGsap } from "./atelier-gsap";
import s from "./atelier.module.css";

export function FinaleDecor() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true,
      stop = () => {};
    Promise.all([atelierGsap(), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (
          !live ||
          !root.current ||
          matchMedia("(prefers-reduced-motion:reduce)").matches
        )
          return;
        gsap.registerPlugin(ScrollTrigger);
        const el = root.current;
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: el.closest("[data-snap-panel]"),
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          });
          tl.fromTo(
            el.querySelector("[data-finale-material]"),
            { y: 130, x: -28, rotate: -18, scale: 0.8 },
            {
              y: -10,
              x: 0,
              rotate: 8,
              scale: 1,
              duration: 0.5,
              ease: "power2.inOut",
            },
            0,
          ).to(
            el.querySelector("[data-finale-material]"),
            {
              y: -120,
              x: 30,
              rotate: 22,
              scale: 1.08,
              duration: 0.5,
              ease: "none",
            },
            0.5,
          );
          tl.fromTo(
            el.querySelector("path"),
            {
              morphSVG:
                "M50 6 C85 6 94 28 94 50 C94 85 72 94 50 94 C15 94 6 72 6 50 C6 15 28 6 50 6 Z M50 25 C32 25 25 40 25 50 C25 68 40 75 50 75 C68 75 75 60 75 50 C75 32 60 25 50 25 Z",
            },
            {
              morphSVG:
                "M50 4 C70 22 96 20 96 50 C78 70 80 96 50 96 C30 78 4 80 4 50 C22 30 20 4 50 4 Z M50 30 C39 30 30 39 30 50 C30 61 39 70 50 70 C61 70 70 61 70 50 C70 39 61 30 50 30 Z",
              rotation: 70,
              transformOrigin: "50% 50%",
              duration: 1,
              ease: "none",
            },
            0,
          );
        }, el);
        stop = () => ctx.revert();
      },
    );
    return () => {
      live = false;
      stop();
    };
  }, []);
  return (
    <div ref={root} className={s.finaleDecor} aria-hidden="true">
      <Image
        data-finale-material
        src="/originales/sculpture-fold.webp"
        alt=""
        width={650}
        height={650}
        sizes="(max-width:759px) 45vw, 30vw"
      />
      <svg viewBox="0 0 100 100">
        <path
          d="M50 6 C85 6 94 28 94 50 C94 85 72 94 50 94 C15 94 6 72 6 50 C6 15 28 6 50 6 Z M50 25 C32 25 25 40 25 50 C25 68 40 75 50 75 C68 75 75 60 75 50 C75 32 60 25 50 25 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth=".3"
        />
      </svg>
    </div>
  );
}
