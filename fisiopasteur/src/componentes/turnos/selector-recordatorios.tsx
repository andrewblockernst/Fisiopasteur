"use client";

import { useState } from "react";
import {
  OPCIONES_RECORDATORIO,
  type TipoRecordatorio,
} from "@/lib/utils/whatsapp.utils";
import { Clock, Bell, X, ChevronDown } from "lucide-react";
import { Badge } from "@/componentes/ui";
import { cn } from "@/lib/utils";

interface SelectorRecordatoriosProps {
  recordatoriosSeleccionados: TipoRecordatorio[];
  onRecordatoriosChange: (recordatorios: TipoRecordatorio[]) => void;
  className?: string;
}

/**
 * Selector multi-select para recordatorios automáticos.
 * Mantiene UI propia (dropdown custom) porque shadcn Select es single-select.
 * Migrado a tokens + Badge para chips (Fase 3.2).
 */
export function SelectorRecordatorios({
  recordatoriosSeleccionados,
  onRecordatoriosChange,
  className = "",
}: SelectorRecordatoriosProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleRecordatorio = (tipo: TipoRecordatorio) => {
    onRecordatoriosChange(
      recordatoriosSeleccionados.includes(tipo)
        ? recordatoriosSeleccionados.filter((r) => r !== tipo)
        : [...recordatoriosSeleccionados, tipo],
    );
  };

  const obtenerTextoSeleccion = () => {
    if (recordatoriosSeleccionados.length === 0) return "Sin recordatorios";
    if (recordatoriosSeleccionados.length === 1)
      return OPCIONES_RECORDATORIO[recordatoriosSeleccionados[0]].label;
    return `${recordatoriosSeleccionados.length} recordatorios`;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground text-left",
          "flex items-center justify-between gap-2 transition-colors",
          "hover:border-muted-foreground/50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand",
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">{obtenerTextoSeleccion()}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {recordatoriosSeleccionados.length > 0 && (
            <Badge variant="brand" size="sm" pill>
              {recordatoriosSeleccionados.length}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al click afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-20 max-h-60 overflow-y-auto"
          >
            <div className="p-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pt-2 pb-1">
                Recordatorios automáticos
              </div>

              {Object.entries(OPCIONES_RECORDATORIO).map(([tipo, config]) => {
                const isSelected = recordatoriosSeleccionados.includes(
                  tipo as TipoRecordatorio,
                );
                return (
                  <button
                    key={tipo}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleRecordatorio(tipo as TipoRecordatorio)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors flex items-center justify-between gap-2",
                      isSelected
                        ? "bg-brand text-brand-foreground"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {config.label}
                    </span>
                    {isSelected && <X className="w-4 h-4" />}
                  </button>
                );
              })}

              {recordatoriosSeleccionados.length > 0 && (
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => onRecordatoriosChange([])}
                    className="w-full text-left px-3 py-2 rounded-sm text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Quitar todos los recordatorios
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Chips */}
      {recordatoriosSeleccionados.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recordatoriosSeleccionados.map((tipo) => (
            <Badge
              key={tipo}
              variant="brand"
              size="md"
              pill
              className="gap-1 pr-1"
            >
              {OPCIONES_RECORDATORIO[tipo].label}
              <button
                type="button"
                onClick={() => toggleRecordatorio(tipo)}
                aria-label={`Quitar ${OPCIONES_RECORDATORIO[tipo].label}`}
                className="rounded-full p-0.5 hover:bg-white/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default SelectorRecordatorios;
