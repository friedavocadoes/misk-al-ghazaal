"use client";
import { useEffect, type RefObject } from "react";
import { PRODUCT_FRAMES } from "./motion-config";

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
                    const chapter = el.closest<HTMLElement>(
                      "[data-product-chapters] [data-snap-panel]",
                    );
                    if (chapter) {
                      const sculpture = el.closest<HTMLElement>(
                        "[class*='sculptureMagnet']",
                      )!;
                      const depth = el.closest<HTMLElement>("[data-art-pass]")!;
                      // Pass in front of the lettering on arrival, settle behind it at the reading frame,
                      // then lift through the foreground on departure. Only decorative pixels move.
                      const pass = gsap.timeline({
                        scrollTrigger: {
                          trigger: chapter,
                          start: "top bottom",
                          end: "bottom top",
                          scrub: 1,
                        },
                      });
                      pass
                        .set(sculpture, { zIndex: 3 }, 0)
                        .set(sculpture, { zIndex: 0 }, 0.4)
                        .set(sculpture, { zIndex: 3 }, 0.72)
                        .fromTo(
                          depth,
                          {
                            xPercent: -35,
                            yPercent: 18,
                            rotateY: -22,
                            rotateZ: -8,
                            scale: 1.22,
                            opacity: 0.95,
                          },
                          {
                            xPercent: 32,
                            yPercent: -8,
                            rotateY: 12,
                            rotateZ: 4,
                            scale: 0.72,
                            opacity: 0.38,
                            duration: 0.44,
                            ease: "power2.inOut",
                          },
                          0,
                        )
                        .to(
                          depth,
                          {
                            xPercent: 36,
                            yPercent: -10,
                            duration: 0.23,
                            ease: "none",
                          },
                          0.44,
                        )
                        .to(
                          depth,
                          {
                            xPercent: -32,
                            yPercent: -28,
                            rotateY: 28,
                            rotateZ: 12,
                            scale: 1.18,
                            opacity: 0.85,
                            duration: 0.33,
                            ease: "power2.inOut",
                          },
                          0.67,
                        );
                      const current = chapter.querySelector(
                        "[class*='panelCurrent']",
                      );
                      if (current)
                        pass.fromTo(
                          current,
                          { xPercent: -15, rotate: -15 },
                          {
                            xPercent: 15,
                            rotate: 15,
                            duration: 1,
                            ease: "none",
                          },
                          0,
                        );
                      return;
                    }
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
                      '[role="dialog"][data-state="open"],[data-radix-popper-content-wrapper]',
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
                  const product = node.querySelector<HTMLElement>(
                    "[data-product-chapters]",
                  );
                  const desktopProduct = !!product && innerWidth >= 760;
                  const current = value * max;
                  if (desktopProduct) {
                    const runway =
                      node.querySelector<HTMLElement>("[data-runway]")!;
                    const origin = scrollY + runway.getBoundingClientRect().top;
                    const frames = [
                      0,
                      PRODUCT_FRAMES.price,
                      PRODUCT_FRAMES.dock,
                    ].map((frame) => origin + frame * innerHeight);
                    if (current <= frames[2]) {
                      return (
                        frames.reduce((best, next) =>
                          Math.abs(next - current) < Math.abs(best - current)
                            ? next
                            : best,
                        ) / max
                      );
                    }
                    // Long chapters retain free scrolling inside their readable body.
                    for (const panel of product.querySelectorAll<HTMLElement>(
                      "[data-snap-panel]",
                    )) {
                      const r = panel.getBoundingClientRect();
                      const start = scrollY + r.top - offset;
                      const end = scrollY + r.bottom - innerHeight + 120;
                      if (
                        end > start + 100 &&
                        current >= start &&
                        current <= end
                      )
                        return value;
                    }
                    const last =
                      product.lastElementChild?.getBoundingClientRect();
                    if (
                      last &&
                      current > scrollY + last.bottom - innerHeight + 120
                    )
                      return value;
                  }
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
                  const closest = positions.reduce(
                    (best, next) =>
                      Math.abs(next - current) < Math.abs(best - current)
                        ? next
                        : best,
                    Infinity,
                  );
                  return Math.abs(closest - current) <
                    (desktopProduct
                      ? innerHeight * 0.55
                      : Math.min(140, innerHeight * 0.15))
                    ? closest / max
                    : value;
                },
                duration: { min: 0.3, max: 0.85 },
                ease: "power3.inOut",
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
