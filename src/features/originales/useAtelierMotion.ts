"use client";
import { useEffect, type RefObject } from "react";
import { atelierGsap } from "./atelier-gsap";
import { FRAME_PATH, OPEN_FRAME } from "./MorphFrame";
import { PRODUCT_FRAMES } from "./motion-config";

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
            const node = root.current!,
              seen = new WeakSet<Element>(),
              art = new WeakSet<Element>();
            const scan = () =>
              context.add(() => {
                node
                  .querySelectorAll<HTMLElement>(
                    "h1,h2,h3,h4,p,legend,label,a,button,small,span",
                  )
                  .forEach((el) => {
                    if (
                      seen.has(el) ||
                      (context.conditions?.mobile &&
                        el.closest("[data-originales-product]")) ||
                      !el.textContent?.trim() ||
                      el.closest(
                        "svg,[data-static-ink], [aria-hidden=true],[role=alert],.coupon-shake",
                      ) ||
                      (el.tagName === "SPAN" && el.childElementCount)
                    )
                      return;
                    seen.add(el);
                    gsap.fromTo(
                      el,
                      { color: "#878981" },
                      {
                        color: "#f3f0e7",
                        ease: "atelier-soft",
                        scrollTrigger: {
                          trigger: el,
                          start: "top 94%",
                          end: "top 52%",
                          scrub: 0.6,
                        },
                      },
                    );
                  });
                node
                  .querySelectorAll<SVGSVGElement>(
                    '[data-morph-surface="panel"],[data-morph-surface="edition"]',
                  )
                  .forEach((surface) => {
                    if (art.has(surface)) return;
                    art.add(surface);
                    const frame = surface.querySelectorAll(
                      "[data-morph-frame],[data-morph-clip]",
                    );
                    const trace = surface.querySelector("[data-frame-trace]");
                    const section = surface.closest("[data-snap-panel]")!;
                    if (!section.hasAttribute("data-gallery-finale"))
                      gsap.fromTo(
                        frame,
                        { morphSVG: OPEN_FRAME },
                        {
                          morphSVG: FRAME_PATH,
                          ease: "atelier-soft",
                          scrollTrigger: {
                            trigger: section,
                            start: "top 95%",
                            end: "top 30%",
                            scrub: 0.45,
                          },
                        },
                      );
                    gsap.fromTo(
                      trace,
                      { drawSVG: "0% 0%" },
                      {
                        drawSVG: "0% 100%",
                        ease: "atelier-soft",
                        scrollTrigger: {
                          trigger: section,
                          start: "top 85%",
                          end: "top 30%",
                          scrub: 0.35,
                        },
                      },
                    );
                    const heading = section.querySelector("h2");
                    if (
                      heading &&
                      !(
                        context.conditions?.mobile &&
                        section.closest("[data-originales-product]")
                      )
                    )
                      gsap.fromTo(
                        heading,
                        { y: 24, clipPath: "inset(0% 0% 100% 0%)" },
                        {
                          y: 0,
                          clipPath: "inset(0% 0% 0% 0%)",
                          ease: "atelier-settle",
                          scrollTrigger: {
                            trigger: section,
                            start: "top 85%",
                            end: "top 35%",
                            scrub: 0.4,
                          },
                        },
                      );
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
              const imageFrame = runway?.querySelector<HTMLElement>(
                "[class*=photoAperture]",
              );
              const offset = stage
                ? mobile
                  ? 152 + innerHeight * 0.26
                  : Math.max(176, stage.top + 16)
                : mobile
                  ? 88
                  : Math.max(104, imageFrame?.offsetTop ?? 0);

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
                if (!desktopProduct) continue;

                // A card taller than the reading area gets a continuous reading range.
                const end = current + card.bottom - innerHeight + 32;
                if (end > start) {
                  if (current >= start && current <= end) return;
                  stops.push(end);
                }
              }
              if (desktopProduct && current > Math.max(...stops) + 24) return;

              const ordered = stops
                .map((stop) => gsap.utils.clamp(0, max, stop))
                .sort((a, b) => a - b);
              const upperIndex = ordered.findIndex((stop) => stop >= current);
              if (
                upperIndex <= 0 ||
                Math.abs(ordered[upperIndex] - current) < 2
              )
                return;

              const lower = ordered[upperIndex - 1];
              const upper = ordered[upperIndex];
              const target = direction > 0 ? upper : lower;
              const distance = Math.abs(target - current);
              const progress = 1 - distance / (upper - lower);
              if (
                distance < 2 ||
                progress < 0.4 ||
                distance > innerHeight * (mobile ? 0.2 : 0.7)
              )
                return;

              const position = { y: current };
              settleTween = gsap.to(position, {
                y: target,
                duration: gsap.utils.clamp(0.42, 0.85, distance / 900),
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
