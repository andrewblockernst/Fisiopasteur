"use client";

import { useState } from "react";
import { actualizarEvolucionClinica, actualizarTurno, actualizarGrupoTratamiento } from "@/lib/actions/turno.action";
import { useToastStore } from "@/stores/toast-store"; 
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Edit2, X, Calendar, Ban, Clock } from "lucide-react";
import BaseDialog from "@/componentes/dialog/base-dialog";

interface Turno {
  id_turno: number;
  fecha: string;
  estado: string;
  tipo_plan: 'particular' | 'obra_social';
  evolucion_clinica?: string;
  evolucion_completada_en?: string;
  observaciones?: string;
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
  const [editandoEvolucion, setEditandoEvolucion] = useState<number | null>(null);
  const [editandoTratamiento, setEditandoTratamiento] = useState(false);
  const [evolucionTemp, setEvolucionTemp] = useState("");
  const [tratamientoTemp, setTratamientoTemp] = useState(grupo.especialidad || "");
  const [guardando, setGuardando] = useState(false);
  
  // Estados para confirmaciones
  const [dialogConfirmacion, setDialogConfirmacion] = useState<{
    open: boolean;
    id_turno: number | null;
    accion: 'confirmar' | 'cancelar' | null;
  }>({ open: false, id_turno: null, accion: null });

  const formatearFecha = (fecha: string) => {
    return format(new Date(fecha), "dd/MM/yyyy", { locale: es });
  };

  const estadoLabel = (estado: string) => {
    const estados: Record<string, string> = {
      programado: "Programado",
      atendido: "Atendido",
      cancelado: "Cancelado",
      vencido: "Vencido",
      confirmado: "Confirmado"
    };
    return estados[estado] || estado;
  };

  const puedeEditar = (turno: Turno): boolean => {
    if (!turno.evolucion_completada_en) return true;
    
    const tiempoTranscurrido = Date.now() - new Date(turno.evolucion_completada_en).getTime();
    const cincoMinutos = 5 * 60 * 1000;
    
    return tiempoTranscurrido <= cincoMinutos;
  };

  const handleGuardarEvolucion = async (id_turno: number) => {
    setGuardando(true);
    
    const turno = grupo.turnos.find(t => t.id_turno === id_turno);
    
    try {
      // Solo guardar evolución clínica si el turno está atendido
      if (turno?.estado === 'atendido' && evolucionTemp.trim()) {
        const resultadoEvo = await actualizarEvolucionClinica(id_turno, evolucionTemp);
        
        if (!resultadoEvo.success) {
          throw new Error(resultadoEvo.error || "Error al guardar evolución clínica");
        }
        
        addToast({
          variant: "success",
          message: "Evolución guardada",
          description: "La evolución clínica se guardó correctamente"
        });
        setEditandoEvolucion(null);
        window.location.reload();
      } else {
        addToast({
          variant: "warning",
          message: "Sin cambios",
          description: "No hay evolución clínica para guardar o el turno no está atendido"
        });
      }
    } catch (error: any) {
      addToast({
        variant: "error",
        message: "Error al guardar",
        description: error.message || "No se pudo guardar la evolución"
      });
    }
    
    setGuardando(false);
  };

  const handleCambiarEstado = async (id_turno: number, nuevoEstado: string) => {
    setGuardando(true);

    const resultado = await actualizarTurno(id_turno, { estado: nuevoEstado });
    
    if (resultado.success) {
      addToast({
        variant: "success",
        message: "Estado actualizado",
        description: `El turno se marcó como ${estadoLabel(nuevoEstado)}`
      });
      setDialogConfirmacion({ open: false, id_turno: null, accion: null });
      window.location.reload();
    } else {
      addToast({
        variant: "error",
        message: "Error al actualizar",
        description: resultado.error || "No se pudo actualizar el estado"
      });
    }
    
    setGuardando(false);
  };
  
  const abrirConfirmacion = (id_turno: number, accion: 'confirmar' | 'cancelar') => {
    setDialogConfirmacion({ open: true, id_turno, accion });
  };

  const handleCancelar = () => {
    setEditandoEvolucion(null);
    setEvolucionTemp("");
  };

  const handleGuardarTratamiento = async () => {
    setGuardando(true);
    
    const resultado = await actualizarGrupoTratamiento(grupo.id_grupo, {
      nombre: tratamientoTemp
    });
    
    if (resultado.success) {
      addToast({
        variant: "success",
        message: "Tratamiento actualizado",
        description: "El nombre del tratamiento se actualizó correctamente"
      });
      setEditandoTratamiento(false);
      window.location.reload();
    } else {
      addToast({
        variant: "error",
        message: "Error al actualizar",
        description: resultado.error || "No se pudo actualizar el tratamiento"
      });
    }
    
    setGuardando(false);
  };

