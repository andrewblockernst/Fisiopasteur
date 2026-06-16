"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea — multilinea. Heredamos los tokens del Input (mismo border, focus,
 * disabled, error). Soporta `autoResize` opcional.
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  /** Crece automáticamente con el contenido (sin scroll interno). */
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, autoResize = false, onInput, rows = 3, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(
      ref,
      () => innerRef.current as HTMLTextAreaElement,
    );

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize && innerRef.current) {
        innerRef.current.style.height = "auto";
        innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
      }
      onInput?.(e);
    };

    return (
      <textarea
        ref={innerRef}
        rows={rows}
        aria-invalid={error || undefined}
        onInput={handleInput}
        className={cn(
          "flex w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground " +
            "placeholder:text-muted-foreground/70 " +
            "transition-colors resize-y " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand " +
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted " +
            "read-only:bg-muted read-only:cursor-default " +
            "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/20",
          autoResize && "resize-none overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
