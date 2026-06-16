"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  obtenerKPIsConHistorial,
  obtenerOcupacionBoxes,
  obtenerProximosTurnos,
  type PeriodoFiltro,
  type ProximoTurno,
  type OcupacionBoxResumen,
  type OcupacionTurno,
  type OcupacionRango,
} from "@/lib/actions/dashboard.action";

// Query keys del dashboard de /inicio.
export const dashboardKeys = {
  all: ["dashboard"] as const,
  kpis: (params: {
    periodo: PeriodoFiltro;
    especialistaId?: string;
    referencia?: string;
  }) => [...dashboardKeys.all, "kpis", params] as const,
  proximos: () => [...dashboardKeys.all, "proximos"] as const,
  ocupacion: (periodo: PeriodoFiltro) =>
    [...dashboardKeys.all, "ocupacion", { periodo }] as const,
};

// KPIs: depende de periodo, especialista y referencia (navegación temporal).
export function useKPIs(params: {
  periodo: PeriodoFiltro;
  especialistaId?: string;
  referencia?: string;
  enabled?: boolean;
}) {
  const { periodo, especialistaId, referencia, enabled = true } = params;
  return useQuery({
    queryKey: dashboardKeys.kpis({ periodo, especialistaId, referencia }),
    queryFn: async () => {
      const res = await obtenerKPIsConHistorial(periodo, especialistaId, referencia);
      if (!res.success) throw new Error(res.error);
      return res; // { datos, total, anterior }
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 min
    enabled,
  });
}

// Próximos turnos del día (sin filtros). Hidratable con initialData del RSC.
export function useProximosTurnos(options?: { initialData?: ProximoTurno[] }) {
  return useQuery({
    queryKey: dashboardKeys.proximos(),
    queryFn: () => obtenerProximosTurnos(),
    initialData: options?.initialData,
    staleTime: 60 * 1000,
  });
}

// Ocupación de boxes. Hidratable; placeholderData mantiene la data anterior
// (con su período) durante el refetch al cambiar de tab.
export function useOcupacionBoxes(
  periodo: PeriodoFiltro,
  options?: {
    initialData?: {
      periodo: PeriodoFiltro;
      rango: OcupacionRango;
      boxes: OcupacionBoxResumen[];
      turnos: OcupacionTurno[];
    };
  },
) {
  return useQuery({
    queryKey: dashboardKeys.ocupacion(periodo),
    queryFn: async () => {
      const res = await obtenerOcupacionBoxes(periodo);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    initialData:
      options?.initialData && options.initialData.periodo === periodo
        ? options.initialData
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

// Invalida todas las queries del dashboard (lo llama el realtime bridge).
export function useInvalidateDashboard() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: dashboardKeys.all });
}
