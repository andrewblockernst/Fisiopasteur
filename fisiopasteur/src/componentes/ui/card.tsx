"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Card — contenedor visual reutilizable.
 *
 * Composición:
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Próximos turnos</CardTitle>
 *     <CardDescription>Hoy, 14 turnos</CardDescription>
 *   </CardHeader>
 *   <CardContent>...</CardContent>
 *   <CardFooter>...</CardFooter>
 * </Card>
 * ```
 */

const cardVariants = cva(
  "rounded-lg bg-card text-card-foreground transition-shadow",
  {
    variants: {
      variant: {
        default: "border border-border shadow-sm",
        elevated: "shadow-md",
        outlined: "border-2 border-border",
        ghost: "",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-md active:scale-[0.998]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Override del padding del Card completo. Por default usa `none` y cada slot maneja su padding. */
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, padding = "none", ...props }, ref) => {
    const paddingClass = {
      none: "",
      sm: "p-3 sm:p-4",
      md: "p-4 sm:p-6",
      lg: "p-6 sm:p-8",
    }[padding];

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, interactive }), paddingClass, className)}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-4 sm:p-6 border-b border-border",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-base font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 sm:p-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-2 p-4 sm:p-6 border-t border-border",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
