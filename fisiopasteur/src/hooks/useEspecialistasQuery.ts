'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEspecialistas } from '@/lib/actions/especialista.action';

export interface EspecialistasPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface EspecialistasPaginatedResult<T = any> {
  items: T[];
  pagination: EspecialistasPagination;
}

// Query Keys
export const especialistaKeys = {
  all: ['especialistas'] as const,
  lists: () => [...especialistaKeys.all, 'list'] as const,
  list: (filters?: { incluirInactivos?: boolean }) => 
    [...especialistaKeys.lists(), filters] as const,
  paginated: (filters?: {
    incluirInactivos?: boolean;
    search?: string;
    status?: 'activos' | 'inactivos' | 'todos';
    page?: number;
    pageSize?: number;
  }) => [...especialistaKeys.all, 'paginated', filters] as const,
};

interface UseEspecialistasOptions {
  incluirInactivos?: boolean;
}

/**
 * Hook para obtener especialistas con caché
 */
export function useEspecialistas(options: UseEspecialistasOptions = {}) {
  return useQuery({
    queryKey: especialistaKeys.list(options),
    queryFn: async () => {
      const result = await getEspecialistas(options);
      return result.success ? result.data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (cambian poco)
    gcTime: 30 * 60 * 1000, // 30 minutos en caché
  });
}

export function useEspecialistasPaginated(options: {
  incluirInactivos?: boolean;
  search?: string;
  status?: 'activos' | 'inactivos' | 'todos';
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: especialistaKeys.paginated(options),
    queryFn: async (): Promise<EspecialistasPaginatedResult> => {
      const result = await getEspecialistas(options);
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener especialistas');
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
    gcTime: 60 * 1000,
  });
}

export function useInvalidateEspecialistas() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: especialistaKeys.all });
  };
}
