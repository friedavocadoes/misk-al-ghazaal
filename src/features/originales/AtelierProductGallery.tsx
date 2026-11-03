"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle, X } from "lucide-react";
import { ProductLens } from "@/components/product/ProductLens";
import { atelierGsap } from "./atelier-gsap";
import s from "./atelier.module.css";

/** The live bottle/box scene is frame zero; uploaded photography never replaces its DOM nodes. */
export function AtelierProductGallery({
  images,
  bottle,
  box,
  name,
  ar,
  onFocusChange,
}: {
  images: string[];
  bottle: string;
  box?: string;
  name: string;
  ar: boolean;
  onFocusChange?: (active: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const focus = useCallback(
    (active: boolean) => {
      setFocused(active);
      onFocusChange?.(active);
    },
    [onFocusChange],
  );
  const choose = (src: string | null) => {
    focus(false);
    setSelected(src);
  };
  useEffect(() => {
    if (!focused) return;
    document.body.dataset.originalesPhotoFocus = "true";
    const leave = () => focus(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    addEventListener("scroll", leave, { passive: true });
    addEventListener("blur", leave);
    addEventListener("keydown", key);
    return () => {
      delete document.body.dataset.originalesPhotoFocus;
      removeEventListener("scroll", leave);
      removeEventListener("blur", leave);
      removeEventListener("keydown", key);
    };
  }, [focused, focus]);
  useEffect(
    () => () => {
      onFocusChange?.(false);
      delete document.body.dataset.originalesPhotoFocus;
    },
    [onFocusChange],
  );
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
            ease: "atelier-soft",
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
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const measure = () => {
      const overflow = element.scrollWidth - element.clientWidth;
      element.dataset.overflow = String(overflow > 2);
      element.dataset.more = String(
        overflow - Math.abs(element.scrollLeft) > 2,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [photos.length]);
  return (
    <div
      data-product-gallery
      data-photo-active={!!current}
      data-focused={focused}
      className={s.productGallery}
    >
      <span className={s.photoFocusName} aria-hidden="true">
        {name}
      </span>
      <div className={s.photoAperture}>
        <AnimatePresence mode="sync">
          {current && (
            <motion.div
              key={current}
              className={s.photoPlane}
              data-focus={focused}
              onClick={() => {
                if (matchMedia("(hover:none)").matches) focus(true);
              }}
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
              <ProductLens onActive={focus}>
                <Image
                  src={current}
                  alt={`${name} — ${ar ? "صورة المنتج" : "product photograph"}`}
                  fill
                  sizes="(max-width:759px) 88vw, 40vw"
                  className={s.databasePhoto}
                  onLoad={() => setLoaded(current)}
                  onError={() => setLoaded(current)}
                />
              </ProductLens>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {focused && (
        <button
          type="button"
          className={s.photoFocusExit}
          aria-label={ar ? "إغلاق العرض المكبر" : "Exit image focus"}
          onClick={() => focus(false)}
        >
          <X size={16} />
        </button>
      )}
      <div
        ref={rail}
        className={s.photoRail}
        role="group"
        aria-label={ar ? "صور المنتج" : "Product images"}
        data-static-ink
        inert={focused || undefined}
      >
        <span ref={marker} className={s.thumbIndicator} aria-hidden="true" />
        <button
          type="button"
          aria-pressed={!current}
          aria-label={ar ? "الزجاجة والعلبة" : "Bottle and presentation box"}
          onClick={() => choose(null)}
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
            onClick={() => choose(src)}
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
