import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const body = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gazaal — Misk Al Ghazaal Perfumes, Dukhoon & Holy Oudh",
  description:
    "Authentic Misk Al Ghazaal perfumes, dukhoon, bakhoor and holy oudh — direct from manufacturer, delivered across the UAE.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-cream font-[family-name:var(--font-body)] text-ink">
        {children}
      </body>
    </html>
  );
}
