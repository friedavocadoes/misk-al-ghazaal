"use client";

import { paintStudio, type StudioPalette } from "./studio-scene";
import { useEffect, useRef, type CSSProperties } from "react";
import s from "./atelier.module.css";

// Asymmetric placement and timing keep the glints from reading as a particle field.
const glints = [
  { x: 13, y: 34, size: 2, delay: -2, duration: 8 },
  { x: 23, y: 62, size: 3, delay: -5, duration: 11 },
  { x: 7, y: 79, size: 2, delay: -3, duration: 13 },
  { x: 84, y: 22, size: 2, delay: -7, duration: 12 },
  { x: 76, y: 49, size: 3, delay: -1, duration: 9 },
  { x: 92, y: 68, size: 2, delay: -6, duration: 14 },
];

export function StudioAtmosphere({ ink, accent, wash }: StudioPalette) {
  const plate = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = plate.current;
    const surface = canvas.current;
    const ctx = surface?.getContext("2d", { alpha: false });
    const scene = element?.parentElement;
    const product = scene?.closest("[data-originales-product]");
    if (!element || !surface || !ctx || !scene || !product) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let frame = 0;
    let previous = 0;
    let time = 0;
    let x = 0,
      y = 0,
      targetX = 0,
      targetY = 0;
    const paint = () =>
      paintStudio(
        ctx,
        surface.width,
        surface.height,
        { ink, accent, wash },
        time,
        x,
        y,
      );

    const animate = (now: number) => {
      // Keep the canvas cadence bounded without changing the rate of the animation.
      const delta = now - previous;
      if (delta >= 1000 / 30) {
        time += Math.min(delta, 80) / 1000;
        const follow = 1 - Math.exp(-delta / 230);
        x += (targetX - x) * follow;
        y += (targetY - y) * follow;
        paint();
        previous = now;
      }
      frame = requestAnimationFrame(animate);
    };
    const sync = () => {
      const active =
        visible &&
        !document.hidden &&
        !reduced.matches &&
        product.getAttribute("data-price-ready") !== "true";
      element.dataset.studioActive = String(active);
      const waterReady = scene.querySelector(
        '[data-liquid-effect][data-ready="true"]',
      );
      if (active && !waterReady) {
        if (!frame) {
          previous = performance.now();
          frame = requestAnimationFrame(animate);
        }
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const resize = () => {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      const ratio = Math.min(1, Math.sqrt(580_000 / (width * height)));
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
      paint();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !frame) return;
      const rect = element.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    const resetPointer = () => {
      targetX = 0;
      targetY = 0;
    };

    resize();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(element);
    const viewport = new IntersectionObserver(
      ([entry]) => {
        visible = entry.intersectionRatio >= 0.18;
        sync();
      },
      { threshold: 0.18 },
    );
    viewport.observe(element);
    const status = new MutationObserver(sync);
    status.observe(product, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-price-ready", "data-ready"],
    });
    scene.addEventListener("pointermove", move, { passive: true });
    scene.addEventListener("pointerleave", resetPointer);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      viewport.disconnect();
      status.disconnect();
      scene.removeEventListener("pointermove", move);
      scene.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [ink, accent, wash]);

  return (
    <>
      <div
        ref={plate}
        data-studio-active="false"
        className={s.heroBackdrop}
        aria-hidden="true"
      >
        <canvas ref={canvas} data-studio-canvas className={s.studioCanvas} />
      </div>
      <div className={s.studioGlints} aria-hidden="true">
        {glints.map(({ x, y, size, delay, duration }) => (
          <span
            key={x}
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                "--glint-delay": `${delay}s`,
                "--glint-duration": `${duration}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}
