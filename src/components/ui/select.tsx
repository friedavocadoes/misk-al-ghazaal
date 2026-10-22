import * as React from "react";
import { cn } from "@/lib/utils";
/** Accessible native select, styled to match the shared form primitives. */
export const Select=React.forwardRef<HTMLSelectElement,React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({className,...props},ref){return <select ref={ref} className={cn("min-w-0 rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-xs outline-gold",className)} {...props}/>;});
