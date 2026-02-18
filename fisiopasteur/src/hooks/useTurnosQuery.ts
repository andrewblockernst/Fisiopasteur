'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { obtenerTurnosConFiltros } from '@/lib/actions/turno.action';
import type { TurnoConDetalles } from '@/stores/turno-store';

// Query Keys - centralizados para consistencia
export const turnoKeys = {
  all: ['turnos'] as const,
  lists: () => [...turnoKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...turnoKeys.lists(), filters] as const,
  details: () => [...turnoKeys.all, 'detail'] as const,
  detail: (id: string) => [...turnoKeys.details(), id] as const,
};

/**
 * Hook para obtener todos los turnos con caché
 * @param options - Opciones del query
 * @param options.filters - Filtros de busqueda para turnos
 * @param options.initialData - Datos iniciales del servidor (SSR)
 */
export function useTurnos(options?: {
  filters?: Record<string, any>;
  // initialData?: TurnoConDetalles[];
}) {
  const filters = options?.filters;

  return useQuery({
    queryKey: turnoKeys.list(filters),
    queryFn: async () => {
      const result = await obtenerTurnosConFiltros(filters);
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener turnos');
      }
      
      // Mapear a la estructura esperada por el store
      const turnos: TurnoConDetalles[] = (result.data || []).map((turno: any) => ({
        ...turno,
        especialista: turno.especialista ? {
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
        } : undefined,
        paciente: turno.paciente || undefined,
        box: turno.box || undefined
      }));
      
      return turnos;
    },
    // placeholderData: keepPreviousData, // ✅ Mantiene datos viejos mientras carga los nuevos
    // initialData: options?.initialData, // ✅ Datos iniciales del servidor
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos en caché
  });
}

/**
 * Hook para invalidar caché de turnos después de mutaciones
 */
export function useInvalidateTurnos() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: turnoKeys.all });
  };
}

/**
 * Hook para actualizar caché de turnos optimísticamente
 */
export function useUpdateTurnosCache() {
  const queryClient = useQueryClient();
  
  return (updater: (oldData: TurnoConDetalles[] | undefined) => TurnoConDetalles[]) => {
    queryClient.setQueryData(turnoKeys.lists(), updater);
  };
}
