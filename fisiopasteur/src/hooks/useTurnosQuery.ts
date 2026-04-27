'use client';

import { useQuery, useQueryClient, keepPreviousData, type QueryKey } from '@tanstack/react-query';
import { obtenerTurnosConFiltros } from '@/lib/actions/turno.action';
import type { TurnoConDetalles } from '@/stores/turno-store';

type TurnosFilters = Record<string, any>;
type EntityMap = Map<string, Record<string, any>>;

export interface TurnosPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TurnosPaginatedResult {
  items: TurnoConDetalles[];
  pagination: TurnosPagination;
}

// Paso 2: pool global opcional para compartir referencias entre distintas queries.
const ENABLE_GLOBAL_ENTITY_POOL = true;

const globalEntityPools = {
  especialista: new Map<string, Record<string, any>>(),
  paciente: new Map<string, Record<string, any>>(),
  box: new Map<string, Record<string, any>>(),
  grupo: new Map<string, Record<string, any>>(),
};

// Query Keys - centralizados para consistencia
export const turnoKeys = {
  all: ['turnos'] as const,
  lists: () => [...turnoKeys.all, 'list'] as const,
  list: (filters?: TurnosFilters) => [...turnoKeys.lists(), filters] as const,
  details: () => [...turnoKeys.all, 'detail'] as const,
  detail: (id: string) => [...turnoKeys.details(), id] as const,
};

const hasActiveFilters = (filters?: TurnosFilters) => {
  if (!filters) return false;

  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });
};

const isTurnosListKey = (queryKey: QueryKey) => {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === turnoKeys.all[0] &&
    queryKey[1] === 'list'
  );
};

const getFiltersFromQueryKey = (queryKey: QueryKey): TurnosFilters | undefined => {
  if (!isTurnosListKey(queryKey)) return undefined;
  const maybeFilters = queryKey[2];
  if (!maybeFilters || typeof maybeFilters !== 'object') return undefined;
  return maybeFilters as TurnosFilters;
};

const hasOverlap = (source: unknown, target: string[]) => {
  if (!Array.isArray(source)) return false;
  return source.some((value) => target.includes(String(value)));
};

export interface InvalidateTurnosOptions {
  scope?: 'all' | 'lists' | 'details' | 'statuses' | 'specialists' | 'dates';
  statuses?: string[];
  specialists?: string[];
  date?: string;
}