  return (
    <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
      {/* Título del tratamiento - EDITABLE */}
      <div className="bg-[#9C1838] text-white px-6 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            Tratamiento: 
          </h3>
          {editandoTratamiento ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tratamientoTemp}
                onChange={(e) => setTratamientoTemp(e.target.value)}
                className="px-2 py-1 rounded text-black text-sm"
                placeholder="Ej: Lesión hombro"
              />
              <button
                onClick={handleGuardarTratamiento}
                disabled={guardando}
                className="p-1 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                title="Guardar"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setEditandoTratamiento(false);
                  setTratamientoTemp(grupo.especialidad || "");
                }}
                className="p-1 bg-red-600 hover:bg-red-700 rounded"
                title="Cancelar"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <span>{grupo.especialidad || "Sin especialidad"}</span>
              <button
                onClick={() => setEditandoTratamiento(true)}
                className="p-1 hover:bg-white/20 rounded"
                title="Editar nombre del tratamiento"
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
          {grupo.especialista && (
            <span className="ml-2">- {grupo.especialista.nombre} {grupo.especialista.apellido}</span>
          )}
        </div>
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
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Evolución Clínica</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 w-32">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grupo.turnos.map((turno, index) => {
              // ✅ Determinar color de fondo según estado
              const bgColor = turno.estado === 'confirmado' 
                ? 'bg-green-50 hover:bg-green-100' 
                : turno.estado === 'cancelado'
                  ? 'bg-red-50 hover:bg-red-100'
                  : 'hover:bg-gray-50';
              
              return (
                <tr key={turno.id_turno} className={bgColor}>
                  <td className="px-4 py-3 text-black">{index + 1}</td>
                  <td className="px-4 py-3 text-black">{formatearFecha(turno.fecha)}</td>
                  <td className="px-4 py-3 text-black">
                    {estadoLabel(turno.estado)}
                  </td>
                <td className="px-4 py-3 text-black">
                  {turno.tipo_plan === 'particular' ? 'Particular' : 'Obra Social'}
                </td>
                {/* Evolución Clínica */}
                <td className="px-4 py-3">
                  {editandoEvolucion === turno.id_turno ? (
                    <div className="space-y-2">
                      {/* Evolución clínica (solo si está atendido) */}
                      {turno.estado === 'atendido' ? (
                        <div>
                          <label className="text-xs text-gray-600 font-medium">Evolución clínica (no editable después de 5 min):</label>
                          <textarea
                            value={evolucionTemp}
                            onChange={(e) => setEvolucionTemp(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-black mt-1"
                            rows={4}
                            placeholder="Evolución clínica del paciente..."
                            disabled={guardando}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Solo se puede agregar evolución clínica a turnos atendidos
                        </p>
                      )}
                      
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleGuardarEvolucion(turno.id_turno)}
                          disabled={guardando || turno.estado !== 'atendido'}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                          title="Guardar"
                        >
                          <Check size={14} />
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelar}
                          disabled={guardando}
                          className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1"
                          title="Cancelar"
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Mostrar evolución clínica si existe */}
                      {turno.evolucion_clinica ? (
                        <div className="text-sm">
                          <span className="text-black">{turno.evolucion_clinica}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                      
                      {/* Botón de edición - solo para turnos atendidos */}
                      {turno.estado === 'atendido' && (
                        <div className="mt-1">
                          <button
                            onClick={() => {
                              setEditandoEvolucion(turno.id_turno);
                              setEvolucionTemp(turno.evolucion_clinica || "");
                            }}
                            disabled={!puedeEditar(turno)}
                            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title={
                              !puedeEditar(turno)
                                ? "No se puede editar la evolución (pasaron más de 5 min)"
                                : "Editar evolución clínica"
                            }
                          >
                            <Edit2 size={12} />
                            Editar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                {/* Acciones */}
                <td className="px-4 py-3">
                  {turno.estado === 'programado' && (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => abrirConfirmacion(turno.id_turno, 'confirmar')}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Confirmar turno"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => abrirConfirmacion(turno.id_turno, 'cancelar')}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Cancelar turno"
                      >
                        <Ban size={16} />
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implementar reprogramar turno
                          addToast({
                            variant: "info",
                            message: "Funcionalidad en desarrollo",
                            description: "Próximamente podrás reprogramar turnos"
                          });
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Reprogramar turno"
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Dialog de confirmación */}
      <BaseDialog
        type={dialogConfirmacion.accion === 'cancelar' ? 'error' : 'info'}
        size="sm"
        title={dialogConfirmacion.accion === 'cancelar' ? 'Cancelar turno' : 'Confirmar turno'}
        message={
          dialogConfirmacion.accion === 'cancelar'
            ? '¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.'
            : '¿Confirmar la asistencia del paciente a este turno?'
        }
        isOpen={dialogConfirmacion.open}
        onClose={() => setDialogConfirmacion({ open: false, id_turno: null, accion: null })}
        showCloseButton
        primaryButton={{
          text: guardando ? 'Procesando...' : (dialogConfirmacion.accion === 'cancelar' ? 'Sí, cancelar' : 'Sí, confirmar'),
          onClick: () => {
            if (dialogConfirmacion.id_turno && dialogConfirmacion.accion) {
              const nuevoEstado = dialogConfirmacion.accion === 'cancelar' ? 'cancelado' : 'confirmado';
              handleCambiarEstado(dialogConfirmacion.id_turno, nuevoEstado);
            }
          },
          disabled: guardando,
        }}
        secondaryButton={{
          text: 'No, volver',
          onClick: () => setDialogConfirmacion({ open: false, id_turno: null, accion: null }),
        }}
      />
    </div>
  );
}