"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Menú de acciones de fila (botón 3 puntos) basado en Radix DropdownMenu.
 *
 * Usa `DropdownMenu.Portal` para que el menú escape de cualquier `overflow:
 * hidden` o `overflow: auto` del contenedor padre (típicamente tablas con scroll
 * propio). Esto evita que se clipee cuando hay pocas filas.
 *
 * Composición:
 * ```tsx
 * <RowActionsMenu ariaLabel="Acciones del paciente">
 *   <RowActionsItem icon={<Pencil className="w-4 h-4" />} onSelect={onEdit}>
 *     Editar
 *   </RowActionsItem>
 *   <RowActionsItem variant="destructive" icon={<Trash />} onSelect={onDelete}>
 *     Eliminar
 *   </RowActionsItem>
 * </RowActionsMenu>
 * ```
 */

interface RowActionsMenuProps {
  ariaLabel?: string;
  align?: "start" | "center" | "end";
  /** Distancia entre el trigger y el contenido del menú en px. Default 4. */
  sideOffset?: number;
  triggerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function RowActionsMenu({
  ariaLabel = "Más acciones",
  align = "end",
  sideOffset = 4,
  triggerClassName,
  contentClassName,
  children,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center hover:bg-muted rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            triggerClassName,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={sideOffset}
          // Evita que la fila reciba el click cuando se hace clic en el menú.
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[180px] py-1",
            contentClassName,
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type ItemVariant = "default" | "success" | "destructive";

interface RowActionsItemProps {
  onSelect?: () => void;
  disabled?: boolean;
  variant?: ItemVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const itemVariantClasses: Record<ItemVariant, string> = {
  default: "text-foreground hover:bg-muted data-[highlighted]:bg-muted",
  success:
    "text-success hover:bg-success/10 data-[highlighted]:bg-success/10",
  destructive:
    "text-destructive hover:bg-destructive/10 data-[highlighted]:bg-destructive/10",
};

export function RowActionsItem({
  onSelect,
  disabled,
  variant = "default",
  icon,
  children,
  className,
}: RowActionsItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onSelect?.();
      }}
      className={cn(
        "w-full px-4 py-2 text-left text-sm flex items-center gap-2 outline-none cursor-pointer transition-colors",
        itemVariantClasses[variant],
        disabled && "opacity-50 !cursor-not-allowed pointer-events-none",
        className,
      )}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span className="flex-1">{children}</span>
    </DropdownMenu.Item>
  );
}

export function RowActionsSeparator() {
  return <DropdownMenu.Separator className="h-px bg-border my-1" />;
}
