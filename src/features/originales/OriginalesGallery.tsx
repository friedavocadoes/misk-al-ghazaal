import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/types";
import { formatAED } from "@/lib/utils";
import { productAvailable } from "@/lib/product-options";
import { editionFor, originalesPath } from "./config";
import s from "./originales.module.css";

export function OriginalesGallery({
  products,
  locale,
}: {
  products: Product[];
  locale: string;
}) {
  const ar = locale === "ar";
  return (
    <>
      <section className={s.galleryHero}>
        <div className={s.galleryIntro}>
          <p className={s.kicker}>MAG PARFUM — COLLECTION 01</p>
          <h1>
            Originales
            <span>{ar ? "لكل حضور، تعبير." : "Distinct by nature."}</span>
          </h1>
          <p>
            {ar
              ? "أربعة عطور. أربع شخصيات. تعبيرك الخاص."
              : "Four signatures. Four worlds. Entirely your own."}
          </p>
        </div>
        <div className={s.galleryObjects}>
          {products.map((product) => {
            const e = editionFor(product);
            return (
              <Link
                href={originalesPath(product)}
                key={product.id}
                className={s.galleryObject}
                style={
                  {
                    "--edition-accent": e.accent,
                    "--edition-wash": e.wash,
                  } as React.CSSProperties
                }
              >
                <span className={s.objectHalo} />
                <Image
                  src={e.bottle ?? product.images[0] ?? "/logo.webp"}
                  alt={`${e.name} perfume`}
                  width={360}
                  height={550}
                  priority
                  sizes="(max-width:600px) 36vw, 20vw"
                />
                <span className={s.objectLabel}>
                  <small>{e.number}</small>
                  {e.name}
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>
        <a href="#the-editions" className={s.scrollCue}>
          {ar ? "اكتشف المجموعة" : "Enter the collection"}
          <ArrowDown size={16} />
        </a>
      </section>
      <section
        id="the-editions"
        className={s.editionGrid}
        aria-label={ar ? "العطور" : "The editions"}
      >
        {products.map((product) => {
          const e = editionFor(product);
          return (
            <Link
              href={originalesPath(product)}
              key={product.id}
              className={s.editionCard}
              style={
                {
                  "--edition-accent": e.accent,
                  "--edition-wash": e.wash,
                } as React.CSSProperties
              }
            >
              <div className={s.cardArt}>
                <span className={s.cardNumber}>{e.number}</span>
                {e.box && (
                  <Image
                    src={e.box}
                    alt=""
                    width={360}
                    height={470}
                    sizes="(max-width: 700px) 46vw, 24vw"
                    className={s.cardBox}
                  />
                )}
                <Image
                  src={e.bottle ?? product.images[0] ?? "/logo.webp"}
                  alt={e.name}
                  width={360}
                  height={550}
                  sizes="(max-width:700px) 48vw, 25vw"
                  className={s.cardBottle}
                />
              </div>
              <div className={s.cardInfo}>
                <h2>{e.name}</h2>
                <ArrowUpRight size={22} />
                <p>
                  {product.notes
                    .slice(0, 3)
                    .map((n) => (ar ? (n.nameAr ?? n.name) : n.name))
                    .join(" / ") || "Originales — MAG Parfum"}
                </p>
                <span>
                  {productAvailable(product)
                    ? formatAED(product.price)
                    : ar
                      ? "نفد المخزون"
                      : "Out of stock"}
                </span>
              </div>
            </Link>
          );
        })}
        {!products.length && (
          <p className={s.empty}>
            {ar
              ? "المجموعة قادمة قريباً."
              : "The collection is being prepared. Return soon."}
          </p>
        )}
      </section>
    </>
  );
}
