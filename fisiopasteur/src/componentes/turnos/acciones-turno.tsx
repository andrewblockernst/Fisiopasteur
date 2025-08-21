"use client";

import { useState, useTransition } from "react";
import { cancelarTurno, eliminarTurno, marcarComoAtendido } from "@/lib/actions/turno.action";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";

type Props = {
  turno: {
    id_turno: number;
    fecha: string;
    hora: string;
    id_paciente: number;
    id_especialista: string | null;
    id_especialidad: number | null; // Agregar este campo
    id_box: number | null;
    estado: string | null;
    observaciones?: string | null;
  };
  onDone?: () => void;
};

export default function AccionesTurno({ turno, onDone }: Props) {
  const [openEdit, setOpenEdit] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onCancelar = () => {
    if (!confirm("¿Cancelar este turno?")) return;
    startTransition(async () => {
      const res = await cancelarTurno(turno.id_turno);
      if (res.success) {
        alert("Turno cancelado");
        onDone?.();
      } else {
        alert(res.error || "Error");
      }
    });
  };

  const onEliminar = () => {
    if (!confirm("Esto elimina definitivamente el turno. ¿Continuar?")) return;
    startTransition(async () => {
      const res = await eliminarTurno(turno.id_turno);
      if (res.success) {
        alert("Turno eliminado");
        onDone?.();
      } else {
        alert(res.error || "Error");
      }
    });
  };

  const onMarcarAtendido = () => {
    if (!confirm("¿Marcar como atendido?")) return;
    startTransition(async () => {
      const res = await marcarComoAtendido(turno.id_turno);
      if (res.success) {
        alert("Turno marcado como atendido");
        onDone?.();
      } else {
        alert(res.error || "Error");
      }
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
      <button
        onClick={() => setOpenEdit(true)}
        className="px-2 py-1 rounded border text-sm hover:bg-neutral-50"
        disabled={isPending}
      >
        Editar
      </button>
      
      {/* Mostrar "Marcar Atendido" solo para turnos programados que ya pasaron */}
      {esProgramado && esPasado && (
        <button
          onClick={onMarcarAtendido}
          className="px-2 py-1 rounded border text-sm text-green-700 border-green-300 hover:bg-green-50"
          disabled={isPending}
        >
          ✅ Atendido
        </button>
      )}
      
      {/* Cancelar solo para turnos futuros programados */}
      {esProgramado && !esPasado && (
        <button
          onClick={onCancelar}
          className="px-2 py-1 rounded border text-sm text-amber-700 border-amber-300 hover:bg-amber-50"
          disabled={isPending}
        >
          Cancelar
        </button>
      )}
      
      <button
        onClick={onEliminar}
        className="px-2 py-1 rounded border text-sm text-red-700 border-red-300 hover:bg-red-50"
        disabled={isPending}
      >
        Eliminar
      </button>

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
    </div>
  );
}