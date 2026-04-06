import { obtenerTurno, obtenerTurnos } from "@/lib/actions/turno.action";
import TurnoDetailMobile from "@/componentes/turnos/turno-detail-mobile";
import { notFound } from "next/navigation";
import type { TurnoWithRelations } from "@/types";

interface TurnoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TurnoDetailPage({ params }: TurnoDetailPageProps) {
  const { id } = await params;
  
  const turnoId = parseInt(id);
  if (isNaN(turnoId)) {
    notFound();
  }

  const resultado = await obtenerTurno(turnoId);
  
  if (!resultado.success) {
    notFound();
  }

  const turno = resultado.data as TurnoWithRelations;
  
  if (!turno) {
    notFound();
  }

  // Calcular número de talonario
  let numeroTalonario: string | undefined = turno.numero_en_grupo ? `${turno.numero_en_grupo}/${turno.grupo_tratamiento?.cantidad_turnos_planificados}` : undefined;

  return <TurnoDetailMobile turno={turno as TurnoWithRelations} numeroTalonario={numeroTalonario} />;
}