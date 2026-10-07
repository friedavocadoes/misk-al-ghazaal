import type { ReactNode } from "react";

// Root layout stays minimal: <html>/<body> live in app/[locale]/layout.tsx
// so lang + dir follow the active locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
