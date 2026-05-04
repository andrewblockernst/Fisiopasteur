'use client';

import { useQuery, useQueryClient, keepPreviousData, type QueryKey } from '@tanstack/react-query';
import { obtenerTurnosConFiltros } from '@/lib/actions/turno.action';
import type { TurnoConDetalles } from '@/stores/turno-store';
import { dayjs } from '@/lib/dayjs';

type PilatesTurnosFilters = Record<string, any>;

// Cantidad de semanas por bloque de caché (3 semanas: semana anterior, actual, siguiente)
const WINDOW_WEEKS = 3;

/**
 * Calcula el rango de fechas para un bloque de caché de Pilates
 * @param fechaVisible - Fecha dentro del rango deseado
 * @param blockOffset - Offset del bloque (0 = bloque actual, -1 = anterior, 1 = siguiente)
 * @returns { fecha_desde, fecha_hasta } en formato YYYY-MM-DD (excluye sábados y domingos)
 */
export const getCacheWindowRange = (fechaVisible: Date, blockOffset = 0) => {
  const fecha = dayjs(fechaVisible);
  const year = fecha.year();

  // Calcular el índice de semana sin depender de plugins de week()
  const startOfYearWeek = dayjs().year(year).startOf('year').startOf('week');
  const weekIndex = fecha.startOf('week').diff(startOfYearWeek, 'week');

  // Calcular la semana base del bloque (normalizar por bloques de 3 semanas no solapados)
  const baseWeekIndex = Math.floor(weekIndex / WINDOW_WEEKS) * WINDOW_WEEKS;
  const blockWeekIndex = baseWeekIndex + blockOffset * WINDOW_WEEKS;

  // Primera y última semana del bloque
  const firstDayOfBlock = startOfYearWeek.add(blockWeekIndex, 'week').startOf('week');
  const lastDayOfBlock = firstDayOfBlock.add(WINDOW_WEEKS - 1, 'week').endOf('week');

  // Ajustar al primer lunes del bloque
  const primerLunes = firstDayOfBlock.day(1); // Lunes de la primera semana

  // Ajustar al último viernes del bloque
  const ultimoViernes = lastDayOfBlock.day(5); // Viernes de la última semana

  return {
    fecha_desde: primerLunes.format('YYYY-MM-DD'),
    fecha_hasta: ultimoViernes.format('YYYY-MM-DD'),
  };
};

// Query Keys - centralizados para consistencia con Pilates
export const pilatesturnoKeys = {
  all: ['pilates-turnos'] as const,
  lists: () => [...pilatesturnoKeys.all, 'list'] as const,
  list: (filters?: PilatesTurnosFilters) => [...pilatesturnoKeys.lists(), filters] as const,
};

const hasActiveFilters = (filters?: PilatesTurnosFilters) => {
  if (!filters) return false;

  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });
};

const isPilatesTurnosListKey = (queryKey: QueryKey) => {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === pilatesturnoKeys.all[0] &&
    queryKey[1] === 'list'
  );
};

const getFiltersFromQueryKey = (queryKey: QueryKey): PilatesTurnosFilters | undefined => {
  if (!isPilatesTurnosListKey(queryKey)) return undefined;
  const maybeFilters = queryKey[2];
  if (!maybeFilters || typeof maybeFilters !== 'object') return undefined;
  return maybeFilters as PilatesTurnosFilters;
};

const hasOverlap = (source: unknown, target: string[]) => {
  if (!Array.isArray(source)) return false;
  return source.some((value) => target.includes(String(value)));
};

async function fetchPilatesTurnos(filters?: PilatesTurnosFilters): Promise<TurnoConDetalles[]> {
  const result = await obtenerTurnosConFiltros(filters);
  if (!result.success) {
    throw new Error(result.error || 'Error al obtener turnos de Pilates');
  }

  return result.data || [];
}

/**
 * Hook para obtener turnos de Pilates con caché de 3 semanas
 * @param options - Opciones del query
 * @param options.filters - Filtros de búsqueda (incluye fecha_desde, fecha_hasta, especialidad_ids)
 * @param options.enabled - Habilitar/deshabilitar el query
 */
export function usePilatesTurnos(options?: {
  filters?: PilatesTurnosFilters;
  enabled?: boolean;
  refetchOnMount?: boolean;
}) {
  const filters = options?.filters;
  const enabled = options?.enabled ?? true;
  const refetchOnMount = options?.refetchOnMount ?? false;
  const staleTime = hasActiveFilters(filters) ? 2 * 60 * 1000 : 5 * 60 * 1000;

  return useQuery({
    queryKey: pilatesturnoKeys.list(filters),
    queryFn: () => fetchPilatesTurnos(filters),
    placeholderData: keepPreviousData,
    refetchOnMount,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutos en caché
    enabled,
  });
}

/**
 * Prefetch de turnos de Pilates para ventanas adyacentes (semanas anterior y siguiente)
 */
export function usePrefetchPilatesTurnos() {
  const queryClient = useQueryClient();

  return (filters?: PilatesTurnosFilters) => {
    return queryClient.prefetchQuery({
      queryKey: pilatesturnoKeys.list(filters),
      queryFn: () => fetchPilatesTurnos(filters),
      staleTime: hasActiveFilters(filters) ? 2 * 60 * 1000 : 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });
  };
}

export interface InvalidatePilatesTurnosOptions {
  scope?: 'all' | 'lists' | 'dates';
  date?: string;
}

/**
 * Hook para invalidar caché de turnos de Pilates después de mutaciones
 */
export function useInvalidatePilatesTurnos() {
  const queryClient = useQueryClient();

  return (options?: InvalidatePilatesTurnosOptions) => {
    const scope = options?.scope ?? 'lists';

    if (scope === 'all') {
      queryClient.invalidateQueries({ queryKey: pilatesturnoKeys.all });
      return;
    }

    if (scope === 'dates' && options?.date) {
      const targetDate = options.date;
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!isPilatesTurnosListKey(query.queryKey)) return false;
          const filters = getFiltersFromQueryKey(query.queryKey);
          if (!filters?.fecha_desde || !filters?.fecha_hasta) {
            return true;
          }
          return filters.fecha_desde <= targetDate && filters.fecha_hasta >= targetDate;
        }
      });
      return;
    }

    // scope === 'lists'
    queryClient.invalidateQueries({ queryKey: pilatesturnoKeys.lists() });
  };
}
