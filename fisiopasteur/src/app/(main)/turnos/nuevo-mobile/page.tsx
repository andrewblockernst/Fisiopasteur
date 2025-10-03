'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Esta página ya no se usa - redirige a la lista de turnos
// El formulario de nuevo turno ahora es un modal
export default function NuevoTurnoPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/turnos');
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-2">Redirigiendo...</p>
        <p className="text-sm text-gray-500">El formulario ahora es un modal</p>
      </div>
    </div>
  );
}