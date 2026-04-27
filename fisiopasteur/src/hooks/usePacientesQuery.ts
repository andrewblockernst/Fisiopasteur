'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPacientes } from '@/lib/actions/paciente.action';
import type { Tables } from '@/types/database.types';

type Paciente = Tables<'paciente'>;

export interface PacientesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PacientesPaginatedResult {
  items: Paciente[];
  pagination: PacientesPagination;
}

export const pacienteKeys = {
  all: ['pacientes'] as const,
  paginated: (filters?: {
    search?: string;
    status?: 'activos' | 'inactivos' | 'todos';
    page?: number;
    pageSize?: number;
    orderBy?: keyof Paciente;
    orderDirection?: 'asc' | 'desc';
  }) => [...pacienteKeys.all, 'paginated', filters] as const,
};

type PacientesPaginatedFilters = {
  search?: string;
  status?: 'activos' | 'inactivos' | 'todos';
  page?: number;
  pageSize?: number;
  orderBy?: keyof Paciente;
  orderDirection?: 'asc' | 'desc';
};

export function usePacientesPaginated(options: PacientesPaginatedFilters) {
  return useQuery({
    queryKey: pacienteKeys.paginated(options),
    queryFn: async (): Promise<PacientesPaginatedResult> => {
      const result = await getPacientes(options);
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener pacientes');
      }

      const items = result.data || [];
      const safePage = Math.max(1, Number(options.page ?? 1));
      const safePageSize = Math.max(1, Number(options.pageSize ?? 20));

      return {
        items,
        pagination: (result as any).pagination || {
          page: safePage,
          pageSize: safePageSize,
          total: Array.isArray(items) ? items.length : 0,
          totalPages: 1,
        },
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    // Reduce el tiempo de retencion para evitar demasiadas variantes de busqueda.
    gcTime: 60 * 1000,
  });
}

export function useInvalidatePacientes() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: pacienteKeys.all });
  };
}
