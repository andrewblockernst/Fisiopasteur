"use client";

import { useState, useEffect } from "react";
import { actualizarEvolucionClinica } from "@/lib/actions/turno.action";
import { useToastStore } from "@/stores/toast-store"; 
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Edit2, X } from "lucide-react";

interface Turno {
  id_turno: number;
  fecha: string;
  estado: string;
  tipo_plan: 'particular' | 'obra_social';
  evolucion_clinica?: string;
  evolucion_completada_en?: string;
}

interface GrupoTratamiento {
  id_grupo: string;
  especialidad?: string;
  especialista?: { nombre: string; apellido: string };
  fecha_inicio: string;
  tipo_plan: 'particular' | 'obra_social';
  total_sesiones: number;
  turnos: Turno[];
}

interface Props {
  grupo: GrupoTratamiento;
}

export function TablaHistorialClinico({ grupo }: Props) {
  const { addToast } = useToastStore();
  const [editando, setEditando] = useState<number | null>(null);
  const [evolucionTemp, setEvolucionTemp] = useState("");
  const [guardando, setGuardando] = useState(false);

  const formatearFecha = (fecha: string) => {
    return format(new Date(fecha), "dd/MM/yyyy", { locale: es });
  };

  const estadoLabel = (estado: string) => {
    const estados: Record<string, string> = {
      programado: "Programado",
      atendido: "Atendido",
      cancelado: "Cancelado",
      vencido: "Vencido"
    };
    return estados[estado] || estado;
  };

  const estadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      programado: "bg-blue-100 text-blue-800",
      atendido: "bg-green-100 text-green-800",
      cancelado: "bg-red-100 text-red-800",
      vencido: "bg-gray-100 text-gray-800"
    };
    return colores[estado] || "bg-gray-100 text-gray-800";
  };

  const puedeEditar = (turno: Turno): boolean => {
    if (!turno.evolucion_completada_en) return true;
    
    const tiempoTranscurrido = Date.now() - new Date(turno.evolucion_completada_en).getTime();
    const cincoMinutos = 5 * 60 * 1000;
    
    return tiempoTranscurrido <= cincoMinutos;
  };

  const handleEditar = (turno: Turno) => {
    if (!puedeEditar(turno)) {
      addToast({
        variant: "error",
        message: "No se puede editar",
        description: "No se puede editar la evolución después de 5 minutos"
      });
      return;
    }
    
    setEditando(turno.id_turno);
    setEvolucionTemp(turno.evolucion_clinica || "");
  };

  const handleGuardar = async (id_turno: number) => {
    setGuardando(true);
    
    const resultado = await actualizarEvolucionClinica(id_turno, evolucionTemp);
    
    if (resultado.success) {
      addToast({
        variant: "success",
        message: "Evolución guardada",
        description: "La evolución clínica se guardó correctamente"
      });
      setEditando(null);
      // ✅ Recargar página para mostrar cambios
      window.location.reload();
    } else {
      addToast({
        variant: "error",
        message: "Error al guardar",
        description: resultado.error || "No se pudo guardar la evolución"
      });
    }
    
    setGuardando(false);
  };

  const handleCancelar = () => {
    setEditando(null);
    setEvolucionTemp("");
  };

  return (
    <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
      {/* Título del tratamiento */}
      <div className="bg-[#9C1838] text-white px-6 py-3">
        <h3 className="text-lg font-semibold">
          Tratamiento: {grupo.especialidad || "Sin especialidad"} - 
          {grupo.especialista && ` ${grupo.especialista.nombre} ${grupo.especialista.apellido}`}
        </h3>
        <p className="text-sm opacity-90">
          Inicio: {formatearFecha(grupo.fecha_inicio)} | 
          Total sesiones: {grupo.total_sesiones} | 
          Modalidad: {grupo.tipo_plan === 'particular' ? 'Particular' : 'Obra Social'}
        </p>
      </div>

      {/* Tabla de sesiones */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">#</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Pago</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Observaciones</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grupo.turnos.map((turno, index) => (
              <tr key={turno.id_turno} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                <td className="px-4 py-3">{formatearFecha(turno.fecha)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor(turno.estado)}`}>
                    {estadoLabel(turno.estado)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {turno.tipo_plan === 'particular' ? 'Particular' : 'Obra Social'}
                </td>
                <td className="px-4 py-3">
                  {editando === turno.id_turno ? (
                    <textarea
                      value={evolucionTemp}
                      onChange={(e) => setEvolucionTemp(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      rows={2}
                      placeholder="Escribir evolución clínica..."
                      disabled={guardando}
                    />
                  ) : (
                    <span className="text-gray-700">
                      {turno.evolucion_clinica || "-"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {turno.estado === 'atendido' && (
                    <div className="flex items-center justify-center gap-1">
                      {editando === turno.id_turno ? (
                        <>
                          <button
                            onClick={() => handleGuardar(turno.id_turno)}
                            disabled={guardando}
                            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                            title="Guardar"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={handleCancelar}
                            disabled={guardando}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEditar(turno)}
                          disabled={!puedeEditar(turno)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title={puedeEditar(turno) ? "Editar" : "No se puede editar (pasaron más de 5 min)"}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}