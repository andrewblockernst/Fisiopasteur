"use client";

import { useState, useTransition } from "react";
import { cancelarTurno, eliminarTurno, marcarComoAtendido } from "@/lib/actions/turno.action";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";

import { Database } from "@/types/database.types";

import { MoreVertical, Edit, X, Trash, CheckCircle, ChevronUp, EllipsisVertical } from "lucide-react";
import { useToastStore } from "@/stores/toast-store";


// Usar el tipo exacto de la base de datos
type TurnoFromDB = Database['public']['Tables']['turno']['Row'];

// Crear un tipo específico para turnos que tienen los campos requeridos
type TurnoCompleto = TurnoFromDB & {
  id_turno: number;
  id_paciente: number; // Garantizamos que no sea null
  fecha: string;
  hora: string;
  index: number;
  total: number;
};

type Props = {
  turno: TurnoCompleto; // Usar el tipo más específico
  onDone?: () => void;
};

export default function AccionesTurno({ turno, onDone }: Props) {
  const [openEdit, setOpenEdit] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToastStore();

  // Estados para confirmaciones
  const [esperandoConfirmacionCancelar, setEsperandoConfirmacionCancelar] = useState(false);
  const [esperandoConfirmacionEliminar, setEsperandoConfirmacionEliminar] = useState(false);
  const [esperandoConfirmacionAtendido, setEsperandoConfirmacionAtendido] = useState(false);

  const onCancelar = () => {
    setMenuAbierto(false);
    
    if (!esperandoConfirmacionCancelar) {
      // Primera vez - mostrar confirmación
      setEsperandoConfirmacionCancelar(true);
      addToast({
        variant: 'warning',
        message: 'Cancelar turno',
        description: 'Haz clic nuevamente en "Cancelar" para confirmar la cancelación del turno.',
        duration: 6000,
      });
      
      // Limpiar el estado después de 6 segundos
      setTimeout(() => {
        setEsperandoConfirmacionCancelar(false);
      }, 6000);
      return;
    }

    // Segunda vez - ejecutar cancelación
    setEsperandoConfirmacionCancelar(false);
    startTransition(async () => {
      const res = await cancelarTurno(turno.id_turno);
      if (res.success) {
        addToast({
          variant: 'success',
          message: 'Turno cancelado',
          description: 'El turno fue cancelado correctamente.',
        });
        onDone?.();
      } else {
        addToast({
          variant: 'error',
          message: 'Error',
          description: res.error || "Error al cancelar el turno",
        });
      }
    });
  };

  const onEliminar = () => {
    setMenuAbierto(false);
    
    // Verificar si el turno ya pasó antes de mostrar confirmación
    if (esPasado) {
      addToast({
        variant: 'error',
        message: 'No se puede eliminar',
        description: 'No se pueden eliminar turnos que ya pasaron.',
      });
      return;
    }

    if (!esperandoConfirmacionEliminar) {
      // Primera vez - mostrar confirmación
      setEsperandoConfirmacionEliminar(true);
      addToast({
        variant: 'error',
        message: 'Eliminar turno',
        description: 'ATENCIÓN: Esto elimina definitivamente el turno. Haz clic nuevamente en "Eliminar" para confirmar.',
        duration: 8000,
      });
      
      // Limpiar el estado después de 8 segundos
      setTimeout(() => {
        setEsperandoConfirmacionEliminar(false);
      }, 8000);
      return;
    }

    // Segunda vez - ejecutar eliminación
    setEsperandoConfirmacionEliminar(false);
    startTransition(async () => {
      const res = await eliminarTurno(turno.id_turno);
      if (res.success) {
        addToast({
          variant: 'success',
          message: 'Turno eliminado',
          description: 'El turno fue eliminado correctamente.',
        });
        onDone?.();
      } else {
        addToast({
          variant: 'error',
          message: 'Error',
          description: res.error || "Error al eliminar el turno",
        });
      }
    });
  };

  const onMarcarAtendido = () => {
    setMenuAbierto(false);
    
    if (!esperandoConfirmacionAtendido) {
      // Primera vez - mostrar confirmación
      setEsperandoConfirmacionAtendido(true);
      addToast({
        variant: 'info',
        message: 'Marcar como atendido',
        description: 'Haz clic nuevamente en "Marcar Atendido" para confirmar.',
        duration: 5000,
      });
      
      // Limpiar el estado después de 5 segundos
      setTimeout(() => {
        setEsperandoConfirmacionAtendido(false);
      }, 5000);
      return;
    }

    // Segunda vez - ejecutar marcado como atendido
    setEsperandoConfirmacionAtendido(false);
    startTransition(async () => {
      const res = await marcarComoAtendido(turno.id_turno);
      if (res.success) {
        addToast({
          variant: 'success',
          message: 'Turno atendido',
          description: 'El turno fue marcado como atendido.',
        });
        onDone?.();
      } else {
        addToast({
          variant: 'error',
          message: 'Error',
          description: res.error || "Error al marcar como atendido",
        });
      }
    });
  };

  const handleEditar = () => {
    setMenuAbierto(false);
    // Verificar que el turno tenga todos los campos requeridos antes de editar
    if (!turno.id_paciente) {
      addToast({
        variant: 'error',
        message: 'Error',
        description: 'No se puede editar un turno sin paciente asignado.',
      });
      return;
    }
    setOpenEdit(true);
  };

  // Verificar si el turno ya pasó
  const turnoYaPaso = () => {
    const ahora = new Date();
    const fechaTurno = new Date(`${turno.fecha}T${turno.hora}`);
    return fechaTurno < ahora;
  };

  const esPasado = turnoYaPaso();
  const esProgramado = turno.estado === 'programado';

  return (
    <div className="relative">
      {/* <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Acciones"
        disabled={isPending}
      >
        <MoreVertical size={18} className="text-gray-600" />
      </button> */}
      <button
                                            onClick={() => setMenuAbierto(!menuAbierto)}
                                            className="text-xs px-3 py-2 h-8 min-w-16 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                        >   
                                            <div className="relative w-5 h-5">
                                                <ChevronUp 
                                                    className={`absolute w-5 h-5 transition-all duration-300 ease-in-out ${
                                                        menuAbierto
                                                            ? 'opacity-100 rotate-0' 
                                                            : 'opacity-0 rotate-180'
                                                    }`}
                                                />
                                                <EllipsisVertical 
                                                    className={`absolute w-5 h-5 transition-all duration-300 ease-in-out ${
                                                        menuAbierto
                                                            ? 'opacity-0 rotate-180' 
                                                            : 'opacity-100 rotate-0'
                                                    }`}
                                                />
                                            </div>
                                        </button>

      {menuAbierto && (
        <>
          {/* Overlay para cerrar el menú al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setMenuAbierto(false)}
          />
          
          {/* Menú desplegable */}
          <div className={`absolute right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[140px] 
            ${turno.index >= turno.total - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            <div className="py-1">
              <button
                onClick={handleEditar}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                disabled={!turno.id_paciente} // Deshabilitar si no hay paciente
              >
                <Edit size={14} />
                Editar
              </button>
              
              {/* Mostrar "Marcar Atendido" solo para turnos programados que ya pasaron */}
              {esProgramado && esPasado && (
                <button
                  onClick={onMarcarAtendido}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    esperandoConfirmacionAtendido ? 'bg-blue-50 text-blue-700 font-medium' : 'text-green-600'
                  }`}
                >
                  <CheckCircle size={14} />
                  {esperandoConfirmacionAtendido ? 'Confirmar Atendido' : 'Marcar Atendido'}
                </button>
              )}
              
              {/* Cancelar solo para turnos futuros programados */}
              {esProgramado && !esPasado && (
                <button
                  onClick={onCancelar}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    esperandoConfirmacionCancelar ? 'bg-orange-50 text-orange-700 font-medium' : 'text-orange-600'
                  }`}
                >
                  <X size={14} />
                  {esperandoConfirmacionCancelar ? 'Confirmar Cancelación' : 'Cancelar'}
                </button>
              )}
              
              {/* Eliminar solo para turnos futuros */}
              {!esPasado && (
                <button
                  onClick={onEliminar}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    esperandoConfirmacionEliminar ? 'bg-red-50 text-red-700 font-medium' : 'text-red-600'
                  }`}
                >
                  <Trash size={14} />
                  {esperandoConfirmacionEliminar ? 'Confirmar Eliminación' : 'Eliminar'}
                </button>
              )}

              {/* Mostrar opción deshabilitada para turnos pasados con explicación */}
              {esPasado && (
                <button
                  onClick={() => {
                    setMenuAbierto(false);
                    addToast({
                      variant: 'error',
                      message: 'No disponible',
                      description: 'No se pueden eliminar turnos que ya pasaron.',
                    });
                  }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-gray-400 cursor-not-allowed"
                  disabled
                  title="No se pueden eliminar turnos pasados"
                >
                  <Trash size={14} />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Solo mostrar el modal de edición si el turno tiene paciente */}
      {openEdit && turno.id_paciente && (
        <EditarTurnoDialog
          turno={turno}
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          onSaved={() => {
            setOpenEdit(false);
            onDone?.();
          }}
        />
      )}
    </div>
  );
}