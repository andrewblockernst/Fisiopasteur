"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/componentes/ui";
import { cn } from "@/lib/utils";

interface Especialista {
  id_usuario: string;
  nombre: string;
  apellido: string;
  color?: string;
}

interface EspecialistaMultiSelectProps {
  especialistas: Especialista[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  /** Clases extra para el botón trigger */
  className?: string;
  /** Tamaño compacto para mobile */
  compact?: boolean;
  /** Si true, el usuario no puede cambiar la selección (rol especialista) */
  disabled?: boolean;
}

/**
 * Dropdown multi-select con checkboxes para filtrar por especialistas.
 * Replica el patrón de `filtros-turnos.tsx` para mantener coherencia visual.
 */
export function EspecialistaMultiSelect({
  especialistas,
  seleccionados,
  onChange,
  className,
  compact = false,
  disabled = false,
}: EspecialistaMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = useCallback(
    (id: string) => {
      const next = seleccionados.includes(id)
        ? seleccionados.filter((s) => s !== id)
        : [...seleccionados, id];
      onChange(next);
    },
    [seleccionados, onChange],
  );

  const todosSeleccionados =
    seleccionados.length === 0 || seleccionados.length === especialistas.length;

  const getLabel = () => {
    if (todosSeleccionados) return "Todos los especialistas";
    if (seleccionados.length === 1) {
      const esp = especialistas.find((e) => e.id_usuario === seleccionados[0]);
      if (esp) return `${esp.apellido}, ${esp.nombre}`;
      return "1 seleccionado";
    }
    return `${seleccionados.length} especialistas`;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-1.5 rounded-md border border-input bg-background text-foreground transition-colors",
          "hover:border-muted-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          compact
            ? "h-8 px-2 text-sm w-full"
            : "h-10 px-3 py-2 text-sm",
        )}
      >
        <span className="truncate">{getLabel()}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 transition-transform text-muted-foreground",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable
          className={cn(
            "absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto p-1",
            compact
              ? "w-full min-w-[200px]"
              : "min-w-[220px]",
          )}
        >
          {/* Opción "Todos" */}
          <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer transition-colors border-b border-border mb-1">
            <Checkbox
              size="sm"
              checked={todosSeleccionados}
              onCheckedChange={() => onChange([])}
            />
            <span className="text-sm font-medium">Todos los especialistas</span>
          </label>

          {especialistas.map((esp) => {
            const checked = seleccionados.includes(esp.id_usuario);
            return (
              <label
                key={esp.id_usuario}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer transition-colors"
              >
                <Checkbox
                  size="sm"
                  checked={checked}
                  onCheckedChange={() => handleToggle(esp.id_usuario)}
                />
                {esp.color && (
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: esp.color }}
                  />
                )}
                <span className="text-sm">
                  {esp.apellido}, {esp.nombre}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
