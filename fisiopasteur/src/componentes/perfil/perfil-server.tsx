import { obtenerPerfilUsuario } from '@/lib/actions/perfil.action';
import PerfilCliente from '@/componentes/perfil/perfil-vista';

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
      <PerfilCliente perfil={perfil} />
  );
}

