"use client";

import { useState, useTransition } from "react";
import { cancelarTurno, eliminarTurno, marcarComoAtendido } from "@/lib/actions/turno.action";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";
import BaseDialog from "@/componentes/dialog/base-dialog";

import { Database } from "@/types/database.types";

import { MoreVertical, Edit, X, Trash, CheckCircle, ChevronUp, EllipsisVertical, AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
  // El menú ahora lo maneja Radix UI DropdownMenu
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToastStore();

  // Estados para modales de confirmación
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [modalAtendidoAbierto, setModalAtendidoAbierto] = useState(false);

  const onCancelar = () => {
    setModalCancelarAbierto(true);
  };

  const confirmarCancelar = () => {
    setModalCancelarAbierto(false);
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
    setModalEliminarAbierto(true);
  };

  const confirmarEliminar = () => {
    setModalEliminarAbierto(false);
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
    setModalAtendidoAbierto(true);
  };

  const confirmarMarcarAtendido = () => {
    setModalAtendidoAbierto(false);
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
  const esPendiente = turno.estado === 'pendiente';
  const esAtendido = turno.estado === 'atendido';
  const esCancelado = turno.estado === 'cancelado';

  // ✅ Determinar qué acciones están disponibles
  const puedeMarcarAtendido = (esProgramado || esPendiente) && !esAtendido;
  const puedeCancelar = (esProgramado || esPendiente) && !esCancelado && !esAtendido;
  const puedeEditar = !esAtendido; // Solo no se puede editar si ya fue atendido
  const puedeEliminar = true; // Siempre se puede eliminar

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="text-xs px-3 py-2 h-8 min-w-16 flex items-center justify-center hover:bg-slate-50 transition-colors relative"
            title="Acciones"
            disabled={isPending}
          >
            <EllipsisVertical className="w-5 h-5 text-gray-600" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content sideOffset={4} align="end" className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">

          {/* Marcar como Atendido */}
          {puedeMarcarAtendido && (
            <DropdownMenu.Item
              className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 text-green-600 cursor-pointer"
              onSelect={onMarcarAtendido}
            >
              <CheckCircle size={16} />
              Marcar como Atendido
            </DropdownMenu.Item>
          )}

          {/* Cancelar Turno */}
          {puedeCancelar && (
            <DropdownMenu.Item
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
              onSelect={onCancelar}
            >
              <XCircle size={16} />
              Cancelar Turno
            </DropdownMenu.Item>
          )}

          {/* Separador */}
          {(puedeMarcarAtendido || puedeCancelar) && puedeEditar && (
            <div className="h-px bg-gray-200 my-1" />
          )}

          {/* Editar */}
          {puedeEditar && (
            <DropdownMenu.Item
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
              onSelect={handleEditar}
              disabled={!turno.id_paciente}
            >
              <Edit size={16} />
              Editar
            </DropdownMenu.Item>
          )}

          {/* Eliminar */}
          {puedeEliminar && (
            <DropdownMenu.Item
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
              onSelect={onEliminar}
            >
              <Trash size={16} />
              Eliminar
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Modal de edición */}
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

      {/* ✨ Modal de confirmación: Cancelar turno */}
      <BaseDialog
        type="warning"
        title="¿Cancelar turno?"
        message="¿Estás seguro de que deseas cancelar este turno? Esta acción se puede revertir."
        isOpen={modalCancelarAbierto}
        onClose={() => setModalCancelarAbierto(false)}
        primaryButton={{
          text: "Sí, cancelar",
          onClick: confirmarCancelar
        }}
        secondaryButton={{
          text: "No, volver",
          onClick: () => setModalCancelarAbierto(false)
        }}
        showCloseButton
      />

      {/* ✨ Modal de confirmación: Eliminar turno */}
      <BaseDialog
        type="error"
        title="¿Eliminar turno?"
        message="⚠️ ATENCIÓN: Esta acción eliminará permanentemente el turno y NO se puede deshacer. ¿Deseas continuar?"
        isOpen={modalEliminarAbierto}
        onClose={() => setModalEliminarAbierto(false)}
        primaryButton={{
          text: "Sí, eliminar",
          onClick: confirmarEliminar
        }}
        secondaryButton={{
          text: "No, cancelar",
          onClick: () => setModalEliminarAbierto(false)
        }}
        showCloseButton
      />

      {/* ✨ Modal de confirmación: Marcar como atendido */}
      <BaseDialog
        type="success"
        title="¿Marcar como atendido?"
        message="¿Confirmas que este turno fue atendido correctamente?"
        isOpen={modalAtendidoAbierto}
        onClose={() => setModalAtendidoAbierto(false)}
        primaryButton={{
          text: "Sí, marcar",
          onClick: confirmarMarcarAtendido
        }}
        secondaryButton={{
          text: "No, volver",
          onClick: () => setModalAtendidoAbierto(false)
        }}
        showCloseButton
      />
    </>
  );
}