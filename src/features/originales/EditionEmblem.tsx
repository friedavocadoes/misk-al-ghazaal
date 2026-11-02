"use client";
import { useEffect, useRef } from "react";
import { atelierGsap } from "./atelier-gsap";
import s from "./atelier.module.css";

const FORMS = [
  "M50 5 C80 5 95 23 95 50 C95 80 77 95 50 95 C20 95 5 77 5 50 C5 20 23 5 50 5 Z M50 25 C32 25 25 38 25 50 C25 68 38 75 50 75 C68 75 75 62 75 50 C75 32 62 25 50 25 Z",
  "M50 2 C63 25 98 20 98 50 C75 63 80 98 50 98 C37 75 2 80 2 50 C25 37 20 2 50 2 Z M50 29 C37 29 29 37 29 50 C29 63 37 71 50 71 C63 71 71 63 71 50 C71 37 63 29 50 29 Z",
  "M50 4 C92 4 96 42 96 50 C96 92 58 96 50 96 C8 96 4 58 4 50 C4 8 42 4 50 4 Z M50 20 C42 40 20 42 20 50 C40 58 42 80 50 80 C58 60 80 58 80 50 C60 42 58 20 50 20 Z",
  "M50 3 C68 3 97 32 97 50 C97 68 68 97 50 97 C32 97 3 68 3 50 C3 32 32 3 50 3 Z M50 28 C40 28 28 40 28 50 C28 60 40 72 50 72 C60 72 72 60 72 50 C72 40 60 28 50 28 Z",
];
export function EditionEmblem({ index }: { index: number }) {
  const path = useRef<SVGPathElement>(null);
  useEffect(() => {
    let live = true,
      stop = () => {};
    void atelierGsap().then(({ gsap }) => {
      if (!live || !path.current) return;
      const tween = gsap.to(path.current, {
        morphSVG: FORMS[index % FORMS.length],
        duration: matchMedia("(prefers-reduced-motion:reduce)").matches
          ? 0
          : 0.85,
        ease: "atelier-soft",
      });
      stop = () => tween.kill();
    });
    return () => {
      live = false;
      stop();
    };
  }, [index]);
  return (
    <svg className={s.editionEmblem} viewBox="0 0 100 100" aria-hidden="true">
      <path ref={path} fill="currentColor" fillRule="evenodd" d={FORMS[0]} />
    </svg>
  );
}
