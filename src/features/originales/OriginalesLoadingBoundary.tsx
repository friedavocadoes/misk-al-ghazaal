"use client";
import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { isOriginalesPath, ORIGINALES_ENABLED } from "./config";
import { OriginalesLoading } from "./OriginalesLoading";

export function OriginalesLoadingBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const path = usePathname();
  return ORIGINALES_ENABLED && isOriginalesPath(path) ? (
    <OriginalesLoading />
  ) : (
    children
  );
}
