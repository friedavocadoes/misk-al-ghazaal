"use client";
import { useEffect, type RefObject } from "react";

/** Shared lighting, decorative parallax and proximity-only section settling. Native scroll stays in control. */
export function useAtelierMotion(
  root: RefObject<HTMLDivElement | null>,
  route: string,
) {
  useEffect(() => {
    let live = true,
      dispose = () => {};
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ default: gsap }, { ScrollTrigger }]) => {
        if (!live || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add(
          "(prefers-reduced-motion: no-preference)",
          (context) => {
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
                      !el.textContent?.trim() ||
              el.closest("svg,[data-static-ink], [aria-hidden=true],[role=alert],.coupon-shake") ||
                      (el.tagName === "SPAN" && el.childElementCount)
                    )
                      return;
                    seen.add(el);
                    gsap.fromTo(
                      el,
                      { color: "#878981" },
                      {
                        color: "#f3f0e7",
                        ease: "none",
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
                  .querySelectorAll<HTMLElement>("[data-parallax]")
                  .forEach((el) => {
                    if (art.has(el)) return;
                    art.add(el);
                    gsap.fromTo(
                      el,
                      { yPercent: 9 },
                      {
                        yPercent: -9,
                        ease: "none",
                        scrollTrigger: {
                          trigger: el.closest("[data-snap-panel]") ?? el,
                          start: "top bottom",
                          end: "bottom top",
                          scrub: 1.3,
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
            ScrollTrigger.create({
              start: 0,
              end: () => ScrollTrigger.maxScroll(window),
              invalidateOnRefresh: true,
              snap: {
                snapTo: (value) => {
                  if (
                    document.querySelector(
                      '[role="dialog"][data-state="open"]',
                    ) ||
                    document.activeElement?.closest(
                      "input,textarea,select,[contenteditable=true]",
                    )
                  )
                    return value;
                  const max = ScrollTrigger.maxScroll(window);
                  if (max <= 0) return value;
                  const offset = node.querySelector("[data-originales-nav]")
                    ? innerWidth < 760
                      ? 152
                      : 176
                    : innerWidth < 760
                      ? 88
                      : 104;
                  const positions = [
                    ...node.querySelectorAll<HTMLElement>("[data-snap-panel]"),
                  ]
                    .filter((el) => el.offsetHeight > 0)
                    .map((el) =>
                      Math.max(
                        0,
                        Math.min(
                          max,
                          scrollY + el.getBoundingClientRect().top - offset,
                        ),
                      ),
                    );
                  const current = value * max,
                    closest = positions.reduce(
                      (best, next) =>
                        Math.abs(next - current) < Math.abs(best - current)
                          ? next
                          : best,
                      Infinity,
                    );
                  return Math.abs(closest - current) <
                    Math.min(140, innerHeight * 0.15)
                    ? closest / max
                    : value;
                },
                duration: { min: 0.18, max: 0.5 },
                delay: 0.25,
                inertia: false,
              },
            });
            return () => {
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
