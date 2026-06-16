"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

/**
 * Label — para asociar texto a un input.
 *
 * Cuando se usa con FormField se conecta automáticamente al input vía
 * `htmlFor`/`id`. Si `required`, agrega marca visual y `aria-required`.
 */
export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium text-foreground leading-none " +
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  >
    {children}
    {required && (
      <span
        aria-hidden="true"
        className="ml-0.5 text-destructive"
        title="Requerido"
      >
        *
      </span>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
