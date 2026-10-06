import type { ReactNode } from "react";
import { SiteHeader } from "@/components/blocks/SiteHeader";
import { SiteFooter } from "@/components/blocks/SiteFooter";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter />
    </>
  );
}
