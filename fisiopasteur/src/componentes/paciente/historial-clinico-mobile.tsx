"use client";

import { useEffect, useState } from "react";
import { obtenerHistorialClinicoPorPaciente, actualizarEvolucionClinica, actualizarTurno, actualizarGrupoTratamiento } from "@/lib/actions/turno.action";
import { useToastStore } from "@/stores/toast-store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Edit2, X, ChevronDown, ChevronUp } from "lucide-react";
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

interface HistorialClinicoMobileProps {
  pacienteId: number;
}

export function HistorialClinicoMobile({ pacienteId }: HistorialClinicoMobileProps) {
  const [historialClinico, setHistorialClinico] = useState<GrupoTratamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const [editandoEvolucion, setEditandoEvolucion] = useState<number | null>(null);
  const [editandoTratamiento, setEditandoTratamiento] = useState<string | null>(null);
  const [evolucionTemp, setEvolucionTemp] = useState("");
  const [tratamientoTemp, setTratamientoTemp] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [dialogConfirmacion, setDialogConfirmacion] = useState<{
    open: boolean;
    id_turno: number | null;
    accion: 'confirmar' | 'cancelar' | null;
  }>({ open: false, id_turno: null, accion: null });
  
  const { addToast } = useToastStore();

  const cargarHistorial = async () => {
    setCargando(true);
    const resultado = await obtenerHistorialClinicoPorPaciente(String(pacienteId));
    
    if (resultado.success) {
      setHistorialClinico(resultado.data || []);
    }
    
    setCargando(false);
  };

  useEffect(() => {
    cargarHistorial();
  }, [pacienteId]);

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

  const puedeEditar = (turno: Turno): boolean => {
    if (!turno.evolucion_completada_en) return true;
    
    const tiempoTranscurrido = Date.now() - new Date(turno.evolucion_completada_en).getTime();
    const cincoMinutos = 5 * 60 * 1000;
    
    return tiempoTranscurrido <= cincoMinutos;
  };

  const handleGuardarEvolucion = async (id_turno: number) => {
    setGuardando(true);
    
    const grupo = historialClinico.find(g => g.turnos.some(t => t.id_turno === id_turno));
    const turno = grupo?.turnos.find(t => t.id_turno === id_turno);
    
    try {
      if (!puedeEditar(turno!)) {
        addToast({
          variant: "error",
          message: "Tiempo excedido",
          description: "Por razones legales, la evolución solo puede editarse durante los primeros 5 minutos"
        });
        setGuardando(false);
        return;
      }
      
      if (!evolucionTemp.trim()) {
        addToast({
          variant: "warning",
          message: "Campo vacío",
          description: "Por favor ingresa la evolución clínica antes de guardar"
        });
        setGuardando(false);
        return;
      }
      
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
      await cargarHistorial();
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
      await cargarHistorial();
    } else {
      addToast({
        variant: "error",
        message: "Error al actualizar",
        description: resultado.error || "No se pudo actualizar el estado"
      });
    }
    
    setGuardando(false);
  };

  const handleGuardarTratamiento = async (idGrupo: string) => {
    setGuardando(true);
    
    const resultado = await actualizarGrupoTratamiento(idGrupo, {
      nombre: tratamientoTemp
    });
    
    if (resultado.success) {
      addToast({
        variant: "success",
        message: "Tratamiento actualizado",
        description: "El nombre del tratamiento se actualizó correctamente"
      });
      setEditandoTratamiento(null);
      await cargarHistorial();
    } else {
      addToast({
        variant: "error",
        message: "Error al actualizar",
        description: resultado.error || "No se pudo actualizar el tratamiento"
      });
    }
    
    setGuardando(false);
  };

  const toggleGrupo = (idGrupo: string) => {
    setGrupoAbierto(grupoAbierto === idGrupo ? null : idGrupo);
  };

  if (cargando) {
    return (
      <div className="bg-white mt-6 mx-4 rounded-lg shadow-sm mb-20 p-6">
        <div className="text-center text-gray-500">Cargando historial...</div>
      </div>
    );
  }

  return (
    <div className="bg-white mt-6 mx-4 rounded-lg shadow-sm mb-20">
      {/* Header principal */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-[#9C1838]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Historial Clínico
          {historialClinico.length > 0 && (
            <span className="ml-2 bg-[#9C1838] text-white text-xs px-2 py-1 rounded-full">
              {historialClinico.length}
            </span>
          )}
        </h3>
      </div>

      {/* Lista de tratamientos */}
      <div className="divide-y divide-gray-200">
        {historialClinico.length === 0 ? (
          <div className="text-gray-500 text-center py-8 px-4">
            No hay tratamientos registrados para este paciente
          </div>
        ) : (
          historialClinico.map((grupo) => {
            const abierto = grupoAbierto === grupo.id_grupo;
            
            return (
              <div key={grupo.id_grupo} className="border-b border-gray-200 last:border-b-0">
                {/* Header del grupo (colapsible) */}
                <div 
                  className="px-4 py-3 bg-[#9C1838] text-white cursor-pointer"
                  onClick={() => toggleGrupo(grupo.id_grupo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editandoTratamiento === grupo.id_grupo ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={tratamientoTemp}
                            onChange={(e) => setTratamientoTemp(e.target.value)}
                            className="px-2 py-1 rounded text-black text-sm flex-1"
                            placeholder="Ej: Lesión hombro"
                          />
                          <button
                            onClick={() => handleGuardarTratamiento(grupo.id_grupo)}
                            disabled={guardando}
                            className="p-1 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditandoTratamiento(null);
                              setTratamientoTemp("");
                            }}
                            className="p-1 bg-red-600 hover:bg-red-700 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {grupo.especialidad || "Sin especialidad"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditandoTratamiento(grupo.id_grupo);
                              setTratamientoTemp(grupo.especialidad || "");
                            }}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                      {grupo.especialista && (
                        <p className="text-xs opacity-90 mt-1">
                          {grupo.especialista.nombre} {grupo.especialista.apellido}
                        </p>
                      )}
                      <p className="text-xs opacity-90 mt-1">
                        Inicio: {formatearFecha(grupo.fecha_inicio)} | 
                        Sesiones: {grupo.total_sesiones} | 
                        {grupo.tipo_plan === 'particular' ? 'Particular' : 'Obra Social'}
                      </p>
                    </div>
                    {abierto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Contenido del grupo (turnos) */}
                {abierto && (
                  <div className="bg-white">
                    {grupo.turnos.map((turno, index) => {
                      const bgColor = turno.estado === 'atendido' 
                        ? 'bg-green-50' 
                        : turno.estado === 'cancelado'
                          ? 'bg-red-50'
                          : turno.estado === 'confirmado'
                            ? 'bg-blue-50'
                            : 'bg-white';
                      
                      return (
                        <div key={turno.id_turno} className={`p-4 border-b border-gray-100 ${bgColor}`}>
                          {/* Info del turno */}
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-semibold text-sm text-gray-900">
                                Sesión {index + 1}
                              </span>
                              <p className="text-xs text-gray-600">
                                {formatearFecha(turno.fecha)} • {estadoLabel(turno.estado)}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {turno.tipo_plan === 'particular' ? 'Particular' : 'OS'}
                            </span>
                          </div>

                          {/* Evolución clínica */}
                          <div className="mt-3">
                            {editandoEvolucion === turno.id_turno ? (
                              <div className="space-y-2">
                                <label className="text-xs text-gray-600 font-medium">
                                  Evolución clínica
                                  {!puedeEditar(turno) && (
                                    <span className="text-red-600 ml-1">(bloqueada)</span>
                                  )}
                                </label>
                                <textarea
                                  value={evolucionTemp}
                                  onChange={(e) => setEvolucionTemp(e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-black"
                                  rows={4}
                                  placeholder="Describa la evolución del paciente..."
                                  disabled={guardando || !puedeEditar(turno)}
                                />
                                {!puedeEditar(turno) && (
                                  <p className="text-xs text-red-600">
                                    Solo editable durante los primeros 5 minutos.
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleGuardarEvolucion(turno.id_turno)}
                                    disabled={guardando || !puedeEditar(turno)}
                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <Check size={14} />
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditandoEvolucion(null);
                                      setEvolucionTemp("");
                                    }}
                                    disabled={guardando}
                                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <X size={14} />
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="text-xs text-gray-600 font-medium mb-1">Evolución clínica</p>
                                    {turno.evolucion_clinica ? (
                                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                        {turno.evolucion_clinica}
                                      </p>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">Sin evolución</span>
                                    )}
                                  </div>
                                  
                                  {puedeEditar(turno) ? (
                                    <button
                                      onClick={() => {
                                        setEditandoEvolucion(turno.id_turno);
                                        setEvolucionTemp(turno.evolucion_clinica || "");
                                      }}
                                      className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 flex-shrink-0"
                                    >
                                      <Edit2 size={12} />
                                      {turno.evolucion_clinica ? "Editar" : "Agregar"}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-red-600 italic flex-shrink-0">
                                      ⏱️ Bloqueada
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Acciones del turno */}
                          {turno.estado === 'programado' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => setDialogConfirmacion({ 
                                  open: true, 
                                  id_turno: turno.id_turno, 
                                  accion: 'confirmar' 
                                })}
                                className="flex-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                ✓ Atendido
                              </button>
                              <button
                                onClick={() => setDialogConfirmacion({ 
                                  open: true, 
                                  id_turno: turno.id_turno, 
                                  accion: 'cancelar' 
                                })}
                                className="flex-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                ✗ Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dialog de confirmación */}
      <BaseDialog
        type={dialogConfirmacion.accion === 'cancelar' ? 'error' : 'info'}
        size="sm"
        title={dialogConfirmacion.accion === 'cancelar' ? 'Cancelar turno' : 'Marcar como atendido'}
        message={
          dialogConfirmacion.accion === 'cancelar'
            ? '¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.'
            : '¿Confirmar que el paciente fue atendido? Podrás agregar la evolución clínica después.'
        }
        isOpen={dialogConfirmacion.open}
        onClose={() => setDialogConfirmacion({ open: false, id_turno: null, accion: null })}
        showCloseButton
        primaryButton={{
          text: guardando ? 'Procesando...' : (dialogConfirmacion.accion === 'cancelar' ? 'Sí, cancelar' : 'Sí, marcar como atendido'),
          onClick: () => {
            if (dialogConfirmacion.id_turno && dialogConfirmacion.accion) {
              const nuevoEstado = dialogConfirmacion.accion === 'cancelar' ? 'cancelado' : 'atendido';
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