'use client';

import { useQuery } from '@tanstack/react-query';
import { getEspecialistas } from '@/lib/actions/especialista.action';

// Query Keys
export const especialistaKeys = {
  all: ['especialistas'] as const,
  lists: () => [...especialistaKeys.all, 'list'] as const,
  list: (filters?: { incluirInactivos?: boolean }) => 
    [...especialistaKeys.lists(), filters] as const,
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
      return result; // getEspecialistas ya devuelve el array directamente
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (cambian poco)
    gcTime: 30 * 60 * 1000, // 30 minutos en caché
  });
}
