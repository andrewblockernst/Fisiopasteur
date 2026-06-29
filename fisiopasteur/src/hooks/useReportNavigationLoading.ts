'use client';

import { useEffect } from 'react';
import { useNavigationLoadingStore } from '@/stores/navigation-loading';

/**
 * Reporta al store global de navegación que esta página está cargando datos.
 * Mientras `isLoading` sea true, el spinner de la navbar se mantiene visible
 * y la página puede devolver `null` en lugar de un skeleton.
 */
export function useReportNavigationLoading(isLoading: boolean) {
  const startLoading = useNavigationLoadingStore((s) => s.startLoading);
  const endLoading = useNavigationLoadingStore((s) => s.endLoading);

  useEffect(() => {
    if (!isLoading) return;
    startLoading();
    return () => endLoading();
  }, [isLoading, startLoading, endLoading]);
}
