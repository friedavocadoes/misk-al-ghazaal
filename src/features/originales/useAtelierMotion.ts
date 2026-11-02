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
                    if (heading)
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
            ScrollTrigger.create({
              start: 0,
              end: () => ScrollTrigger.maxScroll(window),
              invalidateOnRefresh: true,
              snap: {
                snapTo: (value) => {
                  if (
                    document.body.hasAttribute("data-originales-photo-focus") ||
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
                  const gallery = node.querySelector<HTMLElement>(
                    "[data-gallery-stage]",
                  );
                  const mobile = innerWidth < 760;
                  let offset = mobile ? 88 : 104;
                  if (gallery && !mobile) {
                    const stage = gallery.getBoundingClientRect();
                    // Final collapsed bottle pose: top36% of stage, half of40vh high.
                    offset = Math.max(
                      176,
                      stage.top + stage.height * 0.36 - innerHeight * 0.2,
                    );
                  } else if (gallery) {
                    offset = 152 + innerHeight * 0.26;
                  } else if (!mobile) {
                    const bottle =
                      node.querySelector<HTMLElement>("[data-bottle]");
                    if (bottle)
                      offset = Math.max(
                        104,
                        bottle.getBoundingClientRect().top,
                      );
                  }
                  const readingBox = (panel: HTMLElement) =>
                    panel.querySelector<HTMLElement>(
                      "[class*=editionCard],[class*=panelContent]",
                    ) ?? panel;
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
                      const r = readingBox(panel).getBoundingClientRect();
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
                          scrollY +
                            readingBox(el).getBoundingClientRect().top -
                            offset,
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
                    (!mobile
                      ? innerHeight * 0.55
                      : Math.min(100, innerHeight * 0.14))
                    ? closest / max
                    : value;
                },
                duration: { min: 0.3, max: 0.85 },
                ease: "atelier-soft",
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
