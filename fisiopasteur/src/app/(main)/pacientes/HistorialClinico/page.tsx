"use client";

import { ArrowLeft, Check, Pen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPaciente, agregarObservacion, editarObservacion, getEvolucionesClinicas } from "@/lib/actions/paciente.action";
import Boton from "@/componentes/boton";
import DatosPaciente from "@/componentes/paciente/datos-paciente";
import { useToastStore } from "@/stores/toast-store";
import { Tables } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client"; 

type Paciente = Tables<"paciente">;
type Observacion = Tables<"evolucion_clinica">;

export default function HistorialClinicoPage() {
  const params = useSearchParams();
  const idPaciente = Number(params.get("id"));
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const toast = useToastStore();

  useEffect(() => {
    async function cargarDatos() {
      if (!idPaciente) return;
      const pacienteData = await getPaciente(idPaciente);
      setPaciente(pacienteData);

      const evolucionesData = await getEvolucionesClinicas(idPaciente);
      setObservaciones(evolucionesData);
    }
    cargarDatos();
  }, [idPaciente]);

  // Handler para agregar observación
  const handleAgregarObservacion = async () => {
    if (!nuevaObservacion.trim()) return;

    // Obtener el usuario logueado
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const nombreUsuario = user?.user_metadata?.nombre || user?.email || "Desconocido";
    const textoFinal = `[${nombreUsuario}] ${nuevaObservacion}`;
    // Guardar la observación con el nombre incluido
    const nueva = await agregarObservacion(idPaciente, textoFinal);
    setObservaciones([...observaciones, nueva]);
    setNuevaObservacion("");
  };

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

  // Handler para volver atrás
  const handleBack = () => {
    window.history.length > 1 ? window.history.back() : window.location.assign("/pacientes");
  };

  return (
    <div className="container mx-auto px-2 sm:px-6 py-6 space-y-4">
      {/* Mobile Header - Solo móvil */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1">Historial Clínico</h1>
          <span className="w-8" />
        </div>
      </header>

      {/* HEADER desktop */}
      <div className="hidden sm:flex items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Historial Clínico</h1>
      </div>

      {/* Detalles del paciente */}
      <div className="bg-white rounded-xl border border-gray-200 shadow p-4 sm:p-6 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold mb-2 text-black">Datos del paciente</h2>
        {paciente && <DatosPaciente paciente={paciente} />}
      </div>

      {/* Parte 2: Historia clínica (observaciones/evoluciones) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow p-4 sm:p-6 space-y-4">
        <div className="space-y-3">
          {observaciones.length === 0 && (
            <div className="text-black">No hay observaciones registradas.</div>
          )}
          {observaciones.map(obs => {
            const puedeEditar = editandoId === obs.id_evolucion;
            return (
              <div key={obs.id_evolucion} className="border-b pb-2 mb-2">
                {/* Grid para header de la observación */}
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-2">
                    <span className="font-semibold text-black">Observación:</span>
                    {obs.created_at && (
                      <span className="ml-2 text-xs text-black">
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
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setEditandoId(obs.id_evolucion);
                        if (obs.observaciones?.startsWith("[")) {
                          setEditText(obs.observaciones.split("]")[1]?.trim() ?? "");
                        } else {
                          setEditText(obs.observaciones ?? "");
                        }
                      }}
                      className="p-2 bg-[#9C1838] hover:bg-[#5b0f22] rounded-full transition-colors flex-shrink-0"
                      aria-label="Editar observación"
                    >
                      <Pen className="text-white w-4 h-4"/>
                    </button>
                  </div>
                </div>
                {puedeEditar ? (
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="border px-2 py-1 rounded w-full"
                    />
                    <div className="flex gap-2 justify-end w-full sm:w-auto">
                      <button
                        onClick={() => handleEditarObservacion(obs.id_evolucion)}
                        className="p-2 bg-[#9C1838] hover:bg-[#5b0f22] rounded-full transition-colors flex-shrink-0"
                        aria-label="Guardar"
                      >
                        <Check className="text-white w-4 h-4"/>
                      </button>
                      <button
                        onClick={() => {
                          setEditandoId(null);
                          setEditText("");
                        }}
                        className="p-2 bg-gray-500 hover:bg-gray-600 rounded-full transition-colors flex-shrink-0"
                        aria-label="Cancelar"
                      >
                        <X className="text-white w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-black">
                    {obs.observaciones?.startsWith("[") ? (
                      <>
                        <span className="text-xs font-semibold text-black">
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
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 text-black">
          <input
            type="text"
            value={nuevaObservacion}
            onChange={e => setNuevaObservacion(e.target.value)}
            placeholder="Agregar observación..."
            className="border px-2 py-1 rounded w-full"
          />
          <Boton
            className="text-black"
            variant="primary"
            onClick={handleAgregarObservacion}
          >
            Agregar
          </Boton>
        </div>
      </div>

      {/* Botón para volver a la lista de pacientes */}
      <div className="w-full flex justify-center mt-8">
        <Boton
          className="text-black"
          variant="secondary"
          onClick={() => window.location.href = "/pacientes"}
        >
          Volver a listado de pacientes
        </Boton>
      </div>
    </div>
  );
}