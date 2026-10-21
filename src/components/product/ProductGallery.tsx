"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { ProductLens } from "./ProductLens";
import { cn } from "@/lib/utils";

// Modern replacement for elevatezoom.js + snippets/product-thumbnail.liquid:
// Embla main carousel + thumbnail strip + fullscreen dialog viewer.
export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [mainRef, mainApi] = useEmblaCarousel({ loop: true });
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused || zoom) return;
    const sharp = [...document.querySelectorAll<HTMLElement>("[data-lens-sharp]")];
    const visit = (node: Element) => {
      if (sharp.includes(node as HTMLElement)) return;
      if (sharp.some(el => node.contains(el))) {
        [...node.children].forEach(visit);
      } else if (node instanceof HTMLElement && !["SCRIPT", "STYLE", "LINK"].includes(node.tagName)) {
        node.dataset.lensDim = "";
      }
    };
    visit(document.body);
    document.body.classList.add("product-focus-active");
    const dismiss = () => setFocused(false);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", key);
    window.addEventListener("blur", dismiss);
    window.addEventListener("scroll", dismiss, { passive: true });
    return () => {
      document.body.classList.remove("product-focus-active");
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("scroll", dismiss);
    };
  }, [focused, zoom]);
  useEffect(() => () => {
    document.querySelectorAll<HTMLElement>("[data-lens-dim]").forEach(el => delete el.dataset.lensDim);
    document.body.classList.remove("product-focus-active");
  }, []);

  const onSelect = useCallback(() => {
    if (!mainApi || !thumbApi) return;
    const i = mainApi.selectedScrollSnap();
    setSelected(i);
    thumbApi.scrollTo(i);
  }, [mainApi, thumbApi]);

  useEffect(() => {
    if (!mainApi) return;
    mainApi.on("select", onSelect);
    mainApi.on("reInit", onSelect);
    return () => {
      mainApi.off("select", onSelect);
      mainApi.off("reInit", onSelect);
    };
  }, [mainApi, onSelect]);

  const scrollTo = (i: number) => mainApi?.scrollTo(i);

  return (
    <div className="product-gallery">
      <div data-lens-sharp className="gallery-focus-frame relative overflow-hidden rounded-sm bg-sand">
        <div ref={mainRef} className="overflow-hidden">
          <div className="flex">
            {images.map((src, i) => (
              <div key={src + i} className="relative aspect-square min-w-0 flex-[0_0_100%]">
                <ProductLens onActive={setFocused}><Image
                  src={src}
                  alt={i === 0 ? title : `${title} — view ${i + 1}`}
                  fill
                  sizes="(min-width:1280px) 600px, (min-width:1024px) 50vw, 100vw"
                  priority={i === 0}
                  className="object-cover"
                /></ProductLens>
              </div>
            ))}
          </div>
        </div>
        {images.length > 1 && (
          <>
            <button
              onClick={() => mainApi?.scrollPrev()}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-ink/10 bg-white/90 p-2.5 text-ink shadow-sm transition hover:border-ink/40 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ChevronLeft className="size-4" strokeWidth={1.25} />
            </button>
            <button
              onClick={() => mainApi?.scrollNext()}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-ink/10 bg-white/90 p-2.5 text-ink shadow-sm transition hover:border-ink/40 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <ChevronRight className="size-4" strokeWidth={1.25} />
            </button>
          </>
        )}
        <button
          onClick={() => { setFocused(false); setZoom(true); }}
          aria-label="View fullscreen"
          className="absolute bottom-3 right-3 rounded-full border border-ink/10 bg-white/90 p-2.5 text-ink shadow-sm transition hover:border-ink/40 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Expand className="size-4" />
        </button>
      </div>

      {images.length > 1 && (
        <div ref={thumbRef} className="mt-3 overflow-hidden">
          <div className="flex gap-3">
            {images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => scrollTo(i)}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-sm border p-1 transition-opacity sm:size-20",
                  i === selected ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Portaled to body: `position: fixed` inside the smoothed content
          would pin to the content, not the viewport (GSAP caveat). */}
      {zoom &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setZoom(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Product image fullscreen"
          >
            <div className="relative aspect-square w-full max-w-3xl overflow-hidden">
              <Image
                src={images[selected]}
                alt={title}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
