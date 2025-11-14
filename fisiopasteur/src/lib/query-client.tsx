'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Datos considerados frescos por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Mantener en caché por 10 minutos
            gcTime: 10 * 60 * 1000,
            // Revalidar cuando la ventana recupera el foco
            refetchOnWindowFocus: true,
            // Reintentar 1 vez en caso de error
            retry: 1,
            // No revalidar al montar si los datos son frescos
            refetchOnMount: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
