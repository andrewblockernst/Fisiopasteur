"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Input — campo de texto atómico.
 *
 * - Soporta `leftIcon`/`rightIcon` (posicionados absolute).
 * - Estados: default, hover, focus, disabled, readonly, error.
 * - `error` se setea automáticamente cuando el Input está dentro de un
 *   `<FormField>` con error (vía aria-invalid).
 */

export const inputVariants = cva(
  "flex w-full rounded-md border bg-background text-sm text-foreground " +
    "placeholder:text-muted-foreground/70 " +
    "transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted " +
    "read-only:bg-muted read-only:cursor-default " +
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/20",
  {
    variants: {
      size: {
        sm: "h-9 px-2.5 py-1.5 text-sm",
        md: "h-10 px-3 py-2 text-sm",
        lg: "h-11 px-4 py-2.5 text-base",
      },
      bordered: {
        true: "border-input",
        false: "border-transparent",
      },
    },
    defaultVariants: {
      size: "md",
      bordered: true,
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Override manual del estado de error (usualmente lo maneja FormField). */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = "text", size, leftIcon, rightIcon, error, ...props },
    ref,
  ) => {
    const hasLeft = !!leftIcon;
    const hasRight = !!rightIcon;

    const inputEl = (
      <input
        ref={ref}
        type={type}
        aria-invalid={error || undefined}
        className={cn(
          inputVariants({ size }),
          hasLeft && (size === "lg" ? "pl-12" : "pl-11"),
          hasRight && (size === "lg" ? "pr-12" : "pr-11"),
          className,
        )}
        {...props}
      />
    );

    if (!hasLeft && !hasRight) return inputEl;

    return (
      <div className="relative w-full">
        {hasLeft && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {leftIcon}
          </span>
        )}
        {inputEl}
        {hasRight && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {rightIcon}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
