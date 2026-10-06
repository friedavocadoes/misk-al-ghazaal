import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "bg-ink text-white",
        sale: "bg-[#9c2b2e] text-white",
        new: "bg-gold text-white",
        outline: "border border-ink/25 text-espresso",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
