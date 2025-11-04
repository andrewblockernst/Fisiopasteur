"use client";

import { useEffect, useState } from "react";
import { getEvolucionesClinicas, editarObservacion } from "@/lib/actions/paciente.action";
import { Tables } from "@/types/database.types";
import { useToastStore } from "@/stores/toast-store";
import Boton from "../boton";

type Observacion = Tables<"evolucion_clinica">;

interface HistorialClinicoMobileProps {
  pacienteId: number;
}

export function HistorialClinicoMobile({ pacienteId }: HistorialClinicoMobileProps) {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const toast = useToastStore();

  useEffect(() => {
    async function cargarObservaciones() {
      if (!pacienteId) return;
      const evolucionesData = await getEvolucionesClinicas(pacienteId);
      setObservaciones(evolucionesData);
    }
    cargarObservaciones();
  }, [pacienteId]);

  // Handler para editar observación
  const handleEditarObservacion = async (idObs: number) => {
    if (!editText.trim()) return;
    try {
      // Extraer el nombre original de la observación
      const obsOriginal = observaciones.find(o => o.id_evolucion === idObs);
      let textoFinal = editText;
      if (obsOriginal?.observaciones?.startsWith("[")) {
        const nombre = obsOriginal.observaciones.split("]")[0] + "]";
        textoFinal = `${nombre} ${editText}`;
      }
      await editarObservacion(idObs, textoFinal);
      setObservaciones(obs =>
        obs.map(o => o.id_evolucion === idObs ? { ...o, observaciones: textoFinal } : o)
      );
      setEditandoId(null);
      setEditText("");
      toast.addToast({
        variant: "success",
        message: "Observación editada correctamente",
      });
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.includes("Solo se puede editar la observación durante los primeros 5 minutos")
      ) {
        toast.addToast({
          variant: "warning",
          message: "Los 5 minutos para editar la observación ya pasaron",
        });
      } else {
        toast.addToast({
          variant: "error",
          message: error.message || "Error al editar la observación",
        });
      }
    }
  };

  return (
    <div className="bg-white mt-6 mx-4 rounded-lg shadow-sm mb-20">
      {/* Header colapsible */}
      <div 
        className="px-6 py-4 border-b border-gray-100 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[#9C1838]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Historial Clínico
            {observaciones.length > 0 && (
              <span className="ml-2 bg-[#9C1838] text-white text-xs px-2 py-1 rounded-full">
                {observaciones.length}
              </span>
            )}
          </h3>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Contenido colapsible */}
      {isOpen && (
        <div className="p-6">
          {/* Lista de observaciones */}
          <div className="space-y-4">
            {observaciones.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                No hay observaciones registradas.
              </div>
            ) : (
              observaciones.map(obs => {
                const puedeEditar = editandoId === obs.id_evolucion;
                return (
                  <div key={obs.id_evolucion} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="text-xs font-medium text-[#9C1838]">Observación</span>
                          {obs.created_at && (
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(obs.created_at).toLocaleString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          )}
                        </div>
                        
                        {puedeEditar ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Boton
                                variant="primary"
                                onClick={() => handleEditarObservacion(obs.id_evolucion)}
                                className="text-xs px-3 py-1"
                              >
                                Guardar
                              </Boton>
                              <Boton
                                variant="secondary"
                                onClick={() => {
                                  setEditandoId(null);
                                  setEditText("");
                                }}
                                className="text-xs px-3 py-1"
                              >
                                Cancelar
                              </Boton>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700">
                            {obs.observaciones?.startsWith("[") ? (
                              <>
                                <span className="font-semibold text-[#9C1838]">
                                  {obs.observaciones?.split("]")[0].replace("[", "")}
                                </span>
                                <span>: {obs.observaciones?.split("]")[1]}</span>
                              </>
                            ) : (
                              <span>{obs.observaciones}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {!puedeEditar && (
                        <button
                          onClick={() => {
                            setEditandoId(obs.id_evolucion);
                            // Mostrar solo el texto sin el nombre
                            if (obs.observaciones?.startsWith("[")) {
                              setEditText(obs.observaciones.split("]")[1]?.trim() ?? "");
                            } else {
                              setEditText(obs.observaciones ?? "");
                            }
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-[#9C1838] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}