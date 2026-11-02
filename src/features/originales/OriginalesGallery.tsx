"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
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
import { EditionEmblem } from "./EditionEmblem";
import { SculptureScene } from "./SculptureScene";
import { MorphFrame } from "./MorphFrame";
import { FinaleDecor } from "./FinaleDecor";
import { atelierGsap } from "./atelier-gsap";
import { AtelierPanel } from "./AtelierPanel";
import s from "./atelier.module.css";

function GalleryPurchase({ product, ar }: { product: Product; ar: boolean }) {
  const { add } = useCart(),
    [added, setAdded] = useState(false),
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
    <div className={s.galleryPurchase}>
      <div>
        <p className={s.kicker}>ORIGINALES / {edition.number}</p>
        <h2>{edition.name}</h2>
        <p className={s.galleryPrice}>
          {formatAED(variant?.price ?? product.price)}
        </p>
      </div>
      <AtelierBagButton
        added={added}
        disabled={!productAvailable(product)}
        ar={ar}
        onClick={(event) => {
          add(
            { productSlug: product.slug, variantId: variant?.id, qty: 1 },
            "flight",
          );
          flyToBag(event.currentTarget, edition.bottle ?? product.images[0]);
          setAdded(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setAdded(false), 2100);
        }}
      />
      <Link className={s.textLink} href={originalesPath(product)}>
        {ar ? "التجربة كاملة" : "Enter the full experience"}
        <ArrowUpRight size={14} />
      </Link>
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
    [collapsed, setCollapsed] = useState(false);
  const current = useRef(0),
    progress = useRef(0),
    collapsedRef = useRef(false);
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
              captions = node.querySelectorAll("[data-bottle-caption]");
            const chapters = [
              ...node.querySelectorAll<HTMLElement>("[data-edition-chapter]"),
            ];
            const stage = node.querySelector<HTMLElement>(
              "[data-gallery-stage]",
            )!;
            const sync = () => {
              const rects = chapters.map((chapter) =>
                chapter.getBoundingClientRect(),
              );
              const clamp = gsap.utils.clamp(0, 1);
              figures.forEach((figure, index) => {
                const rect = rects[index];
                const entered =
                  index === 0
                    ? 1
                    : clamp(
                        (innerHeight * 0.85 - rect.top) / (innerHeight * 0.3),
                      );
                const left = clamp(
                  (innerHeight * 0.85 - rect.bottom) / (innerHeight * 0.3),
                );
                const alpha =
                  progress.current < 0.99
                    ? index === current.current
                      ? 1
                      : 1 - Math.min(1, progress.current * 2.5)
                    : entered * (1 - left);
                gsap.set(figure, {
                  opacity: alpha,
                  y:
                    progress.current < 0.99 || !motion
                      ? 0
                      : (1 - entered - left) * innerHeight * 0.35,
                });
                figure.inert = progress.current > 0.6 && alpha < 0.1;
              });
              gsap.set(captions, {
                opacity: 1 - Math.min(1, progress.current * 2.5),
              });
              const next = progress.current > 0.55;
              if (next !== collapsedRef.current) {
                collapsedRef.current = next;
                setCollapsed(next);
              }
            };
            const choose = (index: number) => {
              current.current = index;
              setActive(index);
              sync();
            };
            gsap.set(figures, {
              xPercent: -50,
              yPercent: -50,
              x: 0,
              y: 0,
              left: (index) =>
                mobile ? (index % 2 ? 75 : 25) + "%" : (index + 0.5) * 25 + "%",
              top: (index) => (mobile ? (index < 2 ? 24 : 69) + "%" : "44%"),
              width: mobile ? "43%" : "22%",
              height: mobile ? "34svh" : "61svh",
            });
            if (motion) {
              const collapse = gsap.timeline({
                scrollTrigger: {
                  trigger: node.querySelector("[data-gallery-sequence]"),
                  start: () => `top top+=${mobile ? 150 : 175}`,
                  end: () => `+=${innerHeight * 0.65}`,
                  scrub: 1,
                  onUpdate: (self) => {
                    progress.current = self.progress;
                    sync();
                  },
                },
              });
              collapse.to(figures, {
                left: mobile ? "50%" : "25%",
                top: mobile ? "18%" : "36%",
                width: mobile ? "50%" : "34%",
                height: mobile ? "26svh" : "40svh",
                duration: 1,
                ease: "power2.inOut",
              });
            } else {
              ScrollTrigger.create({
                trigger: node.querySelector("[data-gallery-sequence]"),
                start: () => `top top+=${mobile ? 150 : 175}`,
                end: () => `+=${innerHeight * 0.65}`,
                onUpdate: (self) => {
                  const next = self.progress > 0.12 ? 1 : 0;
                  progress.current = next;
                  gsap.set(figures, {
                    left: (index: number) =>
                      next
                        ? mobile
                          ? "50%"
                          : "25%"
                        : mobile
                          ? (index % 2 ? 75 : 25) + "%"
                          : (index + 0.5) * 25 + "%",
                    top: (index: number) =>
                      next
                        ? mobile
                          ? "18%"
                          : "36%"
                        : mobile
                          ? (index < 2 ? 24 : 69) + "%"
                          : "44%",
                    width: next
                      ? mobile
                        ? "50%"
                        : "34%"
                      : mobile
                        ? "43%"
                        : "22%",
                    height: next
                      ? mobile
                        ? "26svh"
                        : "40svh"
                      : mobile
                        ? "34svh"
                        : "61svh",
                  });
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
              onUpdate: sync,
            });
            const finale = node.querySelector<HTMLElement>(
              "[data-gallery-finale]",
            )!;
            const finaleContent = finale.querySelector<HTMLElement>(
              "[class*=panelContent]",
            )!;
            if (motion) {
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
                  node.querySelector("[class*=sculptureSticky]"),
                  { autoAlpha: 0, y: -90, duration: 0.8 },
                  0,
                )
                .to(
                  stage,
                  {
                    y: () => -innerHeight * 0.8,
                    opacity: 0,
                    duration: 1,
                    ease: "power2.inOut",
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
                    ease: "power3.inOut",
                  },
                  0,
                )
                .to(
                  finaleContent.querySelectorAll(
                    "[data-morph-frame],[data-frame-trace]",
                  ),
                  {
                    morphSVG: "M4 2H996L998 4V596L996 598H4L2 596V4Z",
                    duration: 1,
                    ease: "power3.inOut",
                  },
                  0,
                );
            } else {
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
              delete node.dataset.galleryReady;
              stage.inert = false;
              figures.forEach((figure) => {
                figure.inert = false;
              });
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
  }, [products.length]);
  const featured = products[active] ?? products[0],
    story = COLLECTION_STORY[ar ? "ar" : "en"];
  return (
    <div ref={root} className={s.gallery} data-collapsed={collapsed}>
      <nav
        data-originales-nav
        className={s.silhouetteNav}
        aria-label={ar ? "عطور أوريجينال" : "Originales fragrances"}
      >
        {products.map((product, index) => {
          const edition = editionFor(product);
          return (
            <Link
              key={product.id}
              href={originalesPath(product)}
              data-active={index === active}
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
              <small>0{index + 1}</small>
            </Link>
          );
        })}
      </nav>
      <header className={s.galleryIntro}>
        <EditionEmblem index={active} />
        <div>
          <p className={s.kicker}>MAG PARFUM / COLLECTION 01</p>
          <h1>ORIGINALES</h1>
        </div>
        <a href="#the-editions" className={s.galleryScroll}>
          {ar
            ? "أربعة تعابير. اختر عالمك."
            : "Four expressions. Find your own."}
          <ArrowDown size={15} />
        </a>
      </header>
      <section
        data-gallery-sequence
        data-object-sequence
        className={s.gallerySequence}
      >
        <div data-gallery-stage className={s.galleryStage}>
          <div className={s.stageHalo} />
          {products.map((product, index) => {
            const edition = editionFor(product);
            return (
              <figure
                data-gallery-bottle
                key={product.id}
                className={s.galleryBottle}
                style={
                  {
                    "--start-left": `${(index + 0.5) * 25}%`,
                    "--mobile-left": `${index % 2 ? 75 : 25}%`,
                    "--mobile-top": `${index < 2 ? 24 : 69}%`,
                  } as CSSProperties
                }
              >
                <Link href={originalesPath(product)}>
                  <Image
                    data-chapter-bottle
                    src={edition.bottle ?? product.images[0] ?? "/logo.webp"}
                    alt={edition.name}
                    width={650}
                    height={1000}
                    priority
                    sizes="(max-width:759px) 44vw, 30vw"
                    className={s.sequenceBottle}
                  />
                  <figcaption data-bottle-caption>
                    <span>{edition.name}</span>
                    <small>{formatAED(product.price)}</small>
                  </figcaption>
                </Link>
              </figure>
            );
          })}
          {featured && (
            <div className={s.stickyPurchase} data-visible={collapsed}>
              <GalleryPurchase key={featured.id} product={featured} ar={ar} />
            </div>
          )}
        </div>
        <div id="the-editions" className={s.sequenceStories}>
          <SculptureScene />
          {products.map((product) => {
            const edition = editionFor(product),
              copy = editionStory(edition.name, ar);
            return (
              <section
                key={product.id}
                data-edition-chapter
                data-snap-panel
                className={s.sequenceChapter}
                style={{ "--edition-accent": edition.accent } as CSSProperties}
              >
                <div className={s.editionCard}>
                  <MorphFrame kind="edition" />
                  <p className={s.kicker}>THE EXPRESSION / {edition.number}</p>
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
                  <Link href={originalesPath(product)} className={s.textLink}>
                    {ar ? "اكتشف العطر" : "Explore the fragrance"}
                    <ArrowUpRight size={15} />
                  </Link>
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