const getEntityKey = (entity: Record<string, any> | undefined, keyCandidates: string[]) => {
  if (!entity) return undefined;

  for (const key of keyCandidates) {
    const value = entity[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  return undefined;
};

const internEntity = (
  entity: Record<string, any> | undefined,
  keyCandidates: string[],
  localPool: EntityMap,
  globalPool: EntityMap
) => {
  if (!entity) return undefined;

  const key = getEntityKey(entity, keyCandidates);
  if (!key) return entity;

  const localExisting = localPool.get(key);
  if (localExisting) {
    Object.assign(localExisting, entity);
    return localExisting;
  }

  let resolved = entity;

  if (ENABLE_GLOBAL_ENTITY_POOL) {
    const globalExisting = globalPool.get(key);
    if (globalExisting) {
      Object.assign(globalExisting, entity);
      resolved = globalExisting;
    } else {
      globalPool.set(key, resolved);
    }
  }

  localPool.set(key, resolved);
  return resolved;
};

async function fetchTurnos(filters?: TurnosFilters): Promise<TurnoConDetalles[]> {
  const result = await obtenerTurnosConFiltros(filters);
  if (!result.success) {
    throw new Error(result.error || 'Error al obtener turnos');
  }

  return normalizeTurnos(result.data || []);
}

async function fetchTurnosPaginated(filters?: TurnosFilters): Promise<TurnosPaginatedResult> {
  const result = await obtenerTurnosConFiltros(filters);
  if (!result.success) {
    throw new Error(result.error || 'Error al obtener turnos');
  }

  const pageSize = Number(filters?.page_size ?? 20) || 20;
  const page = Math.max(1, Number(filters?.page ?? 1) || 1);

  return {
    items: normalizeTurnos(result.data || []),
    pagination: result.pagination || {
      page,
      pageSize,
      total: Array.isArray(result.data) ? result.data.length : 0,
      totalPages: 1,
    },
  };
}

function normalizeTurnos(rows: any[]): TurnoConDetalles[] {
  // Paso 1: deduplicacion por respuesta para entidades repetidas.
  const localEspecialistas: EntityMap = new Map();
  const localPacientes: EntityMap = new Map();
  const localBoxes: EntityMap = new Map();
  const localGrupos: EntityMap = new Map();

  return rows.map((turno: any) => ({
    ...turno,
    especialista: internEntity(turno.especialista ? {
      id_usuario: turno.especialista.id_usuario,
      nombre: turno.especialista.nombre,
      apellido: turno.especialista.apellido,
      color: turno.especialista.color,
      email: '',
      usuario: '',
      contraseña: '',
      telefono: null,
      id_especialidad: null,
      id_rol: 2,
      activo: true,
      created_at: null,
      updated_at: null,
    } : undefined, ['id_usuario'], localEspecialistas, globalEntityPools.especialista),
    paciente: internEntity(turno.paciente || undefined, ['id_paciente'], localPacientes, globalEntityPools.paciente),
    box: internEntity(turno.box || undefined, ['id_box', 'numero'], localBoxes, globalEntityPools.box),
    grupo_tratamiento: internEntity(turno.grupo_tratamiento || undefined, ['id_grupo'], localGrupos, globalEntityPools.grupo),
  }));
}

/**
 * Hook para obtener todos los turnos con caché
 * @param options - Opciones del query
 * @param options.filters - Filtros de busqueda para turnos
 * @param options.initialData - Datos iniciales del servidor (SSR)
 */
export function useTurnos(options?: {
  filters?: TurnosFilters;
  enabled?: boolean;
  refetchOnMount?: boolean;
  // initialData?: TurnoConDetalles[];
}) {
  const filters = options?.filters;
  const enabled = options?.enabled ?? true;
  const refetchOnMount = options?.refetchOnMount ?? false;
  const staleTime = hasActiveFilters(filters) ? 2 * 60 * 1000 : 5 * 60 * 1000;

  return useQuery({
    queryKey: turnoKeys.list(filters),
    queryFn: () => fetchTurnos(filters),
    placeholderData: keepPreviousData,
    // initialData: options?.initialData, // ✅ Datos iniciales del servidor
    refetchOnMount,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutos en caché
    enabled,
  });
}

export function useTurnosPaginated(options?: {
  filters?: TurnosFilters;
  enabled?: boolean;
  refetchOnMount?: boolean;
}) {
  const filters = options?.filters;
  const enabled = options?.enabled ?? true;
  const refetchOnMount = options?.refetchOnMount ?? false;
  const staleTime = hasActiveFilters(filters) ? 2 * 60 * 1000 : 5 * 60 * 1000;

  return useQuery({
    queryKey: turnoKeys.list(filters),
    queryFn: () => fetchTurnosPaginated(filters),
    placeholderData: keepPreviousData,
    refetchOnMount,
    staleTime,
    gcTime: 10 * 60 * 1000,
    enabled,
  });
}

/**
 * Prefetch de turnos para ventanas adyacentes (calendario)
 */
export function usePrefetchTurnos() {
  const queryClient = useQueryClient();

  return (filters?: TurnosFilters) => {
    return queryClient.prefetchQuery({
      queryKey: turnoKeys.list(filters),
      queryFn: () => fetchTurnos(filters),
      staleTime: hasActiveFilters(filters) ? 2 * 60 * 1000 : 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });
  };
}

/**
 * Hook para invalidar caché de turnos después de mutaciones
 */
export function useInvalidateTurnos() {
  const queryClient = useQueryClient();
  
  return (options?: InvalidateTurnosOptions) => {
    const scope = options?.scope ?? 'lists';

    if (scope === 'all') {
      queryClient.invalidateQueries({ queryKey: turnoKeys.all });
      return;
    }

    if (scope === 'details') {
      queryClient.invalidateQueries({ queryKey: turnoKeys.details() });
      return;
    }

    if (scope === 'statuses' && options?.statuses?.length) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!isTurnosListKey(query.queryKey)) return false;
          const filters = getFiltersFromQueryKey(query.queryKey);
          if (!filters?.estados || !Array.isArray(filters.estados) || filters.estados.length === 0) {
            return true;
          }
          return hasOverlap(filters.estados, options.statuses || []);
        }
      });
      return;
    }

    if (scope === 'specialists' && options?.specialists?.length) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!isTurnosListKey(query.queryKey)) return false;
          const filters = getFiltersFromQueryKey(query.queryKey);
          if (!filters?.especialista_ids || !Array.isArray(filters.especialista_ids) || filters.especialista_ids.length === 0) {
            return true;
          }
          return hasOverlap(filters.especialista_ids, options.specialists || []);
        }
      });
      return;
    }

    if (scope === 'dates' && options?.date) {
      const targetDate = options.date;
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!isTurnosListKey(query.queryKey)) return false;
          const filters = getFiltersFromQueryKey(query.queryKey);
          if (!filters?.fecha_desde || !filters?.fecha_hasta) {
            return true;
          }
          return filters.fecha_desde <= targetDate && filters.fecha_hasta >= targetDate;
        }
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: turnoKeys.lists() });
  };
}

/**
 * Hook para actualizar caché de turnos optimísticamente
 */
export function useUpdateTurnosCache() {
  const queryClient = useQueryClient();
  
  return (updater: (oldData: TurnoConDetalles[] | undefined) => TurnoConDetalles[]) => {
    queryClient.setQueriesData({ queryKey: turnoKeys.lists() }, updater);
  };
}
