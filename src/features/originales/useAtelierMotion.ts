"use client";
import { useEffect, type RefObject } from "react";
import { atelierGsap } from "./atelier-gsap";
import { PRODUCT_FRAMES } from "./motion-config";
import { PANEL_ARRIVAL, PANEL_FRAME } from "./MorphFrame";
import type { AtelierScroll } from "./atelier-scroll";

/** Shared lighting, decorative parallax and proximity-only section settling. Native scroll stays in control. */
export function useAtelierMotion(
  root: RefObject<HTMLDivElement | null>,
  route: string,
  smoother: AtelierScroll,
) {
  useEffect(() => {
    if (smoother === null) return;
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
            hover: "(hover: hover) and (pointer: fine)",
          },
          (context) => {
            if (!context.conditions?.motion) return;
            const node = root.current!;
            const seen = new WeakSet<Element>();
            const scan = () =>
              context.add(() => {
                node.querySelectorAll("[data-snap-panel]").forEach((panel) => {
                  if (seen.has(panel)) return;
                  const surface = panel.querySelector<HTMLElement>(
                    "[data-atelier-surface]",
                  );
                  const heading = surface?.querySelector("h2");
                  const frame = surface?.querySelector(
                    "[data-morph-surface=panel], [data-morph-surface=edition]",
                  );
                  const trace = frame?.querySelector("[data-frame-trace]");
                  if (!surface || !heading || !frame || !trace) return;
                  seen.add(panel);
                  if (panel.hasAttribute("data-gallery-finale")) return;
                  const mobileCollection =
                    context.conditions?.mobile &&
                    panel.closest("[data-originales-collection]");
                  const reveal = gsap.timeline({
                    defaults: { ease: "atelier-soft" },
                    scrollTrigger: {
                      trigger: surface,
                      start: mobileCollection ? "top 86%" : "top 76%",
                      end: mobileCollection ? "top 60%" : "top 25%",
                      scrub: 0.38,
                    },
                  });
                  reveal
                    .fromTo(
                      heading,
                      { y: 9, opacity: 0.8 },
                      { y: 0, opacity: 1 },
                      0,
                    )
                    .fromTo(
                      frame.querySelectorAll(
                        "[data-morph-frame], [data-frame-trace], [data-morph-clip]",
                      ),
                      { morphSVG: PANEL_ARRIVAL },
                      { morphSVG: PANEL_FRAME },
                      0,
                    )
                    .fromTo(
                      trace,
                      { attr: { "stroke-opacity": 0.72 } },
                      { attr: { "stroke-opacity": 0.26 } },
                      0,
                    );
                });
              });
            scan();
            let litCard: HTMLElement | undefined;
            const lights = new WeakMap<
              HTMLElement,
              {
                x: ReturnType<typeof gsap.quickTo>;
                y: ReturnType<typeof gsap.quickTo>;
              }
            >();
            const dimLight = () => {
              litCard?.removeAttribute("data-panel-lit");
              litCard = undefined;
            };
            const followLight = (event: PointerEvent) => {
              const card = (
                event.target as Element | null
              )?.closest<HTMLElement>("[data-atelier-surface]");
              if (event.pointerType === "touch" || !card) {
                dimLight();
                return;
              }
              const rect = card.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const y = event.clientY - rect.top;
              if (card !== litCard) {
                dimLight();
                const light = card.querySelector("[data-panel-light]");
                if (!light) return;
                context.add(() => {
                  if (!lights.has(card)) {
                    gsap.set(light, { x, y });
                    lights.set(card, {
                      x: gsap.quickTo(light, "x", {
                        duration: 0.48,
                        ease: "atelier-settle",
                      }),
                      y: gsap.quickTo(light, "y", {
                        duration: 0.48,
                        ease: "atelier-settle",
                      }),
                    });
                  }
                });
                litCard = card;
                card.dataset.panelLit = "";
              }
              lights.get(card)?.x(x);
              lights.get(card)?.y(y);
            };
            if (context.conditions.hover) {
              node.addEventListener("pointermove", followLight, {
                passive: true,
              });
              node.addEventListener("pointerleave", dimLight);
            }
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
              const visual = smoother ? smoother.scrollTop() : current;
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
                ? visual + runway.getBoundingClientRect().top
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
                  visual + card.top - offset,
                );
                stops.push(start);

                // A card taller than the reading area gets a continuous reading range.
                const end = visual + card.bottom - innerHeight + 32;
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
              dimLight();
              node.removeEventListener("pointermove", followLight);
              node.removeEventListener("pointerleave", dimLight);
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
  }, [root, route, smoother]);
}
