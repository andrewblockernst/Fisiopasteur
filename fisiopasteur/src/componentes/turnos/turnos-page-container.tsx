"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FiltrosTurnos from './filtros-turnos';
import TablaTurnos from './listado-turnos';
import TurnosMobileList from './turnos-mobile-list';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { TurnoWithRelations, EspecialistaWithSpecialties, Tables } from "@/types/database.types";

interface TurnosPageContainerProps {
  turnos: TurnoWithRelations[];
  especialistas: EspecialistaWithSpecialties[];
  especialidades: Tables<"especialidad">[];
  boxes: Tables<"box">[];
  initialFilters: {
    fecha_desde: string;
    fecha_hasta: string;
    especialista_id?: string;
    especialidad_id?: string;
    estado?: string;
  };
}

export default function TurnosPageContainer({
  turnos,
  especialistas,
  especialidades,
  boxes,
  initialFilters
}: TurnosPageContainerProps) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedDate, setSelectedDate] = useState(initialFilters.fecha_desde);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // Actualizar URL con la nueva fecha
    const params = new URLSearchParams();
    params.set('desde', newDate);
    params.set('hasta', newDate);
    router.push(`/turnos?${params.toString()}`);
  };

  const handleTurnoCreated = () => {
    // Recargar la página para mostrar los nuevos turnos
    router.refresh();
  };

  if (isMobile) {
    return (
      <TurnosMobileList 
        turnos={turnos}
        fecha={selectedDate}
        onDateChange={handleDateChange}
        onTurnoCreated={handleTurnoCreated}
      />
    );
  }

  // Vista desktop
  return (
    <div className="sm:container sm:p-6 text-black">
      <h1 className="text-2xl font-bold mb-4">Turnos</h1>
      <FiltrosTurnos
        especialistas={especialistas}
        especialidades={especialidades}
        boxes={boxes}
        initial={initialFilters}
      />
      <TablaTurnos turnos={turnos} />
    </div>
  );
}