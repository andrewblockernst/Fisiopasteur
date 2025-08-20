import { obtenerPerfilUsuario } from '@/lib/actions/perfil.action';
import PerfilCliente from './perfil-vista';
import { Suspense } from 'react';

export default async function PerfilServidor() {
  const perfil = await obtenerPerfilUsuario();

  if (!perfil) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Error al cargar el perfil
        </h2>
        <p className="text-gray-600">
          No se pudieron obtener los datos del usuario
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PerfilSkeleton />}>
      <PerfilCliente perfil={perfil} />
    </Suspense>
  );
}

function PerfilSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded-md w-1/3"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
}