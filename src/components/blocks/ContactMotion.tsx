"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function ContactMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    let dispose = () => {};
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (!alive || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const scope = root.current;
        const mm = gsap.matchMedia();
        mm.add(
          "(prefers-reduced-motion: no-preference)",
          () => {
            const seen = new WeakSet<Element>();
            const context = gsap.context(() => {}, scope);
            const setup = () =>
              context.add(() => {
                scope
                  .querySelectorAll<HTMLElement>("[data-contact-reveal]")
                  .forEach((element) => {
                    if (seen.has(element)) return;
                    seen.add(element);
                    if (
                      element.getBoundingClientRect().top <
                      innerHeight * 0.88
                    )
                      return;
                    gsap.fromTo(
                      element,
                      {
                        y: 40,
                        opacity: 0,
                        rotationX: 4,
                        transformPerspective: 1200,
                      },
                      {
                        y: 0,
                        opacity: 1,
                        rotationX: 0,
                        duration: 1.05,
                        ease: "power3.out",
                        clearProps: "transform,opacity",
                        scrollTrigger: {
                          trigger: element,
                          start: "top 91%",
                          once: true,
                        },
                      },
                    );
                  });
                if (
                  matchMedia("(min-width: 960px) and (pointer: fine)").matches
                )
                  scope
                    .querySelectorAll<HTMLElement>("[data-contact-float]")
                    .forEach((element) => {
                      if (seen.has(element)) return;
                      seen.add(element);
                      gsap.fromTo(
                        element,
                        { y: 22, rotation: -2 },
                        {
                          y: -28,
                          rotation: 2,
                          ease: "none",
                          scrollTrigger: {
                            trigger: element.parentElement,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: 1.1,
                          },
                        },
                      );
                    });
              });
            setup();
            const observer = new MutationObserver(() => setup());
            observer.observe(scope, { childList: true, subtree: true });
            const resize = new ResizeObserver(() => ScrollTrigger.refresh());
            resize.observe(scope);
            return () => {
              observer.disconnect();
              resize.disconnect();
              context.revert();
            };
          },
          scope,
        );
        dispose = () => mm.revert();
      })
      .catch(() => {
        /* Server-rendered content stays visible without animation. */
      });
    return () => {
      alive = false;
      dispose();
    };
  }, []);
  return (
    <div ref={root} className="contact-content contact-content-studio">
      {children}
    </div>
  );
}
