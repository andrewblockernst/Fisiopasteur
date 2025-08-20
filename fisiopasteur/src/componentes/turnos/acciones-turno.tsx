"use client";

import { useState, useTransition } from "react";
import { cancelarTurno, eliminarTurno } from "@/lib/actions/turno.action";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";

type Props = {
  turno: {
    id_turno: number;
    fecha: string;
    hora: string;
    id_paciente: number;
    id_especialista: string | null;
    id_box: number | null;
    estado: string | null;
    // agregá lo que ya traés en tu tabla si necesitás
  };
  onDone?: () => void; // opcional para refrescar si querés
};

export default function AccionesTurno({ turno, onDone }: Props) {
  const [openEdit, setOpenEdit] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onCancelar = () => {
    if (!confirm("¿Cancelar este turno?")) return;
    startTransition(async () => {
      const res = await cancelarTurno(turno.id_turno);
      if (res.success) {
        // podés reemplazar por tu sistema de toasts
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

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setOpenEdit(true)}
        className="px-2 py-1 rounded border text-sm hover:bg-neutral-50"
        disabled={isPending}
      >
        Editar
      </button>
      <button
        onClick={onCancelar}
        className="px-2 py-1 rounded border text-sm text-amber-700 border-amber-300 hover:bg-amber-50"
        disabled={isPending}
      >
        Cancelar
      </button>
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
