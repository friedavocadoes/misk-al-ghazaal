import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware primitives. ALWAYS import Link/redirect/useRouter/
// usePathname from here — never from next/link or next/navigation —
// so URLs stay prefixed (/en/…, /ar/…). Plain hrefs ("/collection/x")
// are prefixed automatically; data layers keep unprefixed paths.
export const {
  Link,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);
