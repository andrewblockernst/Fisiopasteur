"use client";

import { useEffect, useState, useTransition } from "react";
import { actualizarTurno, obtenerPacientes, obtenerEspecialistas, obtenerBoxes } from "@/lib/actions/turno.action";

type Props = {
  turno: {
    id_turno: number;
    id_paciente: number;
    id_especialista: string | null;
    id_box: number | null;
    fecha: string;
    hora: string;
    notas?: string | null;
  };
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function EditarTurnoDialog({ turno, open, onClose, onSaved }: Props) {
  const [pacienteId, setPacienteId] = useState<number>(turno.id_paciente);
  const [especialistaId, setEspecialistaId] = useState<string>(turno.id_especialista || "");
  const [boxId, setBoxId] = useState<number | "">(turno.id_box ?? "");
  const [fecha, setFecha] = useState(turno.fecha);
  const [hora, setHora] = useState(turno.hora);
  const [notas, setNotas] = useState(turno.notas || "");
  const [isPending, startTransition] = useTransition();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [p, e, b] = await Promise.all([obtenerPacientes(), obtenerEspecialistas(), obtenerBoxes()]);
      if (p.success) setPacientes(p.data || []);
      if (e.success) setEspecialistas(e.data || []);
      if (b.success) setBoxes(b.data || []);
    })();
  }, [open]);

  const onSubmit = () => {
    startTransition(async () => {
      const res = await actualizarTurno(turno.id_turno, {
        id_paciente: Number(pacienteId),
        id_especialista: especialistaId || null,
        id_box: typeof boxId === "number" ? boxId : null,
        fecha,
        hora,
        notas,
      } as any);

      if (res.success) {
        alert("Turno actualizado");
        onSaved?.();
        onClose();
      } else {
        alert(res.error || "Error");
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Editar turno</h2>
          <button onClick={onClose} className="text-sm">Cerrar</button>
        </div>

        <div className="grid gap-3">
          {/* mismos campos que en NuevoTurnoDialog, con valores iniciales */}
          {/* Paciente */}
          <div className="flex flex-col">
            <label className="text-xs mb-1">Paciente</label>
            <select className="border rounded px-3 py-2" value={pacienteId}
                    onChange={e=>setPacienteId(Number(e.target.value))}>
              {pacientes.map(p => (
                <option key={p.id_paciente} value={p.id_paciente}>
                  {p.apellido}, {p.nombre} — DNI {p.dni}
                </option>
              ))}
            </select>
          </div>

          {/* Especialista */}
          <div className="flex flex-col">
            <label className="text-xs mb-1">Especialista</label>
            <select className="border rounded px-3 py-2" value={especialistaId}
                    onChange={e=>setEspecialistaId(e.target.value)}>
              <option value="">Sin cambio</option>
              {especialistas.map(e => (
                <option key={e.id_usuario} value={e.id_usuario}>
                  {e.apellido}, {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Box */}
          <div className="flex flex-col">
            <label className="text-xs mb-1">Box</label>
            <select className="border rounded px-3 py-2" value={String(boxId)}
                    onChange={e=>setBoxId(e.target.value===""? "" : Number(e.target.value))}>
              <option value="">Sin asignar</option>
              {boxes.map(b => (
                <option key={b.id_box} value={b.id_box}>Box {b.numero}</option>
              ))}
            </select>
          </div>

          {/* Fecha / Hora / Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-xs mb-1">Fecha</label>
              <input type="date" className="border rounded px-3 py-2" value={fecha} onChange={e=>setFecha(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs mb-1">Hora</label>
              <input type="time" className="border rounded px-3 py-2" value={hora} onChange={e=>setHora(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs mb-1">Notas</label>
            <textarea className="border rounded px-3 py-2" rows={3} value={notas} onChange={e=>setNotas(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 rounded border">Cancelar</button>
            <button
              onClick={onSubmit}
              disabled={isPending}
              className="px-3 py-2 rounded bg-rose-700 text-white hover:bg-rose-800"
            >
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
