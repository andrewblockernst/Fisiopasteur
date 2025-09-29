import { obtenerTurno } from "@/lib/actions/turno.action";
import TurnoDetailMobile from "@/componentes/turnos/turno-detail-mobile";
import { notFound } from "next/navigation";

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
  
  if (!resultado.success || !resultado.data) {
    notFound();
  }

  return <TurnoDetailMobile turno={resultado.data} />;
}