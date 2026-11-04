"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type RefObject,
} from "react";
import type { ScrollSmoother as Smoother } from "gsap/ScrollSmoother";

// null while preparing the scroller, false for native scrolling.
export type AtelierScroll = Smoother | false | null;
export const AtelierScrollContext = createContext<AtelierScroll>(null);
export const useAtelierScroll = () => useContext(AtelierScrollContext);

export function useOriginalesSmoother(
  root: RefObject<HTMLDivElement | null>,
  collectionPage: boolean,
) {
  const [scroll, setScroll] = useState<AtelierScroll>(null);
  useEffect(() => {
    const world = root.current;
    const wrapper = world?.querySelector<HTMLElement>(
      "[data-atelier-scroll-wrapper]",
    );
    const content = wrapper?.querySelector<HTMLElement>(
      "[data-atelier-scroll-content]",
    );
    if (!world || !wrapper || !content) return;
    const media = matchMedia(
      "(min-width: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let generation = 0;
    let stop = () => {};

    const sync = async () => {
      const attempt = ++generation;
      stop();
      stop = () => {};
      if (!media.matches) {
        setScroll(false);
        return;
      }
      try {
        const [{ gsap }, { ScrollTrigger }, { ScrollSmoother }] =
          await Promise.all([
            import("gsap"),
            import("gsap/ScrollTrigger"),
            import("gsap/ScrollSmoother"),
          ]);
        if (attempt !== generation) return;
        gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
        let stage: HTMLElement | null = null;
        let fixed: NodeListOf<HTMLElement> | undefined;
        let origin = 0;
        let ceiling = 0;
        let inset = 0;
        let frame = 0;

        // Keep the two native sticky layouts geometrically equivalent in a
        // transformed scroller. Translate independently of each scene's GSAP pose.
        const place = (smoother: Smoother) => {
          const y = smoother.scrollTop();
          stage?.style.setProperty(
            "--atelier-stage-y",
            `${Math.min(ceiling, Math.max(0, y + inset - origin))}px`,
          );
          fixed?.forEach((element) => {
            element.style.translate = `0 ${y}px`;
          });
        };
        const originalBodyHeight = document.body.style.height;
        world.setAttribute("data-originales-smoothed", "");
        const smoother = ScrollSmoother.create({
          wrapper,
          content,
          smooth: 0.18,
          smoothTouch: false,
          effects: false,
          normalizeScroll: false,
          onUpdate: place,
        });
        const clearPositions = () => {
          stage?.style.removeProperty("--atelier-stage-y");
          fixed?.forEach((element) =>
            element.style.removeProperty("translate"),
          );
        };
        const measure = () => {
          stage = content.querySelector("[data-gallery-stage], [data-scene]");
          const runway = stage?.parentElement;
          inset = stage?.hasAttribute("data-gallery-stage")
            ? parseFloat(
                getComputedStyle(world).getPropertyValue(
                  "--atelier-gallery-top",
                ),
              )
            : 0;
          origin = runway
            ? runway.getBoundingClientRect().top + smoother.scrollTop()
            : 0;
          ceiling =
            stage && runway
              ? Math.max(0, runway.offsetHeight - stage.offsetHeight)
              : 0;
          fixed = content.querySelectorAll(
            "[data-atelier-masthead-layer], [data-originales-nav], [data-originales-loading]",
          );
          place(smoother);
        };
        const schedule = () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(measure);
        };
        const jumpToHash = (hash: string) => {
          const anchor = document.getElementById(hash.slice(1));
          if (!anchor || !world.contains(anchor)) return false;
          const margin =
            parseFloat(getComputedStyle(anchor).scrollMarginTop) || 0;
          smoother.scrollTo(
            anchor.getBoundingClientRect().top + smoother.scrollTop() - margin,
            true,
          );
          return true;
        };
        const followAnchor = (event: MouseEvent) => {
          if (
            event.defaultPrevented ||
            event.button ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          const anchor = (
            event.target as Element | null
          )?.closest<HTMLAnchorElement>('a[href^="#"]');
          if (!anchor?.hash || !jumpToHash(anchor.hash)) return;
          event.preventDefault();
          if (location.hash !== anchor.hash)
            history.pushState(null, "", anchor.hash);
        };
        const restoreHash = () => {
          if (location.hash) jumpToHash(location.hash);
        };
        const resize = new ResizeObserver(schedule);
        resize.observe(content);
        const mutation = new MutationObserver(schedule);
        mutation.observe(content, { childList: true, subtree: true });
        ScrollTrigger.addEventListener("refresh", schedule);
        world.addEventListener("click", followAnchor);
        window.addEventListener("hashchange", restoreHash);
        stop = () => {
          cancelAnimationFrame(frame);
          resize.disconnect();
          mutation.disconnect();
          ScrollTrigger.removeEventListener("refresh", schedule);
          world.removeEventListener("click", followAnchor);
          window.removeEventListener("hashchange", restoreHash);
          // Child effects are disposed after a media change. Release their
          // wrapper-bound triggers before removing the scroller proxy.
          ScrollTrigger.getAll().forEach((trigger) => {
            if (trigger.scroller === wrapper) trigger.kill();
          });
          smoother.kill();
          document.body.style.height = originalBodyHeight;
          clearPositions();
          world.removeAttribute("data-originales-smoothed");
        };
        measure();
        restoreHash();
        setScroll(smoother);
      } catch {
        if (attempt !== generation) return;
        stop();
        stop = () => {};
        world.removeAttribute("data-originales-smoothed");
        setScroll(false);
      }
    };
    void sync();
    media.addEventListener("change", sync);
    return () => {
      generation++;
      media.removeEventListener("change", sync);
      stop();
    };
  }, [root]);
  useEffect(() => {
    if (scroll) scroll.smooth(collectionPage ? 0.24 : 0.18);
  }, [collectionPage, scroll]);
  return scroll;
}
