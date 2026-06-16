"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Checkbox — input booleano. Soporta estado `indeterminate`.
 *
 * Para asociar a un label visualmente clicable, envolverlo en <Label>.
 * Touch target recomendado: usar tamaño md (h-5) en mobile.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    size?: "sm" | "md" | "lg";
  }
>(({ className, size = "md", ...props }, ref) => {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer shrink-0 rounded-sm border-2 border-input bg-background ring-offset-background " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
          "disabled:cursor-not-allowed disabled:opacity-50 " +
          "data-[state=checked]:bg-brand data-[state=checked]:border-brand data-[state=checked]:text-brand-foreground " +
          "data-[state=indeterminate]:bg-brand data-[state=indeterminate]:border-brand data-[state=indeterminate]:text-brand-foreground " +
          "transition-colors",
        sizeClass,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        {props.checked === "indeterminate" ? (
          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
