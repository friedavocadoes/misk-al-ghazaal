"use client";
// Adapted from Aceternity tooltip-card registry (Manu Arora): spring reveal,
// with Radix positioning/portal, keyboard dismissal and persistent touch opening.
import { useRef, useState, useEffect, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";

export function TooltipCard({ children, content }: { children: ReactNode; content: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger asChild onPointerEnter={e => { if (e.pointerType === "mouse") { cancel(); setOpen(true); } }}
      onPointerLeave={e => { if (e.pointerType === "mouse") { cancel(); timer.current = setTimeout(() => setOpen(false), 180); } }}>
      {children}
    </Popover.Trigger>
    <Popover.Portal><Popover.Content side="top" sideOffset={10} collisionPadding={12}
      onOpenAutoFocus={e => e.preventDefault()} onCloseAutoFocus={e => e.preventDefault()}
      onPointerEnter={cancel} onPointerLeave={e => { if (e.pointerType === "mouse") setOpen(false); }}
      className="note-tooltip-card z-[80] w-72 max-w-[calc(100vw-24px)] outline-none">
      <motion.div initial={{ opacity: 0, scale: .96, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }}>{content}</motion.div>
      <Popover.Arrow className="fill-[#fffdf8]" />
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
