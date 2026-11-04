"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  isOriginalesPath,
  ORIGINALES_ENABLED,
  ORIGINALES_NAVIGATION_EVENT,
} from "@/features/originales/config";
import { OriginalesLoading } from "@/features/originales/OriginalesLoading";

/** Keep the capsule veil mounted through loading boundaries and reveal the ready route. */
export function RouteProgress() {
  const pathname = usePathname();
  const [target, setTarget] = useState<{
    path: string;
    capsule: boolean;
  } | null>(null);
  const [departing, setDeparting] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(el instanceof HTMLAnchorElement)) return;
      const href = el.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      if (el.hasAttribute("download") || (el.target && el.target !== "_self"))
        return;
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      )
        return;
      const url = new URL(el.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      const clean = url.pathname.replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
      const collectionAlias =
        clean === "/collection/originales" ||
        (clean.startsWith("/collection/") &&
          url.searchParams.get("lineup") === "originales");
      setDeparting(false);
      setTarget({
        path: collectionAlias && ORIGINALES_ENABLED ? "/originales" : clean,
        capsule:
          ORIGINALES_ENABLED && (collectionAlias || isOriginalesPath(clean)),
      });
    };
    const onOriginalesNavigate = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (
        !ORIGINALES_ENABLED ||
        typeof path !== "string" ||
        !isOriginalesPath(path)
      )
        return;
      setDeparting(false);
      setTarget({ path, capsule: true });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(ORIGINALES_NAVIGATION_EVENT, onOriginalesNavigate);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(
        ORIGINALES_NAVIGATION_EVENT,
        onOriginalesNavigate,
      );
    };
  }, []);

  useEffect(() => {
    if (!target) return;
    const timer = setTimeout(() => setTarget(null), 8000);
    return () => clearTimeout(timer);
  }, [target]);

  useEffect(() => {
    if (!target?.capsule || departing) return;
    const check = () => {
      if (pathname !== target.path) return;
      const current = document.querySelector<HTMLElement>(
        "[data-originales-route][data-originales-ready=true]",
      );
      if (current?.dataset.originalesRoute === target.path) setDeparting(true);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.getElementById("page-content") ?? document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-originales-ready"],
    });
    const frame = requestAnimationFrame(check);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, pathname, departing]);

  useEffect(() => {
    if (!departing) return;
    const timer = setTimeout(() => setTarget(null), 440);
    return () => clearTimeout(timer);
  }, [departing]);

  if (!target) return null;
  if (target.capsule)
    return <OriginalesLoading phase={departing ? "leaving" : "entering"} />;
  if (target.path === pathname) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[90] h-[2px] overflow-hidden"
    >
      <span className="route-progress-bar block h-full w-1/3 bg-gold" />
    </div>
  );
}
