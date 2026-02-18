"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FiltrosTurnos from './filtros-turnos';
import TablaTurnos from './listado-turnos';
import TurnosMobileList from './turnos-mobile-list';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import UnifiedSkeletonLoader from '@/componentes/unified-skeleton-loader';
import type { TurnoConDetalles } from "@/stores/turno-store";
import type { Tables, EspecialistaWithSpecialties } from "@/types";
import { actualizarTurnosPendientes } from '@/lib/actions/turno.action';
import { useTurnos, useInvalidateTurnos } from '@/hooks/useTurnosQuery';

interface TurnosPageContainerProps {
  // initialTurnos: TurnoConDetalles[]; // ✅ Ahora son datos iniciales del servidor
  especialistas: EspecialistaWithSpecialties[];
  especialidades: Tables<"especialidad">[];
  boxes: Tables<"box">[];
  initialFilters: {
    fecha_desde: string;
    fecha_hasta: string;
    especialista_ids: string[];
    especialidad_ids: string[];
    estados: string[];
  };
}

export default function TurnosPageContainer({
  // initialTurnos,
  especialistas,
  especialidades,
  boxes,
  initialFilters
}: TurnosPageContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedDate, setSelectedDate] = useState(initialFilters.fecha_desde);
  // const [isInitialLoad, setIsInitialLoad] = useState(true);

  const filters = useMemo(() => {
    // Helper para obtener todos los valores de un parámetro
    const getAllParams = (key: string): string[] => {
      return searchParams.getAll(key).filter(v => v && v.length > 0);
    };

    const especialistaIds = getAllParams('especialistas');
    const especialidadIds = getAllParams('especialidades');
    const estados = getAllParams('estados');

    return {
      fecha_desde: searchParams.get('desde') ?? initialFilters.fecha_desde,
      fecha_hasta: searchParams.get('hasta') ?? initialFilters.fecha_hasta,
      especialista_ids: especialistaIds.length > 0 ? especialistaIds : initialFilters.especialista_ids,
      especialidad_ids: especialidadIds.length > 0 ? especialidadIds : initialFilters.especialidad_ids,
      estados: estados.length > 0 ? estados : initialFilters.estados,
    };
  }, [searchParams, initialFilters]);

  // const shouldUseInitialData = useMemo(() => {
  //   return (
  //     filters.fecha_desde === initialFilters.fecha_desde &&
  //     filters.fecha_hasta === initialFilters.fecha_hasta &&
  //     (filters.especialista_id ?? '') === (initialFilters.especialista_id ?? '') &&
  //     (filters.especialidad_id ?? null) === (initialFilters.especialidad_id ?? null) &&
  //     (filters.estado ?? '') === (initialFilters.estado ?? '')
  //   );
  // }, [filters, initialFilters]);

  // ✅ React Query con datos iniciales del servidor (SSR + Client Cache)
  const { data: turnos = [], isLoading: turnosLoading } = useTurnos({
    filters,
    // initialData: shouldUseInitialData ? initialTurnos : undefined
  });
  const invalidateTurnos = useInvalidateTurnos();

  useEffect(() => {
    if (filters.fecha_desde) {
      setSelectedDate(filters.fecha_desde);
    }
  }, [filters.fecha_desde]);

  // ⏰ Efecto para verificar y actualizar turnos pendientes automáticamente
  useEffect(() => {
    const verificarTurnosPendientes = async () => {
      try {
        const resultado = await actualizarTurnosPendientes();
        
        if (resultado.success && resultado.data && resultado.data.length > 0) {
          console.log(`✅ ${resultado.data.length} turnos actualizados a pendiente`);
          // ✅ Invalidar caché de React Query en lugar de router.refresh()
          invalidateTurnos();
        }
      } catch (error) {
        console.error('❌ Error verificando turnos pendientes:', error);
      }
    };

    // Verificar al cargar el componente
    verificarTurnosPendientes();
    // Verificar cada 5 minutos (300000 ms)
    const intervalo = setInterval(verificarTurnosPendientes, 300000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalo);
  }, [invalidateTurnos]);

  // Efecto para mostrar skeleton loader en la carga inicial
  // useEffect(() => {
  //   // Mostrar skeleton por 300ms en la primera carga
  //   const timer = setTimeout(() => {
  //     setIsInitialLoad(false);
  //   }, 300);
    
  //   return () => clearTimeout(timer);
  // }, []);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // Actualizar URL con la nueva fecha
    const params = new URLSearchParams();
    params.set('desde', newDate);
    params.set('hasta', newDate);
    router.push(`/turnos?${params.toString()}`);
  };

  const handleTurnoCreated = () => {
    // ✅ Invalidar caché de React Query en lugar de router.refresh()
    invalidateTurnos();
  };

  // Mostrar skeleton loader durante la carga inicial o mientras carga
  // if (turnosLoading /* || isInitialLoad */) {
  //   return (
  //     <UnifiedSkeletonLoader
  //       type={isMobile ? "list" : "table"}
  //       rows={5}
  //       columns={6}
  //       showHeader={true}
  //       showFilters={true}
  //       showSearch={false}
  //     />
  //   );
  // }

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
      <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8 flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Turnos</h2>
        </div>

        {/* Filtros y Búsqueda - Solo Desktop */}
        <div className="hidden sm:block rounded-lg mb-4">
          <FiltrosTurnos
            especialistas={especialistas}
            especialidades={especialidades}
            boxes={boxes}
            initial={initialFilters}
            onTurnoCreated={handleTurnoCreated}
          />
        </div>

        <div className="flex-1 min-h-0">
          <TablaTurnos 
            turnos={turnos}
            invalidateTurnos={invalidateTurnos}
            turnosLoading={turnosLoading}
            isMobile={isMobile}
          />
        </div>
      </div>
    </div>
  );
}