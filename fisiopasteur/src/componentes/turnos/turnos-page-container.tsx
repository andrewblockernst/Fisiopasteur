"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FiltrosTurnos from './filtros-turnos';
import TablaTurnos from './listado-turnos';
import TurnosMobileList from './turnos-mobile-list';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import UnifiedSkeletonLoader from '@/componentes/unified-skeleton-loader';
import type { TurnoConDetalles } from "@/stores/turno-store";
import type { Tables, EspecialistaWithSpecialties } from "@/types";
import { actualizarTurnosVencidos } from '@/lib/actions/turno.action';

interface TurnosPageContainerProps {
  turnos: TurnoConDetalles[];
  especialistas: EspecialistaWithSpecialties[];
  especialidades: Tables<"especialidad">[];
  boxes: Tables<"box">[];
  loading?: boolean;
  initialFilters: {
    fecha_desde: string;
    fecha_hasta: string;
    especialista_id?: string;
    especialidad_id?: number;
    estado?: string;
  };
}

export default function TurnosPageContainer({
  turnos,
  especialistas,
  especialidades,
  boxes,
  loading = false,
  initialFilters
}: TurnosPageContainerProps) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedDate, setSelectedDate] = useState(initialFilters.fecha_desde);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // ⏰ Efecto para verificar y actualizar turnos vencidos automáticamente
  useEffect(() => {
    const verificarTurnosVencidos = async () => {
      try {
        const resultado = await actualizarTurnosVencidos();
        
        if (resultado.success && resultado.data && resultado.data.length > 0) {
          router.refresh();
        }
      } catch (error) {
        console.error('❌ Error verificando turnos vencidos:', error);
      }
    };

    // Verificar al cargar el componente
    verificarTurnosVencidos();

    // Verificar cada 5 minutos (300000 ms)
    const intervalo = setInterval(verificarTurnosVencidos, 300000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalo);
  }, [router]);

  // Efecto para mostrar skeleton loader en la carga inicial
  useEffect(() => {
    // Mostrar skeleton por 300ms en la primera carga
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

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

  // Mostrar skeleton loader durante la carga inicial o si loading está activo
  if (loading || isInitialLoad) {
    return (
      <UnifiedSkeletonLoader
        type={isMobile ? "list" : "table"}
        rows={5}
        columns={6}
        showHeader={true}
        showFilters={true}
        showSearch={false}
      />
    );
  }

  if (isMobile) {
    return (
      <TurnosMobileList 
        turnos={turnos}
        fecha={selectedDate}
        onDateChange={handleDateChange}
        onTurnoCreated={handleTurnoCreated}
        especialistas={especialistas}
        especialidades={especialidades}
        initialFilters={initialFilters}
      />
    );
  }

  // Vista desktop
  return (
    <div className="min-h-screen text-black">
      {/* Contenido Principal */}
      <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Turnos</h2>
        </div>

        {/* Filtros y Búsqueda - Solo Desktop */}
        <div className="hidden sm:block rounded-lg">
          <FiltrosTurnos
            especialistas={especialistas}
            especialidades={especialidades}
            boxes={boxes}
            initial={initialFilters}
          />
        </div>

        <TablaTurnos turnos={turnos} />
      </div>
    </div>
  );
}