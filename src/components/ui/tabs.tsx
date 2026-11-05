"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { cn } from "@/lib/utils";

function Tabs({ dir = "ltr", ...props }: React.ComponentProps<typeof TabsPrimitive.Root> & { dir?: "ltr" | "rtl" }) {
  return <DirectionProvider direction={dir}><TabsPrimitive.Root {...props} /></DirectionProvider>;
}

function TabsList({
  className, children, variant = "line", ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.List>, "className"> & {
  className?: string;
  variant?: "default" | "line";
}) {
  return (
    <TabsPrimitive.List
      activateOnFocus
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list relative isolate inline-flex items-center",
        variant === "default"
          ? "gap-1 rounded-[6px] border border-ink/10 bg-sand/70 p-1"
          : "gap-6 border-b border-ink/15",
        className
      )}
      {...props}
    >
      {children}
      {variant === "default" && <TabsPrimitive.Indicator className="pointer-events-none absolute left-0 top-0 -z-10 h-[var(--active-tab-height)] w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] translate-y-[var(--active-tab-top)] rounded-[4px] border border-ink/10 bg-cream shadow-[0_2px_6px_#1c19170a] transition-[translate,width,height] duration-200 ease-out motion-reduce:transition-none" />}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: Omit<React.ComponentProps<typeof TabsPrimitive.Tab>, "className"> & { className?: string }) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative cursor-pointer whitespace-nowrap rounded-[4px] text-xs font-medium uppercase tracking-[0.14em] text-fog transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
        "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:border-b group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:data-[active]:border-ink",
        "group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:px-5 group-data-[variant=default]/tabs-list:py-3 data-[active]:text-ink",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: Omit<React.ComponentProps<typeof TabsPrimitive.Panel>, "className"> & { className?: string }) {
  return <TabsPrimitive.Panel className={cn("mt-8 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
