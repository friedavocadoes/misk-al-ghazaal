"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import { defaultVariant, productAvailable } from "@/lib/product-options";
import { formatAED } from "@/lib/utils";
import { flyToBag } from "@/lib/fly-to-bag";
import type { Product } from "@/lib/types";
import { tx } from "@/lib/i18n";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { NoteTooltip } from "@/components/product/NoteTooltip";
import { editionFor, originalesPath } from "./config";
import { COLLECTION_STORY, editionStory } from "./story";
import { AtelierBagButton } from "./AtelierControls";
import { CollectionGlass } from "./CollectionGlass";
import { useAtelierScroll } from "./atelier-scroll";
import { MorphFrame } from "./MorphFrame";
import { FinaleDecor } from "./FinaleDecor";
import { atelierGsap } from "./atelier-gsap";
import { AtelierPanel } from "./AtelierPanel";
import s from "./atelier.module.css";

function GalleryPurchase({ product, ar }: { product: Product; ar: boolean }) {
  const { add } = useCart(),
    [addedProduct, setAddedProduct] = useState<string | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    edition = editionFor(product),
    variant = defaultVariant(product);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div
      data-static-ink
      className={s.galleryPurchase}
      style={{ "--edition-wash": edition.wash } as CSSProperties}
    >
      <Link href={originalesPath(product)} className={s.galleryIdentity}>
        <h2>{edition.name}</h2>
        <p className={s.galleryPrice}>
          {formatAED(variant?.price ?? product.price)}
        </p>
      </Link>
      <AtelierBagButton
        added={addedProduct === product.id}
        disabled={!productAvailable(product)}
        ar={ar}
        onClick={(event) => {
          add(
            { productSlug: product.slug, variantId: variant?.id, qty: 1 },
            "flight",
          );
          flyToBag(event.currentTarget, edition.bottle ?? product.images[0]);
          setAddedProduct(product.id);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setAddedProduct(null), 2100);
        }}
      />
    </div>
  );
}
export function OriginalesGallery({
  products,
  locale,
}: {
  products: Product[];
  locale: string;
}) {
  const ar = locale === "ar",
    root = useRef<HTMLDivElement>(null),
    [active, setActive] = useState(0),
    [collapsed, setCollapsed] = useState(false),
    [navVisible, setNavVisible] = useState(false);
  const current = useRef(0),
    progress = useRef(0),
    collapsedRef = useRef(false);
  const smoother = useAtelierScroll();
  useEffect(() => {
    if (smoother === null) return;
    let live = true,
      dispose = () => {};
    Promise.all([atelierGsap(), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (!live || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        let restoredMobileAnchor = false;
        mm.add(
          {
            motion: "(prefers-reduced-motion:no-preference)",
            mobile: "(max-width:759px)",
            desktop: "(min-width:760px)",
          },
          (context) => {
            const node = root.current!,
              mobile = !!context.conditions?.mobile,
              motion = !!context.conditions?.motion,
              figures = [
                ...node.querySelectorAll<HTMLElement>("[data-gallery-bottle]"),
              ],
              captions = node.querySelectorAll<HTMLElement>(
                "[data-bottle-caption]",
              );
            const chapters = [
              ...node.querySelectorAll<HTMLElement>("[data-edition-chapter]"),
            ];
            const stage = node.querySelector<HTMLElement>(
              "[data-gallery-stage]",
            )!;
            const masthead = node.querySelector<HTMLElement>(
              "[data-collection-masthead]",
            )!;
            const chrome = node.closest("[class*=collectionWorld]");
            const dock = chrome?.querySelector<HTMLElement>(
              "[data-collection-title-dock]",
            );
            const backdrop = chrome?.querySelector(
              "[data-collection-header-backdrop]",
            );
            if (motion) {
              const glass = node.querySelector("[data-collection-glass]");
              const reflections = node.querySelectorAll(
                "[data-gallery-reflection]",
              );
              gsap
                .timeline({
                  defaults: { ease: "atelier-soft" },
                  scrollTrigger: {
                    start: 0,
                    end: () => innerHeight * (mobile ? 0.4 : 0.55),
                    scrub: 0.32,
                    onUpdate: ({ progress }) => {
                      const dimmed = progress >= 0.18;
                      if (node.hasAttribute("data-glass-dimmed") !== dimmed)
                        node.toggleAttribute("data-glass-dimmed", dimmed);
                    },
                  },
                })
                .to(glass, { opacity: 0, duration: 1 }, 0)
                .to(reflections, { opacity: 0, duration: 0.78 }, 0);
            }
            if (motion && dock && backdrop) {
              const titleFlight = gsap.timeline({
                scrollTrigger: {
                  start: 0,
                  end: () => innerHeight * 0.43,
                  scrub: smoother ? 0.22 : 0.38,
                  invalidateOnRefresh: true,
                },
              });
              titleFlight.fromTo(
                masthead,
                { x: 0, y: 0, scale: 1 },
                {
                  x: () => {
                    const destination = dock.getBoundingClientRect();
                    return (
                      destination.left + destination.width / 2 - innerWidth / 2
                    );
                  },
                  y: () =>
                    dock.getBoundingClientRect().top +
                    dock.offsetHeight / 2 -
                    (masthead.offsetTop + masthead.offsetHeight / 2),
                  scale: () => dock.offsetWidth / masthead.offsetWidth,
                  duration: 1,
                  ease: "atelier-soft",
                },
                0,
              );
              // Lift the mark over the navbar once it has cleared the bottles.
              titleFlight.to(
                masthead.querySelector("[data-gallery-seal]"),
                { opacity: 0, duration: 0.36 },
                0,
              );
              titleFlight.set(masthead, { zIndex: 44 }, 0.74);
              titleFlight.to(masthead, { autoAlpha: 0, duration: 0.12 }, 0.88);
              titleFlight.fromTo(
                dock,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.12 },
                0.88,
              );
              // The backdrop follows the type. Reversing scroll clears the
              // glass first, so the travelling title stays readable both ways.
              titleFlight.set(
                node,
                { attr: { "data-title-docked": "true" } },
                1,
              );
              titleFlight.fromTo(
                backdrop,
                { opacity: 0 },
                { opacity: 1, duration: 0.2 },
                1,
              );
              void document.fonts.ready.then(() => {
                if (live) ScrollTrigger.refresh();
              });
            }
            if (mobile && motion && chapters.length) {
              node.dataset.mobileExhibit = "true";
              const finale = node.querySelector<HTMLElement>(
                "[data-gallery-finale]",
              )!;
              const clamp = gsap.utils.clamp(0, 1);
              const ease = gsap.parseEase("atelier-soft");
              const setters = figures.map((figure) => ({
                x: gsap.quickSetter(figure, "x", "px"),
                y: gsap.quickSetter(figure, "y", "px"),
                scale: gsap.quickSetter(figure, "scale"),
                opacity: gsap.quickSetter(figure, "opacity"),
                visible: true,
              }));
              const captionOpacity = gsap.quickSetter(captions, "opacity");
              const stageOpacity = gsap.quickSetter(stage, "opacity");
              const playhead = { progress: 0 };
              let openingEnd = 1;
              let readingStops: number[] = [];
              let closingStart = 0;
              let travel = 0;
              let handoffDistance = 0;
              let flight: { x: number; y: number }[] = [];

              const measureMobile = () => {
                const stageTop = parseFloat(getComputedStyle(stage).top);
                const stageBottom = stageTop + stage.offsetHeight;
                readingStops = chapters.map(
                  (chapter) =>
                    chapter.getBoundingClientRect().top +
                    scrollY -
                    stageBottom -
                    12,
                );
                openingEnd = Math.max(1, readingStops[0] - 42);
                closingStart =
                  finale.getBoundingClientRect().top + scrollY - stageBottom;
                travel = Math.min(24, stage.offsetHeight * 0.08);
                handoffDistance = Math.max(180, innerHeight * 0.32);
                flight = figures.map((figure) => ({
                  x: stage.clientWidth / 2 - figure.offsetLeft,
                  y: stage.offsetHeight * 0.55 - figure.offsetTop,
                }));
              };
              gsap.set(figures, { xPercent: -50, yPercent: -50 });
              measureMobile();
              let shown = -1;
              let railShown = false;
              const render = (scroll: number) => {
                const opening = clamp(scroll / openingEnd);
                const focus = ease(opening);
                const closing = ease(
                  clamp((scroll - closingStart) / handoffDistance),
                );
                let chapter = 0;
                // Begin the handoff as the next story approaches the reading line.
                let handoff = 0;
                while (chapter + 1 < readingStops.length) {
                  const next = clamp(
                    1 + (scroll - readingStops[chapter + 1]) / handoffDistance,
                  );
                  if (next < 1) {
                    handoff = ease(next);
                    break;
                  }
                  chapter++;
                }
                const selected = chapter + (handoff >= 0.5 ? 1 : 0);
                if (selected !== shown) {
                  shown = selected;
                  setActive(selected);
                }
                const showRail = opening >= 0.76;
                if (showRail !== railShown) {
                  railShown = showRail;
                  setNavVisible(showRail);
                  node.dataset.mobileFeatured = String(showRail);
                }
                figures.forEach((figure, index) => {
                  let alpha: number;
                  let slide = 0;
                  if (opening < 1) {
                    alpha = index === 0 ? 1 : 1 - ease(clamp(opening / 0.68));
                  } else if (index === chapter) {
                    alpha = (1 - handoff) * (1 - closing);
                    slide = -(handoff + closing) * travel;
                  } else if (index === chapter + 1) {
                    alpha = handoff;
                    slide = (1 - handoff) * travel;
                  } else {
                    alpha = 0;
                  }
                  const setter = setters[index];
                  if (!setter.visible && alpha === 0) return;
                  setter.visible = alpha > 0;
                  const { x, y } = flight[index];
                  setter.x(x * focus);
                  setter.y(y * focus + slide);
                  setter.scale(1 + focus * 0.42);
                  setter.opacity(alpha);
                  const inert = alpha < 0.5;
                  if (figure.inert !== inert) figure.inert = inert;
                });
                captionOpacity(1 - clamp(opening * 2.7));
                stageOpacity(1 - closing);
                stage.inert = closing > 0.5;
              };
              const scroll = gsap.to(playhead, {
                progress: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: stage,
                  start: 0,
                  end: () =>
                    Math.max(openingEnd + 1, closingStart + handoffDistance),
                  scrub: 0.24,
                  onRefreshInit: measureMobile,
                  onRefresh: () => {
                    render(window.scrollY);
                  },
                },
                onUpdate: () =>
                  render(playhead.progress * (closingStart + handoffDistance)),
              });
              node.dataset.galleryReady = "true";
              scroll.scrollTrigger?.refresh();
              if (!restoredMobileAnchor) {
                restoredMobileAnchor = true;
                // The streamed page may mount after the browser's first hash lookup.
                const anchor = chapters
                  .map((chapter) => chapter.firstElementChild)
                  .find((plate) => plate && `#${plate.id}` === location.hash);
                anchor?.scrollIntoView({ behavior: "instant", block: "start" });
              }
              return () => {
                delete node.dataset.mobileExhibit;
                delete node.dataset.mobileFeatured;
                delete node.dataset.galleryReady;
                stage.inert = false;
                stage.style.removeProperty("opacity");
                gsap.set(figures, { clearProps: "opacity,transform" });
                gsap.set(captions, { clearProps: "opacity" });
                figures.forEach((figure) => {
                  figure.inert = false;
                });
                setNavVisible(false);
              };
            }
            if (chapters.length)
              ScrollTrigger.create({
                trigger: chapters[0],
                start: "top 75%",
                end: "max",
                onUpdate: (self) => setNavVisible(self.progress > 0),
                onRefresh: (self) => setNavVisible(self.progress > 0),
              });
            let bounds: { top: number; bottom: number }[] = [];
            let poses: { x: number; y: number; scale: number }[] = [];
            const visualScroll = () =>
              smoother ? smoother.scrollTop() : window.scrollY;
            const measure = () => {
              const scroll = visualScroll();
              bounds = chapters.map((chapter) => {
                const rect = chapter.getBoundingClientRect();
                return { top: rect.top + scroll, bottom: rect.bottom + scroll };
              });
              if (!mobile) {
                const purchase = stage.querySelector<HTMLElement>(
                  "[data-gallery-purchase]",
                );
                // Reserve the real identity/control height, including the small
                // incoming drift. Asset aspect ratios must not push bottles into it.
                const drift = motion ? Math.min(36, innerHeight * 0.04) : 0;
                const availableHeight =
                  (purchase?.offsetTop ?? stage.clientHeight) - 16 - 24 - drift;
                poses = figures.map((figure) => {
                  const bottle = figure.querySelector<HTMLImageElement>(
                    "[data-chapter-bottle]",
                  );
                  const aspect = bottle?.naturalHeight
                    ? bottle.naturalWidth / bottle.naturalHeight
                    : 0.65;
                  const plane = bottle?.parentElement;
                  const planeHeight =
                    plane?.offsetHeight ?? figure.offsetHeight * 0.88;
                  const openingHeight = Math.min(
                    planeHeight,
                    figure.offsetWidth / aspect,
                  );
                  const focusHeight = Math.min(
                    innerHeight * 0.62 * 0.88,
                    (stage.clientWidth * 0.43) / aspect,
                    Math.max(1, availableHeight),
                  );
                  const scale = openingHeight ? focusHeight / openingHeight : 1;
                  // object-contain is bottom-aligned. Remove its upper letterbox
                  // space from the destination, preserving the original image node.
                  const letterbox = Math.max(
                    0,
                    planeHeight * scale - focusHeight,
                  );
                  return {
                    x: stage.clientWidth * 0.25 - figure.offsetLeft,
                    y:
                      16 +
                      (figure.offsetHeight * scale) / 2 -
                      figure.offsetTop -
                      letterbox,
                    scale,
                  };
                });
              }
            };
            const setCaption = gsap.quickSetter(captions, "opacity");
            const clamp = gsap.utils.clamp(0, 1);
            const ease = gsap.parseEase("atelier-soft");
            let frame = 0;
            let captionOpacity = -1;
            const sync = () => {
              if (mobile) return;
              const scroll = visualScroll();
              const height = innerHeight;
              const opening = progress.current;
              const focus = ease(opening);
              const chapterMotion = ease(clamp((opening - 0.82) / 0.18));
              figures.forEach((figure, index) => {
                const rect = bounds[index];
                if (!rect) return;
                const entered =
                  index === 0
                    ? 1
                    : ease(
                        clamp(
                          0.5 +
                            (scroll - (rect.top - height * 0.55)) /
                              (height * 0.48),
                        ),
                      );
                const nextChapter = bounds[index + 1];
                const left = nextChapter
                  ? ease(
                      clamp(
                        0.5 +
                          (scroll - (nextChapter.top - height * 0.55)) /
                            (height * 0.48),
                      ),
                    )
                  : 0;
                const openingAlpha =
                  index === current.current
                    ? 1
                    : 1 - Math.min(1, opening * 2.5);
                const alpha =
                  !motion && opening > 0
                    ? Number(index === current.current)
                    : gsap.utils.interpolate(
                        openingAlpha,
                        entered * (1 - left),
                        chapterMotion,
                      );
                const pose = poses[index];
                if (pose && (alpha > 0 || figure.style.opacity !== "0")) {
                  const y =
                    pose.y * focus +
                    (1 - entered - left) *
                      (motion ? Math.min(36, height * 0.04) : 0) *
                      chapterMotion;
                  const scale = 1 + (pose.scale - 1) * focus;
                  figure.style.transform = `translate(-50%, -50%) translate3d(${pose.x * focus}px, ${y}px, 0) scale(${scale})`;
                }
                const opacity = String(alpha);
                if (figure.style.opacity !== opacity)
                  figure.style.opacity = opacity;
                const inert = opening > 0.6 && alpha < 0.1;
                if (figure.inert !== inert) figure.inert = inert;
              });
              const nextCaptionOpacity = 1 - Math.min(1, opening * 2.5);
              if (captionOpacity !== nextCaptionOpacity) {
                captionOpacity = nextCaptionOpacity;
                setCaption(captionOpacity);
              }
              const next = opening > 0.55;
              if (next !== collapsedRef.current) {
                collapsedRef.current = next;
                setCollapsed(next);
              }
            };
            const scheduleSync = () => {
              if (frame) return;
              frame = requestAnimationFrame(() => {
                frame = 0;
                sync();
              });
            };
            const choose = (index: number) => {
              current.current = index;
              setActive(index);
              scheduleSync();
            };
            gsap.set(figures, {
              left: (index) =>
                mobile
                  ? (index % 2 ? 75 : 25) + "%"
                  : figures[index].style.getPropertyValue("--start-left"),
              top: (index) => (mobile ? (index < 2 ? 24 : 69) + "%" : "44%"),
              width: mobile ? "43%" : "22%",
              height: mobile ? "34svh" : "55svh",
            });
            measure();
            if (!mobile && motion) {
              const playhead = { progress: 0 };
              gsap.to(playhead, {
                progress: 1,
                ease: "none",
                onUpdate: () => {
                  progress.current = playhead.progress;
                  scheduleSync();
                },
                scrollTrigger: {
                  trigger: node.querySelector("[data-gallery-sequence]"),
                  start: "top top+=175",
                  end: () => `+=${innerHeight * 0.65}`,
                  scrub: smoother ? 0.26 : 0.52,
                },
              });
            } else if (!mobile) {
              ScrollTrigger.create({
                trigger: node.querySelector("[data-gallery-sequence]"),
                start: () => `top top+=${mobile ? 150 : 175}`,
                end: () => `+=${innerHeight * 0.65}`,
                onUpdate: (self) => {
                  const next = self.progress > 0.12 ? 1 : 0;
                  if (progress.current === next) return;
                  progress.current = next;
                  sync();
                },
              });
            }
            node
              .querySelectorAll<HTMLElement>("[data-edition-chapter]")
              .forEach((chapter, index) =>
                ScrollTrigger.create({
                  trigger: chapter,
                  start: mobile ? "top 65%" : "top 55%",
                  end: mobile ? "bottom 65%" : "bottom 55%",
                  onEnter: () => choose(index),
                  onEnterBack: () => choose(index),
                }),
              );
            ScrollTrigger.create({
              trigger: node.querySelector("[data-gallery-sequence]"),
              start: "top bottom",
              end: "bottom top",
              onUpdate: scheduleSync,
              onRefresh: () => {
                measure();
                sync();
              },
            });
            const finale = node.querySelector<HTMLElement>(
              "[data-gallery-finale]",
            )!;
            const finaleContent = finale.querySelector<HTMLElement>(
              "[class*=panelContent]",
            )!;
            if (!mobile && motion) {
              const finish = gsap.timeline({
                scrollTrigger: {
                  trigger: finale,
                  start: "top bottom",
                  end: "top 22%",
                  scrub: 0.7,
                  onUpdate: (self) => {
                    stage.inert = self.progress > 0.5;
                  },
                },
              });
              finish
                .to(
                  stage,
                  {
                    "--gallery-exit": () => `${-innerHeight * 0.8}px`,
                    opacity: 0,
                    duration: 1,
                    ease: "atelier-soft",
                  },
                  0,
                )
                .fromTo(
                  finaleContent,
                  {
                    width: mobile ? "100%" : "46%",
                    marginLeft: mobile ? "0%" : "54%",
                  },
                  {
                    width: "100%",
                    marginLeft: "0%",
                    duration: 1,
                    ease: "atelier-soft",
                  },
                  0,
                )
                .to(
                  finaleContent.querySelectorAll(
                    "[data-morph-frame],[data-frame-trace],[data-morph-clip]",
                  ),
                  {
                    morphSVG: "M4 2H996L998 4V596L996 598H4L2 596V4Z",
                    duration: 1,
                    ease: "atelier-soft",
                  },
                  0,
                );
            } else if (!mobile) {
              ScrollTrigger.create({
                trigger: finale,
                start: "top 70%",
                onEnter: () => {
                  gsap.set(stage, { autoAlpha: 0 });
                  stage.inert = true;
                },
                onLeaveBack: () => {
                  gsap.set(stage, { autoAlpha: 1 });
                  stage.inert = false;
                },
              });
            }
            node.dataset.galleryReady = "true";
            sync();
            ScrollTrigger.refresh();
            return () => {
              cancelAnimationFrame(frame);
              delete node.dataset.galleryReady;
              stage.inert = false;
              figures.forEach((figure) => {
                figure.inert = false;
                figure.style.removeProperty("transform");
                figure.style.removeProperty("opacity");
              });
              captions.forEach((caption) =>
                caption.style.removeProperty("opacity"),
              );
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
  }, [products.length, smoother]);
  const featured = products[active] ?? products[0],
    story = COLLECTION_STORY[ar ? "ar" : "en"];
  return (
    <div
      id="originales-top"
      ref={root}
      className={s.gallery}
      data-originales-collection
      data-originales-route="/originales"
      data-originales-ready="true"
      data-collapsed={collapsed}
    >
      <CollectionGlass />
      <div className={s.openingExposure} aria-hidden="true" />
      <nav
        data-originales-nav
        data-visible={navVisible}
        inert={!navVisible}
        className={s.silhouetteNav}
        aria-label={ar ? "عطور أوريجينال" : "Originales fragrances"}
      >
        {products.map((product, index) => {
          const edition = editionFor(product);
          return (
            <a
              key={product.id}
              href={`#edition-${product.slug}`}
              data-active={index === active}
              aria-current={index === active ? "location" : undefined}
              aria-label={`${edition.name}${index === active ? (ar ? "، العطر المعروض" : " — currently featured") : ""}`}
              style={
                {
                  "--bottle-tone":
                    (
                      {
                        ambrato: "#c69b5d",
                        sultanic: "#709e83",
                        lustra: "#bf8096",
                        lazvaro: "#76a5c8",
                      } as Record<string, string>
                    )[edition.name.toLowerCase()] ?? edition.accent,
                } as CSSProperties
              }
            >
              <span className={s.silhouette} aria-hidden="true" />
              <span>{edition.name}</span>
            </a>
          );
        })}
      </nav>
      <header className={s.galleryIntro}>
        <div data-atelier-masthead-layer className={s.mastheadLayer}>
          <h1 data-collection-masthead data-static-ink>
            <a href="#originales-top">Originales</a>
          </h1>
        </div>
        <a
          href={products[0] ? `#edition-${products[0].slug}` : "#the-editions"}
          className={s.galleryScroll}
        >
          <span>
            {ar
              ? "أربعة تعابير. اختر عالمك."
              : "Four expressions. Find your own."}
          </span>
          <svg
            className={s.scrollMark}
            width="16"
            height="25"
            viewBox="0 0 16 25"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 2v16m-4-4 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </header>
      <section data-gallery-sequence className={s.gallerySequence}>
        <div
          data-gallery-stage
          className={s.galleryStage}
          style={
            {
              "--featured-accent": featured
                ? editionFor(featured).accent
                : "transparent",
            } as CSSProperties
          }
        >
          <div className={s.stageHalo} />
          {products.map((product, index) => {
            const edition = editionFor(product);
            const bottle = edition.bottle ?? product.images[0] ?? "/logo.webp";
            const sizes = "(max-width:759px) 50vw, 30vw";
            return (
              <figure
                data-gallery-bottle
                key={product.id}
                className={s.galleryBottle}
                style={
                  {
                    "--start-left": `${7 + ((index + 0.5) * 86) / products.length}%`,
                    "--mobile-left": `${index % 2 ? 75 : 25}%`,
                    "--mobile-row": index < 2 ? 0.24 : 0.69,
                    "--reflection-seam": edition.reflectionSeam,
                  } as CSSProperties
                }
              >
                <Link href={originalesPath(product)}>
                  <span className={s.galleryBottlePlane}>
                    <Image
                      data-chapter-bottle
                      src={bottle}
                      alt={edition.name}
                      width={650}
                      height={1000}
                      priority
                      sizes={sizes}
                      className={s.sequenceBottle}
                    />
                    {edition.bottle && (
                      <span
                        data-gallery-reflection
                        className={s.galleryReflection}
                        aria-hidden="true"
                      >
                        <Image
                          src={bottle}
                          alt=""
                          width={650}
                          height={1000}
                          sizes={sizes}
                        />
                      </span>
                    )}
                  </span>
                  <figcaption data-bottle-caption>
                    <span>{edition.name}</span>
                    <small>{formatAED(product.price)}</small>
                  </figcaption>
                </Link>
              </figure>
            );
          })}
          {featured && (
            <div
              data-gallery-purchase
              className={s.stickyPurchase}
              data-visible={collapsed}
            >
              <GalleryPurchase product={featured} ar={ar} />
            </div>
          )}
        </div>
        <div id="the-editions" className={s.sequenceStories}>
          {products.map((product, index) => {
            const edition = editionFor(product),
              copy = editionStory(edition.name, ar);
            return (
              <section
                key={product.id}
                data-edition-chapter
                data-snap-panel
                data-featured={active === index}
                className={s.sequenceChapter}
                style={
                  {
                    "--edition-accent": edition.accent,
                    "--edition-wash": edition.wash,
                    "--studio-card": edition.ink,
                    "--studio-card-light": `color-mix(in srgb, ${edition.ink} 74%, ${edition.accent})`,
                  } as CSSProperties
                }
              >
                <div id={`edition-${product.slug}`} className={s.editionPlate}>
                  <div className={s.mobileChapterProduct}>
                    <Link href={originalesPath(product)}>
                      <Image
                        src={
                          edition.bottle ?? product.images[0] ?? "/logo.webp"
                        }
                        alt={edition.name}
                        width={360}
                        height={470}
                        sizes="60vw"
                      />
                    </Link>
                    <GalleryPurchase product={product} ar={ar} />
                  </div>
                  <div data-atelier-surface className={s.editionCard}>
                    <MorphFrame kind="edition" />
                    <p className={s.kicker}>
                      THE EXPRESSION / {edition.number}
                    </p>
                    <h2>{copy?.heading ?? edition.name}</h2>
                    {copy && <p className={s.chapterProse}>{copy.body}</p>}
                    {product.notes.length > 0 && (
                      <div className={s.chapterNotes}>
                        <h3>{ar ? "التوليفة" : "The composition"}</h3>
                        <div>
                          {product.notes.map((note) => (
                            <NoteTooltip
                              key={`${note.id}-${note.kind}`}
                              note={note}
                              tint={edition.accent}
                              locale={ar ? "ar" : "en"}
                              className={s.galleryNote}
                            >
                              <NoteGlyph
                                glyph={note.glyph}
                                className={s.galleryNoteGlyph}
                              />
                              <span>
                                {tx(note.name, note.nameAr, ar ? "ar" : "en")}
                              </span>
                            </NoteTooltip>
                          ))}
                        </div>
                      </div>
                    )}
                    <Link
                      href={originalesPath(product)}
                      className={s.editionCardLink}
                      aria-label={
                        ar ? `اكتشف ${edition.name}` : `Explore ${edition.name}`
                      }
                    >
                      <ArrowUpRight size={21} />
                    </Link>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <AtelierPanel art="orbit" finale className={s.galleryFinale}>
          <div className={s.panelCopy}>
            <p className={s.kicker}>THE ORIGINALES PHILOSOPHY</p>
            <h2>{story.lead}</h2>
            <p>{story.body}</p>
            <p>{story.close}</p>
          </div>
          <FinaleDecor />
        </AtelierPanel>
      </section>
      {!products.length && (
        <p className={s.empty}>
          {ar
            ? "المجموعة قادمة قريباً."
            : "The collection is being prepared. Return soon."}
        </p>
      )}
    </div>
  );
}
