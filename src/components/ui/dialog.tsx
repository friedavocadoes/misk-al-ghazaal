"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export const Dialog=Primitive.Root;
export const DialogTrigger=Primitive.Trigger;
export const DialogTitle=Primitive.Title;
export const DialogDescription=Primitive.Description;
export function DialogContent({className,children,...props}:React.ComponentPropsWithoutRef<typeof Primitive.Content>){return <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-50 bg-black/40"/><Primitive.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-white p-6 text-ink shadow-2xl",className)} {...props}>{children}<Primitive.Close aria-label="Close dialog" className="absolute right-3 top-3 rounded p-2 text-fog"><X size={18}/></Primitive.Close></Primitive.Content></Primitive.Portal>;}
