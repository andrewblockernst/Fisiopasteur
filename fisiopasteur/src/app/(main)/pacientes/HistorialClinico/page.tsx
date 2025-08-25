"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPaciente, agregarObservacion, editarObservacion, getEvolucionesClinicas } from "@/lib/actions/paciente.action";
import Boton from "@/componentes/boton";
import DatosPaciente from "@/componentes/paciente/datos-paciente";
import { useToastStore } from "@/stores/toast-store";
import { Tables } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client"; // Importa tu cliente

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

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Parte 1: Datos del paciente */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold mb-2">Datos del paciente</h2>
        {paciente && <DatosPaciente paciente={paciente} />}
      </div>

      {/* Parte 2: Historia clínica (observaciones/evoluciones) */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-bold mb-2">Historia clínica</h3>
        <div className="space-y-3">
          {observaciones.length === 0 && (
            <div className="text-gray-500">No hay observaciones registradas.</div>
          )}
          {observaciones.map(obs => {
            const puedeEditar = editandoId === obs.id_evolucion;
            return (
              <div key={obs.id_evolucion} className="border-b pb-2 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">Observación:</span>
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
                  <Boton
                    variant="secondary"
                    onClick={() => {
                      setEditandoId(obs.id_evolucion);
                      // Mostrar solo el texto sin el nombre
                      if (obs.observaciones?.startsWith("[")) {
                        setEditText(obs.observaciones.split("]")[1]?.trim() ?? "");
                      } else {
                        setEditText(obs.observaciones ?? "");
                      }
                    }}
                  >
                    Editar
                  </Boton>
                </div>
                {puedeEditar ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="border px-2 py-1 rounded w-full"
                    />
                    <Boton
                      variant="primary"
                      onClick={() => handleEditarObservacion(obs.id_evolucion)}
                    >
                      Guardar
                    </Boton>
                    <Boton
                      variant="secondary"
                      onClick={() => {
                        setEditandoId(null);
                        setEditText("");
                      }}
                    >
                      Cancelar
                    </Boton>
                  </div>
                ) : (
                  <div className="mt-2">
                    {obs.observaciones?.startsWith("[") ? (
                      <>
                        <span className="text-xs font-semibold">
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
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            value={nuevaObservacion}
            onChange={e => setNuevaObservacion(e.target.value)}
            placeholder="Agregar observación..."
            className="border px-2 py-1 rounded w-full"
          />
          <Boton
            variant="primary"
            onClick={handleAgregarObservacion}
          >
            Agregar
          </Boton>
        </div>
      </div>
    </div>
  );
}