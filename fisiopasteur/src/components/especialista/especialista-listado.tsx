import Link from "next/link";
import Button from "@/components/button";
import { DeleteEspecialistaButton } from "./delete-button";
import { useState } from "react";
import { EditarEspecialistaDialog } from "./editar-especialista-dialog";
import type { Tables } from "@/types/database.types";

type Especialidad = Tables<"especialidad">;
type Usuario = Tables<"usuario"> & { 
  especialidades?: Especialidad[] 
};

interface EspecialistasTableProps {
  especialistas: Usuario[];
  onEspecialistaDeleted?: () => void;
  onEspecialistaUpdated?: () => void;
  especialidades: Especialidad[];
}

export function EspecialistasTable({ 
  especialistas, 
  onEspecialistaDeleted, 
  onEspecialistaUpdated,
  especialidades 
}: EspecialistasTableProps) {
  const [editingEspecialista, setEditingEspecialista] = useState<Usuario | null>(null);

  const handleEditClose = () => {
    setEditingEspecialista(null);
    if (onEspecialistaUpdated) {
      onEspecialistaUpdated();
    }
  };
  return (
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
              Color
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Teléfono
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
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
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                  {especialista.especialidades && especialista.especialidades.length > 0 ? (
                    especialista.especialidades.map((especialidad) => (
                      <span
                        key={especialidad.id_especialidad}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {especialidad.nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Sin especialidades</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div
                    className="w-6 h-6 rounded border border-gray-300 mr-2"
                    style={{ backgroundColor: especialista.color || "#6B7280" }}
                  />
                  <span className="text-xs font-mono text-gray-600">
                    {especialista.color || "Sin color"}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {especialista.telefono || "No disponible"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <Button 
                  variant="secondary" 
                  className="text-xs"
                  onClick={() => setEditingEspecialista(especialista)}
                >
                  Editar
                </Button>
                <DeleteEspecialistaButton 
                  id={especialista.id_usuario}
                  nombre={`${especialista.nombre} ${especialista.apellido}`}
                  onDeleted={onEspecialistaDeleted}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingEspecialista && (
        <EditarEspecialistaDialog
          isOpen={true}
          onClose={handleEditClose}
          especialidades={especialidades}
          especialista={editingEspecialista}
        />
      )}
    </div>
  );
}