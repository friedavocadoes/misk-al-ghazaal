import type { ReactNode } from "react";
import "../globals.css";

// Locale-free admin shell (EN only). Storefront html/body lives in
// app/[locale]/layout.tsx — /admin needs its own because it sits outside
// the [locale] segment.
export const metadata = {
  title: "Admin — Misk Al Ghazaal",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream font-[family-name:var(--font-sans)] text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
