"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export type WishResult = "added" | "removed" | "login" | "error" | void;

/** Wishlist heart with a light ray-burst on add: 8 short lines fire out
    of the heart and dissolve in half a second (pure CSS, GPU transforms
    only). Keyless by design — one Heart instance for life, burst spans
    self-remove on a timer, the pop replays via class toggle on
    animation-end. Bursts only on genuine adds, never remove/login hops. */
export function WishHeart({
  wished,
  onToggle,
  className,
  heartClassName,
  label,
}: {
  wished: boolean;
  onToggle: (e: React.MouseEvent) => Promise<WishResult>;
  className?: string;
  heartClassName?: string;
  label: string;
}) {
  const [bursts, setBursts] = useState<number[]>([]);
  const [popping, setPopping] = useState(false);
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const click = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = await onToggle(e);
    if (r === "login" || r === "removed" || r === "error" || wished) return;
    seq.current += 1;
    const id = seq.current;
    setBursts((b) => [...b.slice(-2), id]);
    timers.current.push(setTimeout(() => {
      setBursts((b) => b.filter((x) => x !== id));
    }, 650));
    // Replay the pop even on rapid re-adds: drop the class, re-add it on
    // the next frame so the animation restarts from 0.
    setPopping(false);
    timers.current.push(setTimeout(() => setPopping(true), 30));
  };

  return (
    <button
      onClick={click}
      aria-label={label}
      aria-pressed={wished}
      className={cn("relative cursor-pointer", className)}
    >
      <Heart
        onAnimationEnd={() => setPopping(false)}
        className={cn(
          "transition-colors duration-300",
          wished && "fill-[#9c2b2e] text-[#9c2b2e]",
          popping && "animate-[heart-pop_0.38s_cubic-bezier(0.34,1.56,0.64,1)]",
          heartClassName,
        )}
      />
      {bursts.map((id) => (
        <span key={id} aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="burst-ray"
              style={{ "--r": `${i * 45}deg` } as React.CSSProperties}
            />
          ))}
        </span>
      ))}
    </button>
  );
}
