"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconButton } from "./button";

/**
 * PageHeader — encabezado consistente para todas las páginas.
 *
 * Comportamiento responsive:
 *  - Mobile (<sm): sticky-top con [back] [title centrado] [actions].
 *    El bg es semi-transparente con backdrop blur para superponerse al contenido al hacer scroll.
 *  - Desktop (sm+): título + descripción a la izquierda, actions a la derecha.
 *
 * Uso:
 * ```tsx
 * <PageHeader
 *   title="Turnos"
 *   description="Gestioná los turnos del día"
 *   backHref="/inicio"
 *   actions={<Button>Nuevo</Button>}
 * />
 * ```
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Si está, muestra botón "back" en mobile que navega a esta ruta. */
  backHref?: string;
  /** Slot para botones de acción (alineados a la derecha en desktop, debajo del título en mobile). */
  actions?: React.ReactNode;
  /** Slot para breadcrumbs u otros elementos arriba del título. */
  eyebrow?: React.ReactNode;
  className?: string;
  /** Stack para acciones en mobile: 'inline' (al lado del título) o 'below' (debajo, full width). */
  mobileActionsLayout?: "inline" | "below";
  /** Si true, muestra el título/descripcion en desktop (por defecto se oculta ya que el navbar ya lo indica). */
  showTitle?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  backHref,
  actions,
  eyebrow,
  className,
  mobileActionsLayout = "inline",
  showTitle = false,
}) => {
  const router = useRouter();
  const showMobileHeader = !!backHref || mobileActionsLayout === "inline";

  return (
    <>
      {/* Mobile sticky header — visible solo si hay back o actions inline */}
      {showMobileHeader && (
        <header
          className={cn(
            "sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2 sm:hidden",
            className,
          )}
        >
          <div className="flex items-center gap-2">
            {backHref ? (
              <IconButton
                aria-label="Volver"
                variant="ghost"
                size="sm"
                icon={<ArrowLeft className="h-5 w-5" />}
                onClick={() => router.push(backHref)}
                className="-ml-2"
              />
            ) : (
              <span className="w-9" aria-hidden />
            )}
            <h1 className="flex-1 text-base font-semibold text-center truncate">
              {title}
            </h1>
            {mobileActionsLayout === "inline" && actions ? (
              <div className="flex items-center gap-1 [&>*]:shrink-0">
                {actions}
              </div>
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </div>
        </header>
      )}

      {/* Desktop header + (mobile below header si mobileActionsLayout === 'below') */}
      <div
        className={cn(
          "px-4 sm:px-6 lg:px-8 pt-0 sm:pt-1 pb-2 sm:pb-1",
          showMobileHeader && "hidden sm:block",
          className,
        )}
      >
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className={cn("min-w-0", !showTitle && "hidden")}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Mobile actions below — cuando elegimos no inline */}
      {mobileActionsLayout === "below" && actions && (
        <div className="sm:hidden px-4 py-2 flex flex-wrap gap-2 border-b border-border">
          {actions}
        </div>
      )}
    </>
  );
};

export { PageHeader };
