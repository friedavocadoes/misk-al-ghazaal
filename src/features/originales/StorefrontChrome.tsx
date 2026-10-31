"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  ORIGINALES_ENABLED,
  RETURN_KEY,
  isOriginalesPath,
  safeReturnPath,
} from "./config";

/** Keep providers above this boundary: entering the capsule never creates a second cart. */
export function StorefrontChrome({
  header,
  footer,
  editor,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  editor?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const capsule = ORIGINALES_ENABLED && isOriginalesPath(pathname);
  useEffect(() => {
    if (capsule) return;
    const remember = () => {
      const path = safeReturnPath(
        window.location.pathname + window.location.search,
      );
      if (path) {
        try {
          sessionStorage.setItem(RETURN_KEY, path);
        } catch {}
      }
    };
    remember();
    // Capture the current query just before navigation too (e.g. collection facets).
    document.addEventListener("click", remember, true);
    return () => document.removeEventListener("click", remember, true);
  }, [capsule, pathname]);
  return (
    <>
      {!capsule && header}
      <div id="page-content" style={capsule ? { paddingTop: 0 } : undefined}>
        {!capsule && editor}
        <main className="min-h-[60vh]">{children}</main>
        {!capsule && footer}
      </div>
    </>
  );
}
