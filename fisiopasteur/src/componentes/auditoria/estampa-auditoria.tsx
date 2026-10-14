"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerEstampaAuditoria } from "@/lib/actions/auditoria.action";
import type { TablaAuditada } from "@/lib/auditoria/estampa";
import { dayjs } from "@/lib/dayjs";

const fmt = (iso: string) => dayjs(iso).tz().format("DD/MM/YYYY HH:mm");

/** Linea discreta "Creado por X · fecha · Editado por Y · fecha". Sin historial no renderiza nada. */
export function EstampaAuditoria({ tabla, id }: { tabla: TablaAuditada; id: string | number | null | undefined }) {
  const registroId = id == null ? "" : String(id);
  const { data } = useQuery({
    queryKey: ["auditoria", tabla, registroId],
    enabled: registroId !== "",
    staleTime: 0,
    queryFn: async () => {
      const r = await obtenerEstampaAuditoria(tabla, registroId);
      return r.success ? (r.data ?? {}) : {};
    },
  });

  const partes = [
    data?.creado && `Creado por ${data.creado.nombre} · ${fmt(data.creado.fecha)}`,
    data?.editado && `Editado por ${data.editado.nombre} · ${fmt(data.editado.fecha)}`,
  ].filter(Boolean);
  if (partes.length === 0) return null;

  return <p className="text-xs text-gray-500">{partes.join(" · ")}</p>;
}
