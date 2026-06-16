"use client";

import { useState } from "react";
import {
  type OcupacionTurno,
  type OcupacionBoxResumen,
  type OcupacionRango,
  type PeriodoFiltro,
} from "@/lib/actions/dashboard.action";
import { OcupacionBoxes } from "./ocupacion-boxes";
import { useOcupacionBoxes } from "@/hooks/useDashboardQuery";
import { cn } from "@/lib/utils";

interface Props {
  initial: {
    boxes: OcupacionBoxResumen[];
    turnos: OcupacionTurno[];
    rango: OcupacionRango;
  };
}

const filtros: { label: string; value: PeriodoFiltro }[] = [
  { label: "Hoy", value: "hoy" },
  { label: "Esta semana", value: "semana" },
  { label: "Este mes", value: "mes" },
];

export function OcupacionBoxesWidget({ initial }: Props) {
  // Período seleccionado en los tabs (UI inmediata).
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoFiltro>("semana");

  const { data, isFetching } = useOcupacionBoxes(periodoSeleccionado, {
    initialData: { periodo: "semana", ...initial },
  });

  // Mostrar skeleton solo cuando el período pedido aún no coincide con la
  // data en mano (cubre el gap del refetch al cambiar de tab — placeholderData
  // mantiene la data vieja con su propio período, así el heatmap es coherente).
  const cargandoCambioDePeriodo =
    isFetching && data?.periodo !== periodoSeleccionado;

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Período de ocupación"
        className="flex gap-0.5 bg-muted rounded-md p-0.5 w-fit"
      >
        {filtros.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={periodoSeleccionado === f.value}
            onClick={() => setPeriodoSeleccionado(f.value)}
            className={cn(
              "h-7 px-2.5 sm:px-3 rounded-sm text-xs sm:text-sm font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              periodoSeleccionado === f.value
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <OcupacionBoxes
        boxes={data?.boxes ?? []}
        turnos={data?.turnos ?? []}
        rango={data?.rango ?? { inicio: "", fin: "", dias: 0 }}
        periodo={data?.periodo ?? "semana"}
        isLoading={cargandoCambioDePeriodo}
      />
    </div>
  );
}
