"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FiltrosTurnos from './filtros-turnos';
import TablaTurnos from './listado-turnos';
import TurnosMobileList from './turnos-mobile-list';
import PaginacionBar from '@/componentes/paginacion/paginacion-bar';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import UnifiedSkeletonLoader from '@/componentes/unified-skeleton-loader';
import type { TurnoConDetalles } from "@/stores/turno-store";
import type { Tables, EspecialistaWithSpecialties } from "@/types";
import { actualizarTurnosPendientes } from '@/lib/actions/turno.action';
import { useInvalidateTurnos, useTurnosPaginated } from '@/hooks/useTurnosQuery';

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
    page: number;
    page_size: number;
    paciente_id?: number;
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
  const allowedPageSizes = [10, 20, 30, 50];
  // const [isInitialLoad, setIsInitialLoad] = useState(true);

  const filters = useMemo(() => {
    // Helper para obtener todos los valores de un parámetro
    const getAllParams = (key: string): string[] => {
      return searchParams.getAll(key).filter(v => v && v.length > 0);
    };

    const especialistaIds = getAllParams('especialistas');
    const especialidadIds = getAllParams('especialidades');
    const estados = getAllParams('estados');

    const pageRaw = Number(searchParams.get('page') ?? initialFilters.page ?? 1);
    const pageSizeRaw = Number(searchParams.get('page_size') ?? initialFilters.page_size ?? 20);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const page_size = allowedPageSizes.includes(pageSizeRaw) ? pageSizeRaw : 20;

    return {
      fecha_desde: searchParams.get('desde') ?? initialFilters.fecha_desde,
      fecha_hasta: searchParams.get('hasta') ?? initialFilters.fecha_hasta,
      especialista_ids: especialistaIds.length > 0 ? especialistaIds : initialFilters.especialista_ids,
      especialidad_ids: especialidadIds.length > 0 ? especialidadIds : initialFilters.especialidad_ids,
      estados: estados.length > 0 ? estados : initialFilters.estados,
      page,
      page_size,
      paciente_id: (() => {
        const pacienteId = searchParams.get('paciente_id');
        return pacienteId ? parseInt(pacienteId) : initialFilters.paciente_id;
      })(),
    };
  }, [searchParams, initialFilters]);

  const { data: paginatedTurnos, isLoading: paginatedLoading } = useTurnosPaginated({
    filters,
    enabled: true,
    refetchOnMount: true,
  });

  const turnos = paginatedTurnos?.items ?? [];
  const turnosLoading = paginatedLoading;
  const pagination = paginatedTurnos?.pagination;
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

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // Actualizar fecha preservando el resto de filtros activos.
    const params = new URLSearchParams(searchParams.toString());
    params.set('desde', newDate);
    params.set('hasta', newDate);
    params.set('page', '1');
    router.push(`/turnos?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (!pagination) return;
    const bounded = Math.max(1, Math.min(newPage, pagination.totalPages));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(bounded));
    params.set('page_size', String(filters.page_size));
    router.push(`/turnos?${params.toString()}`);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page_size', String(newPageSize));
    params.set('page', '1');
    router.push(`/turnos?${params.toString()}`);
  };

  const handleTurnoCreated = () => {
    // ✅ Invalidar caché de React Query en lugar de router.refresh()
    invalidateTurnos();
  };

  const mobileListProps = {
    turnos,
    fecha: selectedDate,
    onDateChange: handleDateChange,
    onTurnoCreated: handleTurnoCreated,
    invalidateTurnos,
    especialistas,
    especialidades,
    loadingTurnos: turnosLoading,
    initialFilters,
    activeFilters: filters,
    pagination,
    allowedPageSizes,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
  };

  if (isMobile) {
    return <TurnosMobileList {...(mobileListProps as any)} />;
  }

  // Vista desktop
  return (
    <div className="min-h-screen text-black">
      {/* Contenido Principal */}
      <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8 flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
        {/* Desktop Header
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Turnos</h2>
        </div> */}

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

        {pagination && (
          <div className="hidden sm:block pt-3">
            <PaginacionBar
              pagination={pagination}
              visibleCount={turnos.length}
              pageSize={filters.page_size}
              allowedPageSizes={allowedPageSizes}
              itemLabel="turnos"
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              loading={turnosLoading}
              showSummary
              showFirstLastJump
            />
          </div>
        )}
      </div>
    </div>
  );
}