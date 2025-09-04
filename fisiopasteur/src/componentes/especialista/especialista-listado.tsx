import Link from "next/link";
import Button from "@/componentes/boton";
import { DeleteEspecialistaButton } from "./eliminar-boton";
import { useState } from "react";
import { EditarEspecialistaDialog } from "./editar-especialista-dialog";
import type { Tables } from "@/types/database.types";
import { formatoNumeroTelefono } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Especialidad = Tables<"especialidad">;
type Usuario = Tables<"usuario"> & { 
  especialidades?: Especialidad[] 
};

interface EspecialistasTableProps {
  especialistas: Usuario[];
  onEspecialistaDeleted?: () => void;
  onEspecialistaUpdated?: () => void;
  especialidades: Especialidad[];
  setShowDialog: (show: boolean) => void;
}

export function EspecialistasTable({ 
  especialistas, 
  onEspecialistaDeleted, 
  onEspecialistaUpdated,
  especialidades,
  setShowDialog
}: EspecialistasTableProps) {
  const [editingEspecialista, setEditingEspecialista] = useState<Usuario | null>(null);
  const router = useRouter();

  const handleEditClose = () => {
    setEditingEspecialista(null);
    if (onEspecialistaUpdated) {
      onEspecialistaUpdated();
    }
  };
  return (
    <>
      {/* Vista de tabla para desktop */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
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
                  {formatoNumeroTelefono(especialista.telefono || "No disponible")}
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
      </div>

      {/* Vista de cards para mobile */}
      {/* <div className="md:hidden space-y-4">
        {especialistas.map((especialista) => (
          <div key={especialista.id_usuario} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {especialista.nombre} {especialista.apellido}
                </h3>
                <p className="text-sm text-gray-500">@{especialista.usuario}</p>
              </div>
              <div
                className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0"
                style={{ backgroundColor: especialista.color || "#6B7280" }}
              />
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-700 w-20">Email:</span>
                <span className="text-gray-900 break-all">{especialista.email}</span>
              </div>
              
              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-700 w-20">Teléfono:</span>
                <span className="text-gray-900">{formatoNumeroTelefono(especialista.telefono || "No disponible")}</span>
              </div>
              
              <div className="text-sm">
                <span className="font-medium text-gray-700">Especialidades:</span>
                <div className="mt-1 flex flex-wrap gap-1">
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
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="secondary" 
                className="flex-1 text-sm"
                onClick={() => setEditingEspecialista(especialista)}
              >
                Editar
              </Button>
              <DeleteEspecialistaButton 
                id={especialista.id_usuario}
                nombre={`${especialista.nombre} ${especialista.apellido}`}
                onDeleted={onEspecialistaDeleted}
              />
            </div>
          </div>
        ))}
      </div> */}
      {/* Vista mobile (xs - sm) */}
      <div className="block sm:hidden bg-white relative">

        <div className="divide-y divide-gray-200">
          {especialistas.map((especialista) => (
            <div
              key={especialista.id_usuario}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
                router.push(`/especialistas/${especialista.id_usuario}`);
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-gray-900 font-medium">
                  {especialista.nombre} {especialista.apellido}
                </p>
                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: especialista.color || "#6B7280" }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Boton flotante para agregar especialista */}
        <button
          onClick={() => setShowDialog(true)}
          className="fixed bottom-20 right-6 w-14 h-14 bg-[#9C1838] hover:bg-[#7D1329] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 z-50 flex items-center justify-center"
          aria-label="Agregar nuevo paciente"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

      </div>

      {editingEspecialista && (
        <EditarEspecialistaDialog
          isOpen={true}
          onClose={handleEditClose}
          especialidades={especialidades}
          especialista={editingEspecialista}
        />
      )}
    </>
  );
}