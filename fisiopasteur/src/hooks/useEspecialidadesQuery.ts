'use client';

import { useQuery } from '@tanstack/react-query';
import { getEspecialidades } from '@/lib/actions/especialidad.action';

// Query Keys
export const especialidadKeys = {
  all: ['especialidades'] as const,
  lists: () => [...especialidadKeys.all, 'list'] as const,
};

/**
 * Hook para obtener especialidades con caché
 */
export function useEspecialidades() {
  return useQuery({
    queryKey: especialidadKeys.lists(),
    queryFn: async () => {
      const result = await getEspecialidades();
      return result; // getEspecialidades ya devuelve el array directamente
    },
    staleTime: 15 * 60 * 1000, // 15 minutos (casi nunca cambian)
    gcTime: 60 * 60 * 1000, // 1 hora en caché
  });
}
