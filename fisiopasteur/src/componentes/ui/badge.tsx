"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — etiqueta compacta para estados, categorías o tags.
 *
 * Variantes:
 *  - default / outline → neutros
 *  - brand → color marca (usar para "Principal", "Destacado")
 *  - success / warning / destructive / info → estados semánticos con fondo soft
 *
 * Tamaños sm/md/lg + opción `pill` (radius full).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        brand: "bg-brand text-brand-foreground",
        "brand-soft": "bg-brand-soft text-brand",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        destructive: "bg-destructive/15 text-destructive",
        info: "bg-info/15 text-info",
        outline: "border border-border text-foreground bg-transparent",
      },
      size: {
        sm: "h-5 px-2 text-[10px]",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
      pill: {
        true: "rounded-full",
        false: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      pill: false,
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, pill, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, pill }), className)}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
