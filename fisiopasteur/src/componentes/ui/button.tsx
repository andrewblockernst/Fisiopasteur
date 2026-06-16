"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Button — componente atómico de acción.
 *
 * Variantes:
 *  - primary:    Acción principal (Guardar, Confirmar). Color de marca.
 *  - secondary:  Acción secundaria. Fondo `muted`.
 *  - outline:    Acción terciaria con borde. Buen reemplazo de "Cancelar".
 *  - ghost:      Acción mínima sin fondo. Útil dentro de toolbars.
 *  - destructive: Acciones destructivas (Eliminar). Color `destructive`.
 *  - success / warning: Estados especiales.
 *
 * Tamaños:
 *  - sm (h-9), md (h-10), lg (h-11). En mobile preferir md+ por touch target.
 *
 * Props especiales:
 *  - `loading`: muestra spinner y desactiva interacción (aria-busy).
 *  - `leftIcon` / `rightIcon`: íconos opcionales.
 *  - `fullWidth`: ocupa 100% del ancho disponible.
 *  - `asChild`: usa Radix Slot para envolver un <Link/>, <a/>, etc.
 */

const buttonVariants = cva(
  // base
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:bg-brand-hover",
        secondary: "bg-muted text-foreground hover:bg-muted/70",
        outline:
          "border-2 border-input bg-background text-foreground hover:bg-muted",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        destructive:
          "border-2 border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground",
        success:
          "border-2 border-success bg-transparent text-success hover:bg-success hover:text-success-foreground",
        warning:
          "border-2 border-warning bg-transparent text-warning hover:bg-warning hover:text-warning-foreground",
        link: "text-brand underline-offset-4 hover:underline px-0 active:scale-100",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-9 w-9 p-0",
        "icon-lg": "h-11 w-11 p-0",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza spinner y deshabilita interacción */
  loading?: boolean;
  /** Ícono a la izquierda del label */
  leftIcon?: React.ReactNode;
  /** Ícono a la derecha del label */
  rightIcon?: React.ReactNode;
  /** Compose con Link/anchor vía Radix Slot */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </Comp>
    );
  },
);
Button.displayName = "Button";

/**
 * IconButton — botón cuadrado con un solo ícono. Requiere `aria-label`.
 */
export interface IconButtonProps extends Omit<ButtonProps, "leftIcon" | "rightIcon" | "children" | "size"> {
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg";
  "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "md", ...props }, ref) => {
    const sizeMap = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;
    return (
      <Button ref={ref} size={sizeMap[size]} {...props}>
        {icon}
      </Button>
    );
  },
);
IconButton.displayName = "IconButton";

/**
 * FAB — Floating Action Button. Fijo en una esquina, alto z-index.
 *  Recordar: en mobile dejar `pb-20 + safe-area` en el contenido subyacente
 *  para que no tape contenido.
 */
export interface FABProps extends Omit<IconButtonProps, "size"> {
  position?: "bottom-right" | "bottom-left" | "bottom-center";
}

const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ position = "bottom-right", className, ...props }, ref) => {
    const positionClass = {
      "bottom-right": "right-4 bottom-20 lg:bottom-6",
      "bottom-left": "left-4 bottom-20 lg:bottom-6",
      "bottom-center": "left-1/2 -translate-x-1/2 bottom-20 lg:bottom-6",
    }[position];

    return (
      <IconButton
        ref={ref}
        size="lg"
        variant="primary"
        className={cn(
          "fixed z-40 rounded-full shadow-lg hover:shadow-xl h-14 w-14",
          positionClass,
          className,
        )}
        {...props}
      />
    );
  },
);
FAB.displayName = "FAB";

export { Button, IconButton, FAB, buttonVariants };
