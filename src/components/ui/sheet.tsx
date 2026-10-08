"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Sheet = right-side drawer (cart, search, mobile menu). Shadcn-standard API.
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-[overlay-in_0.35s_ease-out] data-[state=closed]:animate-[overlay-out_0.25s_ease-in]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl data-[state=open]:animate-[sheet-in-right_0.45s_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[sheet-out-right_0.3s_ease-in]",
          className
        )}
        {...props}
      >
        <SheetClose className="absolute right-4 top-4 rounded-[2px] border border-ink/15 bg-white p-1.5 text-espresso hover:border-ink hover:text-ink">
          <X className="size-5" />
          <span className="sr-only">Close</span>
        </SheetClose>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-ink/10 px-6 py-5", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("font-display text-xl text-ink", className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
