"use client";

import { useEffect, useState, useTransition } from "react";
import {
  crearTurno,
  verificarDisponibilidad,
  obtenerPacientes,
  obtenerEspecialistas,
  obtenerEspecialidades,
  obtenerBoxes,
  obtenerAgendaEspecialista,
} from "@/lib/actions/turno.action";
import BaseDialog from "../dialog/base-dialog";

type Props = { open: boolean; onClose: () => void; onCreated?: () => void };

const horasPosibles = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
  "20:00", "21:00", "22:00"
];

// Saber si el turno es en el pasado
function esTurnoEnPasado(fecha: string, hora: string) {
  if (!fecha || !hora) return false;
  const ahora = new Date();
  const fechaHoraTurno = new Date(`${fecha}T${hora}`);
  return fechaHoraTurno < ahora;
}

export default function NuevoTurnoDialog({ open, onClose, onCreated }: Props) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [especialistaId, setEspecialistaId] = useState<string | "">("");
  const [especialidadId, setEspecialidadId] = useState<number | "">("");
  const [tipoPlan, setTipoPlan] = useState<'particular' | 'obra_social'>('particular');
  const [precio, setPrecio] = useState<string>("");
  const [boxId, setBoxId] = useState<number | "">("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>(horasPosibles);
  const [observaciones, setObservaciones] = useState("");
  const [disponible, setDisponible] = useState<null | boolean>(null);
  const [isPending, startTransition] = useTransition();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  

  const [dialog, setDialog] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ open: false, type: 'success', message: '' });

  // Función para limpiar los campos del modal
  function limpiarCampos() {
    setPacienteId("");
    setEspecialistaId("");
    setEspecialidadId("");
    setTipoPlan('particular');
    setPrecio("");
    setBoxId("");
    setFecha("");
    setHora("");
    setObservaciones("");
    setDisponible(null);
    setEspecialidadesDisponibles([]);
  }

  // Limpiar al cerrar el modal
  useEffect(() => {
    if (!open) limpiarCampos();
  }, [open]);

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
      if (esp.success) setEspecialidades(esp.data || []);
      if (b.success) setBoxes(b.data || []);
    })();
  }, [open]);

  // Filtrar especialidades cuando cambia el especialista seleccionado
  useEffect(() => {
    if (!especialistaId || !especialistas.length) {
      setEspecialidadesDisponibles(especialidades); // Mostrar todas si no hay especialista
      return;
    }
    
    // Buscar el especialista seleccionado
    const especialistaSeleccionado = especialistas.find(e => e.id_usuario === especialistaId);
    
    if (especialistaSeleccionado) {
      // Obtener las especialidades del especialista
      let especialidadesDelEspecialista = [];
      
      // Si tiene especialidad principal
      if (especialistaSeleccionado.especialidad) {
        especialidadesDelEspecialista.push(especialistaSeleccionado.especialidad);
      }
      
      // Si tiene especialidades adicionales en usuario_especialidad
      if (especialistaSeleccionado.usuario_especialidad) {
        especialistaSeleccionado.usuario_especialidad.forEach((ue: any) => {
          if (ue.especialidad) {
            especialidadesDelEspecialista.push(ue.especialidad);
          }
        });
      }
      
      // Eliminar duplicados por id_especialidad
      const especialidadesUnicas = especialidadesDelEspecialista.filter((esp, index, arr) => 
        index === arr.findIndex(e => e.id_especialidad === esp.id_especialidad)
      );
      
      setEspecialidadesDisponibles(especialidadesUnicas);
      
      // Si la especialidad seleccionada no está en las disponibles, limpiarla
      if (especialidadId && !especialidadesUnicas.some(e => e.id_especialidad === especialidadId)) {
        setEspecialidadId("");
      }
    } else {
      setEspecialidadesDisponibles([]);
    }
  }, [especialistaId, especialistas, especialidades, especialidadId]);

  // Autocompletar precio según especialista + especialidad + plan
  useEffect(() => {
    (async () => {
      if (!especialistaId || !especialidadId || !tipoPlan) return;
      try {
        const { obtenerPrecioEspecialidad } = await import('@/lib/actions/turno.action');
        const res = await obtenerPrecioEspecialidad(String(especialistaId), Number(especialidadId), tipoPlan);
        if (res.success) setPrecio(res.precio != null ? String(res.precio) : "");
      } catch {}
    })();
  }, [especialistaId, especialidadId, tipoPlan]);

  // Filtrar horas ocupadas y pasadas
  useEffect(() => {
    if (!especialistaId || !fecha) {
      setHorasDisponibles(horasPosibles);
      return;
    }
    obtenerAgendaEspecialista(String(especialistaId), fecha).then(res => {
      let libres = horasPosibles;
      if (res.success && res.data) {
        // Filtra solo las horas que NO están ocupadas por ese especialista
        const horasOcupadas = res.data.map((t: any) => t.hora.slice(0,5)); // "15:00:00" => "15:00"
        libres = horasPosibles.filter(h => !horasOcupadas.includes(h));
      }
      // Filtrar horas pasadas si la fecha es hoy
      const hoy = new Date().toISOString().split("T")[0];
      if (fecha === hoy) {
        const ahora = new Date();
        libres = libres.filter(h => {
          const [hh, mm] = h.split(":");
          const horaTurno = new Date(`${fecha}T${hh}:${mm}`);
          return horaTurno > ahora;
        });
      }
      setHorasDisponibles(libres);
      if (hora && !libres.includes(hora)) setHora("");
    });
  }, [especialistaId, fecha, hora]);

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
        String(especialistaId),
        typeof boxId === "number" ? boxId : undefined
      );
      setDisponible(res.success ? (res.disponible ?? null) : null);
    })();
  }, [fecha, hora, especialistaId, boxId]);

  const onSubmit = () => {
    if (!pacienteId || !especialistaId || !especialidadId || !fecha || !hora) {
      setDialog({ open: true, type: 'error', message: "Completá paciente, especialista, especialidad, fecha y hora." });
      return;
    }
    if (esTurnoEnPasado(fecha, hora)) {
      setDialog({ open: true, type: 'error', message: "No se puede agendar un turno en el pasado." });
      return;
    }
    if (disponible === false) {
      setDialog({ open: true, type: 'error', message: "Ese horario no está disponible." });
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
        precio: precio ? Number(precio) : null,
        tipo_plan: tipoPlan,
        estado: "programado",
        observaciones,
      } as any);

      if (res.success) {
        setDialog({ open: true, type: 'success', message: "Turno creado" });
        limpiarCampos(); // limpiar después de crear
        onCreated?.();
        onClose();
      } else {
        setDialog({ open: true, type: 'error', message: res.error || "Error al crear turno" });
      }
    });
  };

  if (!open) return null;

  return (
    <>
      <BaseDialog
        type="info"
        size="lg"
        title="Nuevo turno"
        isOpen={open}
        onClose={onClose}
        showCloseButton
        message={
          <form
            className="grid gap-3 text-left"
            onSubmit={e => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {/* Paciente */}
            <div className="flex flex-col">
              <label className="text-xs mb-1">Paciente</label>
              <select
                className="border rounded px-3 py-2"
                value={pacienteId}
                onChange={e => setPacienteId(e.target.value ? Number(e.target.value) : "")}
                required
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
                required
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
                required
              >
                <option value="">Seleccionar…</option>
                {especialidadesDisponibles.map(esp => (
                  <option key={esp.id_especialidad} value={esp.id_especialidad}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
              {especialistaId && especialidadesDisponibles.length === 0 && (
                <span className="text-xs text-red-500 mt-1">
                  Este especialista no tiene especialidades asignadas
                </span>
              )}
            </div>

            {/* Plan */}
            <div className="flex flex-col">
              <label className="text-xs mb-1">Plan</label>
              <select
                className="border rounded px-3 py-2"
                value={tipoPlan}
                onChange={e => setTipoPlan(e.target.value as 'particular' | 'obra_social')}
              >
                <option value="particular">Particular</option>
                <option value="obra_social">Obra Social</option>
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
                <input type="date" className="border rounded px-3 py-2" value={fecha} onChange={e=>setFecha(e.target.value)} required />
              </div>
              <div className="flex flex-col">
                <label className="text-xs mb-1">Hora</label>
                <select
                  className="border rounded px-3 py-2"
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  required
                >
                  <option value="">Seleccionar…</option>
                  {horasDisponibles.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Precio */}
            <div className="flex flex-col">
              <label className="text-xs mb-1">Precio (ARS)</label>
              <input
                type="number"
                className="border rounded px-3 py-2"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0"
              />
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
          </form>
        }
        primaryButton={{
          text: isPending ? "Guardando…" : "Crear turno",
          onClick: onSubmit,
          disabled: esTurnoEnPasado(fecha, hora) || isPending, // deshabilita si es en el pasado o guardando
        }}
        secondaryButton={{
          text: "Cancelar",
          onClick: onClose,
        }}
      />

      {/* Modal para mostrar mensajes personalizados */}
      <BaseDialog
        type={dialog.type}
        size="sm"
        title={dialog.type === 'success' ? "Éxito" : "Error"}
        message={dialog.message}
        isOpen={dialog.open}
        onClose={() => setDialog({ ...dialog, open: false })}
        showCloseButton
        primaryButton={{
          text: "Aceptar",
          onClick: () => setDialog({ ...dialog, open: false }),
        }}
      />
    </>
  );
}
