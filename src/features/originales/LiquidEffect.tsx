"use client";

// Adapted from the user-supplied 21st.dev component; same liquid1 engine/settings,
// instance-local ownership, no module script injection or global canvas identifier.
import { useEffect, useRef } from "react";
import type { LiquidApp } from "threejs-components/build/backgrounds/liquid1.min.js";
import { captureLiquidListeners, liquidDropQueue } from "./liquid-lifecycle";
import s from "./atelier.module.css";

export function LiquidEffectAnimation({
  imageSrc = "/originales/lazvaro-atmosphere.webp",
}: {
  imageSrc?: string;
}) {
  const host = useRef<HTMLDivElement>(null),
    appRef = useRef<LiquidApp | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const page = el.closest("[data-originales-product]");
    const reduced = matchMedia("(prefers-reduced-motion:reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    let disposed = false,
      visible = false,
      pending = false,
      generation = 0;
    let stop = () => {};
    const update = () => {
      const allowed =
        !disposed &&
        visible &&
        !document.hidden &&
        !reduced.matches &&
        !connection?.saveData &&
        page?.getAttribute("data-price-ready") !== "true";
      if (!allowed) {
        generation++;
        pending = false;
        stop();
        stop = () => {};
        el.dataset.ready = "false";
        return;
      }
      if (pending || appRef.current) return;
      pending = true;
      const token = ++generation;
      let release = () => {};
      void import("threejs-components/build/backgrounds/liquid1.min.js")
        .then(async ({ default: LiquidBackground }) => {
          if (disposed || token !== generation) return;
          const canvas = document.createElement("canvas");
          canvas.className = s.liquidCanvas;
          canvas.setAttribute("aria-hidden", "true");
          el.appendChild(canvas);
          let instance: LiquidApp;
          try {
            const captured = captureLiquidListeners(
              [window, document, document.body, canvas],
              () => LiquidBackground(canvas),
            );
            instance = captured.value;
            let released = false;
            const lost = (event: Event) => {
              event.preventDefault();
              if (token === generation) {
                generation++;
                pending = false;
                el.dataset.ready = "false";
              }
              release();
            };
            release = () => {
              if (released) return;
              released = true;
              canvas.removeEventListener("webglcontextlost", lost);
              try {
                instance.dispose();
              } finally {
                captured.release();
                instance.three.renderer.forceContextLoss();
                canvas.remove();
                if (appRef.current === instance) appRef.current = null;
              }
            };
            stop = release;
            appRef.current = instance;
            canvas.addEventListener("webglcontextlost", lost);
            // Keep any already-queued upstream resize callback harmless after disposal.
            const resize = instance.three.resize.bind(instance.three);
            instance.three.resize = () => {
              if (instance.three.isDisposed) return;
              instance.three.maxPixelRatio = Math.min(
                1,
                Math.sqrt(
                  650_000 / Math.max(1, el.clientWidth * el.clientHeight),
                ),
              );
              resize();
            };
            instance.three.resize();
            canvas.style.touchAction = "pan-y";
            instance.liquidPlane.material.metalness = 0.75;
            instance.liquidPlane.material.roughness = 0.25;
            instance.liquidPlane.uniforms.displacementScale.value = 5;
            instance.setRain(false);
            // Native RAF cadence, but only one pointer injection per frame.
            const simulate = instance.three.onBeforeRender.bind(instance.three);
            const drops = liquidDropQueue(
              instance.liquidPlane.addDrop.bind(instance.liquidPlane),
            );
            instance.liquidPlane.addDrop = drops.add;
            instance.three.onBeforeRender = (time) => {
              drops.flush();
              simulate(time);
            };
            const loadedBackdrop = page?.querySelector<HTMLImageElement>(
              '[class*="heroBackdrop"] img',
            )?.currentSrc;
            await instance.loadImage(loadedBackdrop || imageSrc);
            if (disposed || token !== generation) {
              instance.liquidPlane.material.map?.dispose();
              release();
              return;
            }
            el.dataset.ready = "true";
          } catch {
            release();
            canvas.remove();
            if (token === generation) el.dataset.ready = "false";
          } finally {
            if (token === generation) pending = false;
          }
        })
        .catch(() => {
          if (token === generation) {
            pending = false;
            el.dataset.ready = "false";
          }
        });
    };
    const viewport = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      update();
    });
    viewport.observe(el);
    const attrs = new MutationObserver(update);
    if (page)
      attrs.observe(page, {
        attributes: true,
        attributeFilter: ["data-price-ready"],
      });
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    return () => {
      disposed = true;
      generation++;
      viewport.disconnect();
      attrs.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
      stop();
      appRef.current = null;
    };
  }, [imageSrc]);
  return (
    <div
      ref={host}
      className={s.liquidHost}
      data-liquid-effect
      data-ready="false"
      aria-hidden="true"
    />
  );
}
