"use client";

import { useState, useTransition } from "react";
import { cancelarTurno, eliminarTurno, marcarComoAtendido } from "@/lib/actions/turno.action";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";
import BaseDialog from "@/componentes/dialog/base-dialog";
import Button from "@/componentes/boton";
import { Database } from "@/types/database.types";
import { MoreVertical, Edit, X, Trash, CheckCircle } from "lucide-react";

// Usar el tipo exacto de la base de datos
type TurnoFromDB = Database['public']['Tables']['turno']['Row'];

// Crear un tipo específico para turnos que tienen los campos requeridos
type TurnoCompleto = TurnoFromDB & {
  id_turno: number;
  id_paciente: number; // Garantizamos que no sea null
  fecha: string;
  hora: string;
};

type Props = {
  turno: TurnoCompleto; // Usar el tipo más específico
  onDone?: () => void;
};

export default function AccionesTurno({ turno, onDone }: Props) {
  const [openEdit, setOpenEdit] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado para diálogos personalizados
  const [dialog, setDialog] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ open: false, type: 'info', title: '', message: '' });

  // Confirmación personalizada
  const showConfirm = (type: 'info' | 'error', title: string, message: string, onConfirm: () => void) => {
    setDialog({ open: true, type, title, message, onConfirm });
  };

  // Mensaje personalizado
  const showMessage = (type: 'success' | 'error', title: string, message: string) => {
    setDialog({ open: true, type, title, message });
  };

  const onCancelar = () => {
    setMenuAbierto(false);
    showConfirm('info', 'Cancelar turno', '¿Cancelar este turno?', () => {
      setDialog({ ...dialog, open: false });
      startTransition(async () => {
        const res = await cancelarTurno(turno.id_turno);
        if (res.success) {
          showMessage('success', 'Turno cancelado', 'El turno fue cancelado correctamente.');
          onDone?.();
        } else {
          showMessage('error', 'Error', res.error || "Error");
        }
      });
    });
  };

  const onEliminar = () => {
    setMenuAbierto(false);
    
    // Verificar si el turno ya pasó antes de mostrar confirmación
    if (esPasado) {
      showMessage('error', 'No se puede eliminar', 'No se pueden eliminar turnos que ya pasaron.');
      return;
    }

    showConfirm('error', 'Eliminar turno', 'Esto elimina definitivamente el turno. ¿Continuar?', () => {
      setDialog({ ...dialog, open: false });
      startTransition(async () => {
        const res = await eliminarTurno(turno.id_turno);
        if (res.success) {
          showMessage('success', 'Turno eliminado', 'El turno fue eliminado correctamente.');
          onDone?.();
        } else {
          showMessage('error', 'Error', res.error || "Error");
        }
      });
    });
  };

  const onMarcarAtendido = () => {
    setMenuAbierto(false);
    showConfirm('info', 'Marcar como atendido', '¿Marcar como atendido?', () => {
      setDialog({ ...dialog, open: false });
      startTransition(async () => {
        const res = await marcarComoAtendido(turno.id_turno);
        if (res.success) {
          showMessage('success', 'Turno atendido', 'El turno fue marcado como atendido.');
          onDone?.();
        } else {
          showMessage('error', 'Error', res.error || "Error");
        }
      });
    });
  };

  const handleEditar = () => {
    setMenuAbierto(false);
    // Verificar que el turno tenga todos los campos requeridos antes de editar
    if (!turno.id_paciente) {
      showMessage('error', 'Error', 'No se puede editar un turno sin paciente asignado.');
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
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Acciones"
        disabled={isPending}
      >
        <MoreVertical size={18} className="text-gray-600" />
      </button>

      {menuAbierto && (
        <>
          {/* Overlay para cerrar el menú al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setMenuAbierto(false)}
          />
          
          {/* Menú desplegable */}
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[140px]">
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
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                >
                  <CheckCircle size={14} />
                  Marcar Atendido
                </button>
              )}
              
              {/* Cancelar solo para turnos futuros programados */}
              {esProgramado && !esPasado && (
                <button
                  onClick={onCancelar}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                >
                  <X size={14} />
                  Cancelar
                </button>
              )}
              
              {/* Eliminar solo para turnos futuros */}
              {!esPasado && (
                <button
                  onClick={onEliminar}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash size={14} />
                  Eliminar
                </button>
              )}

              {/* Mostrar opción deshabilitada para turnos pasados con explicación */}
              {esPasado && (
                <button
                  onClick={() => {
                    setMenuAbierto(false);
                    showMessage('error', 'No disponible', 'No se pueden eliminar turnos que ya pasaron.');
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

      {/* Diálogo personalizado para confirmaciones y mensajes */}
      <BaseDialog
        type={dialog.type}
        size="sm"
        title={dialog.title}
        message={dialog.message}
        isOpen={dialog.open}
        onClose={() => setDialog({ ...dialog, open: false })}
        showCloseButton
        primaryButton={
          dialog.onConfirm
            ? {
                text: "Confirmar",
                onClick: () => {
                  dialog.onConfirm?.();
                },
              }
            : {
                text: "Aceptar",
                onClick: () => setDialog({ ...dialog, open: false }),
              }
        }
        secondaryButton={
          dialog.onConfirm
            ? {
                text: "Cancelar",
                onClick: () => setDialog({ ...dialog, open: false }),
              }
            : undefined
        }
      />
    </div>
  );
}