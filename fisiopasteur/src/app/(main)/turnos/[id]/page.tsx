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
  
  if (!resultado.success || !resultado.data) {
    notFound();
  }

  const turno = resultado.data;

  // Calcular número de talonario
  let numeroTalonario: string | null = null;
  
  if (turno.id_paciente && turno.id_especialidad) {
    // Obtener todos los turnos del paciente
    const resultadoTurnos = await obtenerTurnos({
      paciente_id: turno.id_paciente
    });

    if (resultadoTurnos.success && resultadoTurnos.data) {
      // Filtrar por misma especialidad y no cancelados
      const turnosPaquete = resultadoTurnos.data
        .filter(t => 
          t.id_especialidad === turno.id_especialidad &&
          t.estado !== 'cancelado'
        )
        .sort((a, b) => {
          const fechaA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
          const fechaB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
          return fechaA.getTime() - fechaB.getTime();
        });

      const total = turnosPaquete.length;

      // Solo mostrar si hay más de 1 turno
      if (total > 1) {
        const posicion = turnosPaquete.findIndex(t => t.id_turno === turnoId) + 1;
        numeroTalonario = `${posicion}/${total}`;
      }
    }
  }

  return <TurnoDetailMobile turno={turno as TurnoWithRelations} numeroTalonario={numeroTalonario} />;
}