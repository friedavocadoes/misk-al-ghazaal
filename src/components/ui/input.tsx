import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[4px] border border-ink/15 bg-white transition-[border-color,box-shadow] hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-text px-4 text-sm text-ink placeholder:text-fog focus-visible:outline-none focus-visible:border-gold focus-visible:ring-1 focus-visible:ring-gold",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
