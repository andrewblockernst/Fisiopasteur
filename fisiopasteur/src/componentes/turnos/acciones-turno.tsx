"use client";

import { useState, useTransition } from "react";
import { cancelarTurno, eliminarTurno, marcarComoAtendido } from "@/lib/actions/turno.action";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";
import BaseDialog from "@/componentes/dialog/base-dialog";
import Button from "@/componentes/boton";

type Props = {
  turno: {
    id_turno: number;
    fecha: string;
    hora: string;
    id_paciente: number;
    id_especialista: string | null;
    id_especialidad: number | null;
    id_box: number | null;
    estado: string | null;
    observaciones?: string | null;
  };
  onDone?: () => void;
};

export default function AccionesTurno({ turno, onDone }: Props) {
  const [openEdit, setOpenEdit] = useState(false);
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

  // Verificar si el turno ya pasó
  const turnoYaPaso = () => {
    const ahora = new Date();
    const fechaTurno = new Date(`${turno.fecha}T${turno.hora}`);
    return fechaTurno < ahora;
  };

  const esPasado = turnoYaPaso();
  const esProgramado = turno.estado === 'programado';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="primary"
        onClick={() => setOpenEdit(true)}
        disabled={isPending}
        className="px-2 py-1 rounded border text-sm"
      >
        Editar
      </Button>

      {/* Mostrar "Marcar Atendido" solo para turnos programados que ya pasaron */}
      {esProgramado && esPasado && (
        <Button
          variant="success"
          onClick={onMarcarAtendido}
          disabled={isPending}
          className="px-2 py-1 rounded border text-sm"
        >
          ✅ Atendido
        </Button>
      )}

      {/* Cancelar solo para turnos futuros programados */}
      {esProgramado && !esPasado && (
        <Button
          variant="warning"
          onClick={onCancelar}
          disabled={isPending}
          className="px-2 py-1 rounded border text-sm"
        >
          Cancelar
        </Button>
      )}

      <Button
        variant="danger"
        onClick={onEliminar}
        disabled={isPending}
        className="px-2 py-1 rounded border text-sm"
      >
        Eliminar
      </Button>

      {openEdit && (
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