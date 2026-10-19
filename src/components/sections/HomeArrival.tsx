"use client";

import { useEffect, useRef } from "react";

/** Visual enhancement only: content stays server-rendered and crawlable. */
export function HomeArrival() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const overlay = ref.current;
    if (!overlay) return;
    let disposed = false;
    const reveal = () => { if (!disposed) overlay.dataset.ready = "true"; };
    const hero = document.querySelector<HTMLImageElement>('[data-home-hero] img');
    const imageReady = hero ? hero.decode().catch(() => undefined) : Promise.resolve();
    const video = document.querySelector<HTMLVideoElement>("[data-home-hero] video");
    const videoReady = video && video.readyState < 2 ? new Promise<void>((resolve) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener("error", () => resolve(), { once: true });
    }) : Promise.resolve();
    const logo = overlay.querySelector("img");
    Promise.all([imageReady, videoReady, document.fonts.ready, logo?.decode().catch(() => undefined)]).then(reveal);
    const timeout = window.setTimeout(reveal, 3500);
    return () => { disposed = true; window.clearTimeout(timeout); };
  }, []);
  return <>
    <div ref={ref} className="home-arrival" aria-hidden="true">
      <div className="arrival-mark">
        {/* Small identity artwork, shared with the header and browser cache. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mag.webp" width="80" height="80" alt="" />
        <span>Misk Al Ghazaal</span><small>PARFUMS</small><i />
      </div>
    </div>
    <noscript><style>{`.home-arrival{display:none!important}`}</style></noscript>
  </>;
}
