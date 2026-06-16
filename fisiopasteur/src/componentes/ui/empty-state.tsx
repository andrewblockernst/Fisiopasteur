"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * EmptyState — para listados vacíos, búsquedas sin resultados o secciones
 * que requieren acción inicial.
 *
 * ```tsx
 * <EmptyState
 *   icon={<CalendarX className="h-10 w-10" />}
 *   title="No hay turnos para hoy"
 *   description="Creá un nuevo turno desde el botón +"
 *   action={<Button>Nuevo turno</Button>}
 * />
 * ```
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Reduce padding vertical para usar dentro de contenedores chicos. */
  compact?: boolean;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-12 sm:py-16 px-6",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export { EmptyState };
