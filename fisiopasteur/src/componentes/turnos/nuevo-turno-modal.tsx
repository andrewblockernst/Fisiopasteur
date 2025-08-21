"use client";

import { useEffect, useState, useTransition } from "react";
import {
  crearTurno,
  verificarDisponibilidad,
  obtenerPacientes,
  obtenerEspecialistas,
  obtenerEspecialidades,
  obtenerBoxes,
} from "@/lib/actions/turno.action";

type Props = { open: boolean; onClose: () => void; onCreated?: () => void };

export default function NuevoTurnoDialog({ open, onClose, onCreated }: Props) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [especialistaId, setEspecialistaId] = useState<string | "">("");
  const [especialidadId, setEspecialidadId] = useState<number | "">(""); // Cambié de string a number
  const [boxId, setBoxId] = useState<number | "">("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [observaciones, setObservaciones] = useState(""); // Cambié de notas a observaciones
  const [disponible, setDisponible] = useState<null | boolean>(null);
  const [isPending, startTransition] = useTransition();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [p, e, esp, b] = await Promise.all([
        obtenerPacientes(),        
        obtenerEspecialistas(),     
        obtenerEspecialidades(),    
        obtenerBoxes(),             
      ]);
      if (p.success) setPacientes(p.data || []);
      if (e.success) setEspecialistas(e.data || []);
      if (esp.success) setEspecialidades(esp.data || []); // Agregué esta línea que faltaba
      if (b.success) setBoxes(b.data || []);
    })();
  }, [open]);

  // Check disponibilidad cada vez que cambian fecha/hora/especialista/box
  useEffect(() => {
    (async () => {
      if (!fecha || !hora || !especialistaId) {
        setDisponible(null);
        return;
      }
      const res = await verificarDisponibilidad(
        fecha,
        hora,
        especialistaId || undefined,
        typeof boxId === "number" ? boxId : undefined
      );
      setDisponible(res.success ? (res.disponible ?? null) : null);
    })();
  }, [fecha, hora, especialistaId, boxId]);

  const onSubmit = () => {
    if (!pacienteId || !especialistaId || !especialidadId || !fecha || !hora) {
      alert("Completá paciente, especialista, especialidad, fecha y hora.");
      return;
    }
    if (disponible === false) {
      alert("Ese horario no está disponible.");
      return;
    }

    startTransition(async () => {
      const res = await crearTurno({
        id_paciente: Number(pacienteId),
        id_especialista: String(especialistaId),
        id_especialidad: Number(especialidadId), 
        id_box: typeof boxId === "number" ? boxId : null,
        fecha,
        hora,
        estado: "programado",
        observaciones, // Cambié de notas a observaciones
      } as any);

      if (res.success) {
        alert("Turno creado");
        onCreated?.();
        onClose();
      } else {
        alert(res.error || "Error al crear turno");
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nuevo turno</h2>
          <button onClick={onClose} className="text-sm">Cerrar</button>
        </div>

        <div className="grid gap-3">
          {/* Paciente */}
          <div className="flex flex-col">
            <label className="text-xs mb-1">Paciente</label>
            <select
              className="border rounded px-3 py-2"
              value={pacienteId}
              onChange={e => setPacienteId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Seleccionar…</option>
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
            <select
              className="border rounded px-3 py-2"
              value={especialistaId}
              onChange={e => setEspecialistaId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {especialistas.map(e => (
                <option key={e.id_usuario} value={e.id_usuario}>
                  {e.apellido}, {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Especialidad */}
          <div className="flex flex-col">
            <label className="text-xs mb-1">Especialidad</label>
            <select
              className="border rounded px-3 py-2"
              value={especialidadId}
              onChange={e => setEspecialidadId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Seleccionar…</option>
              {especialidades.map(esp => (
                <option key={esp.id_especialidad} value={esp.id_especialidad}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Box (opcional) */}
          <div className="flex flex-col">
            <label className="text-xs mb-1">Box (opcional)</label>
            <select
              className="border rounded px-3 py-2"
              value={String(boxId)}
              onChange={e => {
                const v = e.target.value;
                setBoxId(v === "" ? "" : Number(v));
              }}
            >
              <option value="">Sin asignar</option>
              {boxes.map(b => (
                <option key={b.id_box} value={b.id_box}>
                  Box {b.numero}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha y hora */}
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

          {/* Observaciones */}
          <div className="flex flex-col">
            <label className="text-xs mb-1">Observaciones (opcional)</label>
            <textarea className="border rounded px-3 py-2" rows={3} value={observaciones} onChange={e=>setObservaciones(e.target.value)} />
          </div>

          {/* Estado disponibilidad */}
          {disponible !== null && (
            <div className={`text-sm ${disponible ? "text-green-700" : "text-red-700"}`}>
              {disponible ? "Horario disponible" : "Horario NO disponible"}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 rounded border">Cancelar</button>
            <button
              onClick={onSubmit}
              disabled={isPending}
              className="px-3 py-2 rounded bg-rose-700 text-white hover:bg-rose-800"
            >
              {isPending ? "Guardando…" : "Crear turno"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}