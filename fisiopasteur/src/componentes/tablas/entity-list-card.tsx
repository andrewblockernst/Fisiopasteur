"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/componentes/ui";

export interface EntityListCardField {
  label: string;
  value: ReactNode;
  /** Si es true, el campo ocupa ambas columnas del grid. */
  fullWidth?: boolean;
}

export interface EntityListCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Slot a la derecha del título (típicamente un Badge de estado). */
  badge?: ReactNode;
  /** Si se pasa, se renderiza un dot circular del color a la izquierda del título. */
  colorDot?: string | null;
  /** Indicador de carga (e.g. spinner) que se muestra junto al badge. */
  leadingIndicator?: ReactNode;
  fields?: EntityListCardField[];
  actions?: ReactNode;
  inactive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Card unificada para listados de entidades (pacientes, especialistas, etc.)
 * en el rango `md..<lg`. Conserva un layout consistente: header (título +
 * subtítulo + badge), grid de campos y zona de acciones.
 */
export function EntityListCard({
  title,
  subtitle,
  badge,
  colorDot,
  leadingIndicator,
  fields,
  actions,
  inactive,
  onClick,
  className,
}: EntityListCardProps) {
  return (
    <Card
      padding="md"
      interactive={!!onClick}
      onClick={onClick}
      className={cn(
        "hover:shadow-md transition-shadow",
        inactive && "opacity-60",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {colorDot && (
              <span
                aria-hidden="true"
                className="w-3 h-3 rounded-full shrink-0 border border-border"
                style={{ backgroundColor: colorDot }}
              />
            )}
            <h3 className="font-semibold text-foreground text-lg truncate">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {(leadingIndicator || badge) && (
          <div className="flex items-center gap-2 shrink-0">
            {leadingIndicator}
            {badge}
          </div>
        )}
      </div>

      {fields && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
          {fields.map((field, idx) => (
            <div
              key={idx}
              className={cn("min-w-0", field.fullWidth && "col-span-2")}
            >
              <span className="text-muted-foreground font-medium">
                {field.label}:
              </span>
              <div className="text-foreground truncate">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {actions && (
        <div
          className="flex gap-2 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </Card>
  );
}
