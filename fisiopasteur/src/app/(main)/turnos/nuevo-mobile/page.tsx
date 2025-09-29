import { Suspense } from 'react';
import NuevoTurnoMobilePage from '@/componentes/turnos/nuevo-turno-mobile-page';

export default function NuevoTurnoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 flex items-center justify-center">Cargando...</div>}>
      <NuevoTurnoMobilePage />
    </Suspense>
  );
}