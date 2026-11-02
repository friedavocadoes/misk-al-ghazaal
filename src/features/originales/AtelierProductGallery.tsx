"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle } from "lucide-react";
import { atelierGsap } from "./atelier-gsap";
import s from "./atelier.module.css";

/** The live bottle/box scene is frame zero; uploaded photography never replaces its DOM nodes. */
export function AtelierProductGallery({
  images,
  bottle,
  box,
  name,
  ar,
}: {
  images: string[];
  bottle: string;
  box?: string;
  name: string;
  ar: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const photos = [...new Set(images)].filter((src) => src && src !== bottle);
  const current = selected && photos.includes(selected) ? selected : null;
  const rail = useRef<HTMLDivElement>(null),
    marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let live = true,
      stop = () => {};
    void atelierGsap().then(({ gsap, Flip }) => {
      if (!live || !rail.current || !marker.current) return;
      const indicator = marker.current,
        buttons = rail.current;
      let animation: ReturnType<typeof Flip.from> | undefined;
      const place = () => {
        const target = buttons.querySelector<HTMLElement>(
          "[aria-pressed=true]",
        );
        if (!target) return;
        const state = Flip.getState(indicator);
        Flip.fit(indicator, target, { scale: false });
        animation?.kill();
        if (!reduced)
          animation = Flip.from(state, {
            duration: 0.6,
            ease: "power3.inOut",
            absolute: true,
          });
      };
      place();
      const resize = new ResizeObserver(place);
      resize.observe(buttons);
      stop = () => {
        animation?.kill();
        resize.disconnect();
        gsap.killTweensOf(indicator);
      };
    });
    return () => {
      live = false;
      stop();
    };
  }, [current, reduced]);
  return (
    <div
      data-product-gallery
      data-photo-active={!!current}
      className={s.productGallery}
    >
      <div className={s.photoAperture}>
        <AnimatePresence mode="sync">
          {current && (
            <motion.div
              key={current}
              className={s.photoPlane}
              initial={
                reduced
                  ? false
                  : {
                      opacity: 0,
                      x: 8,
                      rotateY: 0,
                      scale: 1,
                      filter: "blur(3px)",
                      borderRadius: "2px",
                    }
              }
              animate={{
                opacity: 1,
                x: 0,
                rotateY: 0,
                scale: 1,
                filter: "blur(0px)",
                borderRadius: "2px",
              }}
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                filter: reduced ? "none" : "blur(3px)",
              }}
              transition={{
                duration: reduced ? 0 : 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {loaded !== current && (
                <LoaderCircle
                  className={s.photoLoading}
                  aria-label={ar ? "تحميل الصورة" : "Loading image"}
                />
              )}
              <Image
                src={current}
                alt={`${name} — ${ar ? "صورة المنتج" : "product photograph"}`}
                fill
                sizes="(max-width:759px) 88vw, 40vw"
                className={s.databasePhoto}
                onLoad={() => setLoaded(current)}
                onError={() => setLoaded(current)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={s.photoCounter} data-static-ink>
        <span>
          {String(current ? photos.indexOf(current) + 2 : 1).padStart(2, "0")} /{" "}
          {String(photos.length + 1).padStart(2, "0")}
        </span>
        <small>{ar ? "تفاصيل العطر" : "THE OBJECT · EVERY PERSPECTIVE"}</small>
      </div>
      <div
        ref={rail}
        className={s.photoRail}
        role="group"
        aria-label={ar ? "صور المنتج" : "Product images"}
        data-static-ink
      >
        <span ref={marker} className={s.thumbIndicator} aria-hidden="true" />
        <button
          type="button"
          aria-pressed={!current}
          aria-label={ar ? "الزجاجة والعلبة" : "Bottle and presentation box"}
          onClick={() => setSelected(null)}
        >
          {box && (
            <Image
              src={box}
              alt=""
              fill
              sizes="56px"
              className={s.boxThumbnail}
            />
          )}
          <Image
            src={bottle}
            alt=""
            fill
            sizes="56px"
            className={s.bottleThumbnail}
          />
          {!current && <Check size={10} className={s.photoSelected} />}
        </button>
        {photos.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-pressed={current === src}
            aria-label={`${ar ? "صورة" : "View photograph"} ${index + 1}`}
            onClick={() => setSelected(src)}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
            {current === src && <Check size={10} className={s.photoSelected} />}
          </button>
        ))}
      </div>
    </div>
  );
}
