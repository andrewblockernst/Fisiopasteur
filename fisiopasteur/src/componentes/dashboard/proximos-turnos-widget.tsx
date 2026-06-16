"use client";

import { type ProximoTurno } from "@/lib/actions/dashboard.action";
import { ProximosTurnosDia } from "./proximos-turnos-dia";
import { useProximosTurnos } from "@/hooks/useDashboardQuery";

interface Props {
  initial: ProximoTurno[];
}

export function ProximosTurnosWidget({ initial }: Props) {
  const { data, isFetching } = useProximosTurnos({ initialData: initial });
  return (
    <ProximosTurnosDia
      turnos={data ?? []}
      isLoading={isFetching && (data?.length ?? 0) === 0}
    />
  );
}
