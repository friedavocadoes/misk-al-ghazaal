"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/types";
import { formatAED } from "@/lib/utils";
import { productAvailable } from "@/lib/product-options";
import { editionFor, originalesPath } from "./config";
import { COLLECTION_STORY, editionStory } from "./story";
import s from "./originales.module.css";

export function OriginalesGallery({
  products,
  locale,
}: {
  products: Product[];
  locale: string;
}) {
  const ar = locale === "ar",
    story = COLLECTION_STORY[ar ? "ar" : "en"];
  const root = useRef<HTMLDivElement>(null);
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
          () => {
            const node = root.current!;
            gsap.fromTo(
              node.querySelectorAll("[data-hero-line]"),
              { yPercent: 105 },
              {
                yPercent: 0,
                stagger: 0.13,
                duration: 1.5,
                ease: "power3.out",
                delay: 0.12,
              },
            );
            gsap.fromTo(
              node.querySelector("[data-hero-rule]"),
              { scaleX: 0 },
              { scaleX: 1, duration: 1.8, ease: "power2.inOut", delay: 0.3 },
            );
            gsap.to(node.querySelector("[data-editorial-atmosphere]"), {
              yPercent: 12,
              scale: 1.06,
              ease: "none",
              scrollTrigger: {
                trigger: node.querySelector("[data-editorial-hero]"),
                start: "top top",
                end: "bottom top",
                scrub: 1.5,
              },
            });
            gsap.fromTo(
              node.querySelectorAll("[data-story-word]"),
              { opacity: 0.18 },
              {
                opacity: 1,
                stagger: 0.035,
                ease: "none",
                scrollTrigger: {
                  trigger: node.querySelector("[data-manifesto]"),
                  start: "top 75%",
                  end: "bottom 70%",
                  scrub: 0.7,
                },
              },
            );
            node
              .querySelectorAll<HTMLElement>("[data-edition-chapter]")
              .forEach((chapter) => {
                gsap.fromTo(
                  chapter.querySelector("[data-chapter-art]"),
                  { clipPath: "inset(8% 0 8% 0)", opacity: 0.5 },
                  {
                    clipPath: "inset(0% 0 0% 0)",
                    opacity: 1,
                    duration: 1.4,
                    ease: "power2.out",
                    scrollTrigger: {
                      trigger: chapter,
                      start: "top 78%",
                      once: true,
                    },
                  },
                );
                gsap.fromTo(
                  chapter.querySelector("[data-chapter-bottle]"),
                  { y: 24 },
                  {
                    y: -18,
                    ease: "none",
                    scrollTrigger: {
                      trigger: chapter,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 1.4,
                    },
                  },
                );
                gsap.fromTo(
                  chapter.querySelectorAll("[data-chapter-copy]"),
                  { opacity: 0, y: 18 },
                  {
                    opacity: 1,
                    y: 0,
                    stagger: 0.1,
                    duration: 1.1,
                    ease: "power2.out",
                    scrollTrigger: {
                      trigger: chapter,
                      start: "top 65%",
                      once: true,
                    },
                  },
                );
              });
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
  }, []);
  return (
    <div ref={root} className={s.editorial}>
      <section data-editorial-hero className={s.editorialHero}>
        <div data-editorial-atmosphere className={s.editorialAtmosphere}>
          <Image
            src="/originales/ambrato-atmosphere.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <p className={s.editorialIssue}>
          MAG PARFUM
          <span>{ar ? "مجموعة أوريجينال" : "The Originales collection"}</span>
        </p>
        <div className={s.editorialHeadline}>
          <p>
            {ar ? "حضور، لا يحتاج إلى تفسير." : "An instinct, made personal."}
          </p>
          <h1>
            <span>
              <span data-hero-line>Originales</span>
            </span>
          </h1>
          <div className={s.heroClosing}>
            <span>
              <span data-hero-line>
                {ar ? "تعبيرك، كما أنت." : "An expression, entirely your own."}
              </span>
            </span>
          </div>
        </div>
        <div className={s.editorialBottom}>
          <span data-hero-rule className={s.editorialRule} />
          <span>
            {ar
              ? "أربعة عطور. حضور واحد: حضورك."
              : "Four fragrances. One point of view: yours."}
          </span>
          <a href="#the-story">
            {ar ? "الحكاية" : "The story"}
            <ArrowDown size={15} />
          </a>
        </div>
      </section>
      <section id="the-story" data-manifesto className={s.manifesto}>
        <p className={s.kicker}>
          {ar ? "روح المجموعة" : "The thought behind the collection"}
        </p>
        <h2>
          {story.lead.split("\n").map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </h2>
        <p className={s.manifestoBody}>
          {story.body.split(" ").map((word, i) => (
            <span key={i} data-story-word>
              {word}{" "}
            </span>
          ))}
        </p>
        <p className={s.manifestoClose}>{story.close}</p>
        <a href="#the-editions" className={s.editorialTextLink}>
          {ar ? "اكتشف التعابير الأربعة" : "Discover the four expressions"}
          <ArrowDown size={14} />
        </a>
      </section>
      <div id="the-editions" className={s.chapters}>
        {products.map((product) => {
          const edition = editionFor(product),
            copy = editionStory(edition.name, ar);
          return (
            <section
              key={product.id}
              data-edition-chapter
              className={s.chapter}
              style={
                {
                  "--edition-accent": edition.accent,
                  "--edition-wash": edition.wash,
                } as CSSProperties
              }
            >
              <Link
                href={originalesPath(product)}
                data-chapter-art
                className={s.chapterArt}
                aria-label={`${ar ? "اكتشف" : "Discover"} ${edition.name}`}
              >
                <span className={s.chapterAtmosphere} />
                <span className={s.chapterPlinth} />
                <Image
                  data-chapter-bottle
                  src={edition.bottle ?? product.images[0] ?? "/logo.webp"}
                  alt={edition.name}
                  width={650}
                  height={1000}
                  sizes="(max-width:759px) 67vw, 30vw"
                  className={s.chapterBottle}
                />
              </Link>
              <div className={s.chapterCopy}>
                <p data-chapter-copy className={s.kicker}>
                  ORIGINALES — {edition.number}
                </p>
                <h2 data-chapter-copy>{edition.name}</h2>
                {copy && (
                  <>
                    <h3 data-chapter-copy>{copy.heading}</h3>
                    <p data-chapter-copy className={s.chapterProse}>
                      {copy.body}
                    </p>
                  </>
                )}
                <Link
                  data-chapter-copy
                  className={s.editorialTextLink}
                  href={originalesPath(product)}
                >
                  {ar ? "اكتشف العطر" : "Discover the fragrance"}
                  <ArrowUpRight size={16} />
                </Link>
                <p data-chapter-copy className={s.chapterPrice}>
                  {productAvailable(product)
                    ? formatAED(product.price)
                    : ar
                      ? "نفد المخزون"
                      : "Out of stock"}
                </p>
              </div>
            </section>
          );
        })}
        {!products.length && (
          <p className={s.empty}>
            {ar
              ? "المجموعة قادمة قريباً."
              : "The collection is being prepared. Return soon."}
          </p>
        )}
      </div>
      <section className={s.editorialEpilogue}>
        <span>O</span>
        <p>{ar ? "بصمة تشبهك." : "A signature that feels like you."}</p>
        <small>MAG PARFUM · ORIGINALES</small>
      </section>
    </div>
  );
}
