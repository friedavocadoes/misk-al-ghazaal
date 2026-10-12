import { cn } from "@/lib/utils";

/** Shimmer block for route skeletons (see `.skel` in globals.css).
    Shape each loading.tsx to mirror its page — the layout should feel
    already-there before the content streams in. */
export function Sk({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skel", className)} />;
}
