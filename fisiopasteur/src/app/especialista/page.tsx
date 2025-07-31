import { getEspecialistas } from "@/lib/actions/especialista.action";
import Link from "next/link";
import Button from "@/components/button";
import { DeleteEspecialistaButton } from "@/components/especialista/delete-button";

export default async function EspecialistasPage() {
  const especialistas = await getEspecialistas();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Especialistas</h1>
        <Link href="/especialista/nuevo-especialista">
          <Button variant="primary">Nuevo Especialista</Button>
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Especialidades
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {especialistas.map((especialista) => (
              <tr key={especialista.id_usuario}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {especialista.nombre} {especialista.apellido}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{especialista.usuario}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {especialista.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {Array.isArray(especialista.nombre)
                    ? "Sin especialidad"
                    : especialista.especialidad?.nombre || "Sin especialidad"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {especialista.telefono || "No disponible"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link href={`/admin/especialistas/${especialista.id_usuario}/editar`}>
                    <Button variant="secondary" className="text-xs">
                      Editar
                    </Button>
                  </Link>
                  <DeleteEspecialistaButton 
                    id={especialista.id_usuario}
                    nombre={`${especialista.nombre} ${especialista.apellido}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}