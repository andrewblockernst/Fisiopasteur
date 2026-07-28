"use client";

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FiltrosTurnos from './filtros-turnos';
import TablaTurnos from './listado-turnos';
import TurnosMobileList from './turnos-mobile-list';
import PaginacionBar from '@/componentes/paginacion/paginacion-bar';
import { PageHeader } from '@/componentes/ui';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import UnifiedSkeletonLoader from '@/componentes/unified-skeleton-loader';
import type { TurnoConDetalles } from "@/stores/turno-store";
import type { Tables, EspecialistaWithSpecialties } from "@/types";
import { useInvalidateTurnos, useTurnosPaginated } from '@/hooks/useTurnosQuery';
import { ESTADO_COLORES } from '@/lib/utils/turno-acciones';

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
  // < lg → vista compacta (drawer filter + cards o tabla según md); ≥ lg → filter-bar desktop.
  const isCompact = useMediaQuery('(max-width: 1023.98px)');
  const allowedPageSizes = [10, 20, 30, 50];

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
      search: searchParams.get('search') ?? undefined,
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

  // ⏰ La actualización automática de turnos a "pendiente" ahora se ejecuta
  // server-side mediante el cron en /api/cron/turnos-pendientes (vercel.json).
  // Se elimina el polling del cliente para que no dependa de tener la página abierta.

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

  if (isCompact) {
    return <TurnosMobileList {...(mobileListProps as any)} />;
  }

  // ✅ Skeleton de página completa (header + filtros + tabla) en la carga inicial
  if (paginatedLoading && !paginatedTurnos) {
    return <UnifiedSkeletonLoader type="table" />;
  }

  // Vista desktop
  return (
    <div className="h-[calc(100dvh-5rem)] lg:h-[100dvh] flex flex-col text-foreground overflow-hidden">
      {/* Contenido Principal */}
      <div className="flex-1 min-h-0 flex flex-col mx-auto w-full bg-background sm:px-6 sm:pb-6 sm:pt-2 lg:px-8 sm:flex sm:flex-col sm:h-[calc(100vh-3rem)]">
        {/* Header de página + leyenda en la misma fila (solo desktop) */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <PageHeader title="Turnos" />
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Referencias:</span>
            {ESTADO_COLORES.map(({ estado, label, swatchClass }) => (
              <span key={estado} className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-block h-4 w-6 rounded-sm ${swatchClass}`}
                />
                <span className="capitalize">{label}</span>
              </span>
            ))}
          </div>
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
            isMobile={false}
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