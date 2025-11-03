'use client';

import { useEffect, useState } from 'react';
import { KPIsCardsConFiltro } from '@/componentes/dashboard/kpis-cards-con-filtro';
import { ProximosTurnosDia } from '@/componentes/dashboard/proximos-turnos-dia';
import { OcupacionBoxes } from '@/componentes/dashboard/ocupacion-boxes';
import {
  obtenerProximosTurnos,
  obtenerOcupacionBoxes,
  type ProximoTurno,
  type OcupacionBox,
} from '@/lib/actions/dashboard.action';

export default function Inicio() {
  const [proximosTurnos, setProximosTurnos] = useState<ProximoTurno[]>([]);
  const [ocupacionBoxes, setOcupacionBoxes] = useState<OcupacionBox[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [turnosData, boxesData] = await Promise.all([
          obtenerProximosTurnos(),
          obtenerOcupacionBoxes(),
        ]);

        setProximosTurnos(turnosData);
        setOcupacionBoxes(boxesData);
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();

    // Recargar cada 5 minutos
    const intervalo = setInterval(cargarDatos, 5 * 60 * 1000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="min-h-screen text-black bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bienvenido a Fisiopasteur</h1>
          <p className="text-gray-600 mt-2">Panel de control para especialistas y administradores</p>
        </div>

        {/* Fila 1: KPIs con Filtro */}
        <div className="mb-8">
          <KPIsCardsConFiltro loading={loading} />
        </div>

        {/* Fila 2: Próximos Turnos + Ocupación de Boxes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProximosTurnosDia turnos={proximosTurnos} isLoading={loading} />
          <OcupacionBoxes boxes={ocupacionBoxes} isLoading={loading} />
        </div>

        {/* Nota de actualización */}
        <div className="text-center text-sm text-gray-500 mt-8">
          ⚡ Los datos se actualizan automáticamente cada 5 minutos
        </div>
      </div>
    </div>
  );
}
