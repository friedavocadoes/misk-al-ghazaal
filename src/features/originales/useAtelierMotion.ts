"use client";
import { useEffect, type RefObject } from "react";
import { atelierGsap } from "./atelier-gsap";
import { PRODUCT_FRAMES } from "./motion-config";
import { PANEL_ARRIVAL, PANEL_FRAME } from "./MorphFrame";

/** Shared lighting, decorative parallax and proximity-only section settling. Native scroll stays in control. */
export function useAtelierMotion(
  root: RefObject<HTMLDivElement | null>,
  route: string,
) {
  useEffect(() => {
    let live = true,
      dispose = () => {};
    Promise.all([atelierGsap(), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (!live || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            mobile: "(max-width: 759px)",
          },
          (context) => {
            if (!context.conditions?.motion) return;
            const node = root.current!;
            const seen = new WeakSet<Element>();
            const scan = () =>
              context.add(() => {
                if (context.conditions?.mobile) return;
                node.querySelectorAll("[data-snap-panel]").forEach((panel) => {
                  if (seen.has(panel)) return;
                  const heading = panel.querySelector(
                    "[class*=editionCard] h2, [class*=panelContent] h2",
                  );
                  if (!heading) return;
                  seen.add(panel);
                  const reveal = gsap.timeline({
                    defaults: { ease: "atelier-soft" },
                    scrollTrigger: {
                      trigger: panel,
                      start: "top 93%",
                      end: "top 56%",
                      scrub: 0.32,
                    },
                  });
                  reveal.fromTo(
                    heading,
                    { y: 9, opacity: 0.78 },
                    { y: 0, opacity: 1 },
                  );
                  if (!panel.hasAttribute("data-gallery-finale")) {
                    reveal.fromTo(
                      panel.querySelectorAll(
                        "[data-morph-frame], [data-frame-trace], [data-morph-clip]",
                      ),
                      { morphSVG: PANEL_ARRIVAL },
                      { morphSVG: PANEL_FRAME },
                      0,
                    );
                  }
                });
              });
            scan();
            let frame = 0,
              refresh: ReturnType<typeof setTimeout> | undefined;
            const observer = new MutationObserver(() => {
              cancelAnimationFrame(frame);
              frame = requestAnimationFrame(scan);
            });
            observer.observe(node, { childList: true, subtree: true });
            const resize = new ResizeObserver(() => {
              clearTimeout(refresh);
              refresh = setTimeout(() => ScrollTrigger.refresh(), 220);
            });
            resize.observe(node);
            let settleTimer: ReturnType<typeof setTimeout> | undefined;
            let settleTween: ReturnType<typeof gsap.to> | undefined;
            let pointerHeld = false;
            let touchHeld = false;
            let lastScroll = window.scrollY;
            let direction = 0;

            const cancelSettle = () => {
              clearTimeout(settleTimer);
              settleTween?.kill();
              settleTween = undefined;
              lastScroll = window.scrollY;
              direction = 0;
            };

            const settle = () => {
              if (
                direction === 0 ||
                pointerHeld ||
                touchHeld ||
                document.body.hasAttribute("data-originales-photo-focus") ||
                document.querySelector(
                  '[role="dialog"][data-state="open"],[data-radix-popper-content-wrapper]',
                ) ||
                document.activeElement?.closest(
                  "input,textarea,select,[contenteditable=true]",
                )
              )
                return;

              const current = window.scrollY;
              const max = ScrollTrigger.maxScroll(window);
              const mobile = innerWidth < 760;
              const gallery = node.querySelector("[data-gallery-stage]");
              const runway = node.querySelector("[data-runway]");
              if (mobile) return;
              const desktopProduct = !mobile && !!runway;
              const stage = gallery?.getBoundingClientRect();
              const scene = runway?.querySelector<HTMLElement>("[data-scene]");
              const offset = stage
                ? Math.max(176, stage.top + 16)
                : Math.max(104, (scene?.clientHeight ?? 0) * 0.12);

              const origin = runway
                ? current + runway.getBoundingClientRect().top
                : 0;
              const dock = origin + PRODUCT_FRAMES.dock * innerHeight;
              const stops = desktopProduct
                ? [origin, origin + PRODUCT_FRAMES.price * innerHeight, dock]
                : [];
              const cards = [
                ...node.querySelectorAll<HTMLElement>("[data-snap-panel]"),
              ]
                .filter((panel) => panel.offsetHeight > 0)
                .map((panel) =>
                  (
                    panel.querySelector(
                      "[class*=editionCard],[class*=panelContent]",
                    ) ?? panel
                  ).getBoundingClientRect(),
                );

              for (const card of cards) {
                const start = Math.max(
                  desktopProduct ? dock : 0,
                  current + card.top - offset,
                );
                stops.push(start);

                // A card taller than the reading area gets a continuous reading range.
                const end = current + card.bottom - innerHeight + 32;
                if (end > start) {
                  if (current >= start && current <= end) return;
                  stops.push(end);
                }
              }
              if (desktopProduct && current > Math.max(...stops) + 24) return;

              const ordered = [
                ...new Set(
                  stops.map((stop) =>
                    Math.round(gsap.utils.clamp(0, max, stop)),
                  ),
                ),
              ].sort((a, b) => a - b);
              const upperIndex = ordered.findIndex((stop) => stop >= current);
              if (upperIndex < 0 || Math.abs(ordered[upperIndex] - current) < 2)
                return;
              if (upperIndex === 0 && (desktopProduct || direction < 0)) return;

              const upper = ordered[upperIndex];
              const lower =
                ordered[upperIndex - 1] ?? upper - innerHeight * 0.65;
              const target = direction > 0 ? upper : lower;
              const distance = Math.abs(target - current);
              const progress = 1 - distance / (upper - lower);
              const openingFlight = desktopProduct && upperIndex === 1;
              if (
                distance < 2 ||
                progress < (openingFlight ? 0.22 : 0.4) ||
                distance > innerHeight * (openingFlight ? 0.88 : 0.7)
              )
                return;

              const position = { y: current };
              settleTween = gsap.to(position, {
                y: target,
                duration: gsap.utils.clamp(0.3, 0.65, distance / 1150),
                ease: "sine.inOut",
                // The site sets CSS smooth scrolling on html. Each tween write must be instant.
                onUpdate: () =>
                  window.scrollTo({ top: position.y, behavior: "instant" }),
                onComplete: () => {
                  settleTween = undefined;
                  lastScroll = window.scrollY;
                  direction = 0;
                },
              });
            };
            const scheduleSettle = () => {
              if (settleTween || direction === 0) return;
              clearTimeout(settleTimer);
              settleTimer = setTimeout(settle, 240);
            };
            const trackScroll = () => {
              if (settleTween) return;
              const current = window.scrollY;
              if (current === lastScroll) return;
              direction = Math.sign(current - lastScroll);
              lastScroll = current;
              scheduleSettle();
            };
            const holdPointer = () => {
              pointerHeld = true;
              cancelSettle();
            };
            const releasePointer = () => {
              pointerHeld = false;
              scheduleSettle();
            };
            const holdTouch = () => {
              touchHeld = true;
              cancelSettle();
            };
            const releaseTouch = () => {
              touchHeld = false;
              scheduleSettle();
            };
            const interruptByKey = (event: KeyboardEvent) => {
              if (
                [
                  "ArrowUp",
                  "ArrowDown",
                  "PageUp",
                  "PageDown",
                  "Home",
                  "End",
                  " ",
                ].includes(event.key)
              )
                cancelSettle();
            };
            window.addEventListener("scroll", trackScroll, {
              passive: true,
            });
            window.addEventListener("wheel", cancelSettle, { passive: true });
            window.addEventListener("pointerdown", holdPointer);
            window.addEventListener("pointerup", releasePointer);
            window.addEventListener("pointercancel", releasePointer);
            window.addEventListener("touchstart", holdTouch, { passive: true });
            window.addEventListener("touchend", releaseTouch, {
              passive: true,
            });
            window.addEventListener("touchcancel", releaseTouch, {
              passive: true,
            });
            window.addEventListener("keydown", interruptByKey);
            return () => {
              cancelSettle();
              window.removeEventListener("scroll", trackScroll);
              window.removeEventListener("wheel", cancelSettle);
              window.removeEventListener("pointerdown", holdPointer);
              window.removeEventListener("pointerup", releasePointer);
              window.removeEventListener("pointercancel", releasePointer);
              window.removeEventListener("touchstart", holdTouch);
              window.removeEventListener("touchend", releaseTouch);
              window.removeEventListener("touchcancel", releaseTouch);
              window.removeEventListener("keydown", interruptByKey);
              observer.disconnect();
              resize.disconnect();
              cancelAnimationFrame(frame);
              clearTimeout(refresh);
            };
          },
          root.current,
        );
        dispose = () => mm.revert();
      })
      .catch(() => {});
    return () => {
      live = false;
      dispose();
    };
  }, [root, route]);
}
