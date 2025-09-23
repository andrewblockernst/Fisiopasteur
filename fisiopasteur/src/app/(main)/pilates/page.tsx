'use client'

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import Button from "@/componentes/boton";
import { crearTurno, obtenerTurnosConFiltros, obtenerPacientes, obtenerEspecialistas } from "@/lib/actions/turno.action";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

const horariosDisponibles = [
  '8:00', '9:00', '10:00', '11:00', 
  '14:30', '15:30', '16:30', '17:30', 
  '18:30', '19:30', '20:30', '21:30'
];

function getWeekDays(fecha: Date) {
  const start = startOfWeek(fecha, { weekStartsOn: 1 }); // Lunes
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export default function PilatesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);

  const [turnos, setTurnos] = useState<any[]>([]);
  const [semanaBase, setSemanaBase] = useState<Date>(new Date);

  // Especialistas y pacientes
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [especialistaId, setEspecialistaId] = useState<string>('');
  const [pacientesSeleccionados, setPacientesSeleccionados] = useState<number[]>([]);
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    // Traer turnos de la semana
    const desde = format(startOfWeek(semanaBase, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const hasta = format(addDays(startOfWeek(semanaBase, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
    obtenerTurnosConFiltros({ fecha_desde: desde, fecha_hasta: hasta }).then((res: any) => {
      if (res.success && Array.isArray(res.data)) {
        // Mapeo para agregar color del especialista
        const turnosConColor = res.data.map((t: any) => {
          const especialista = especialistas.find(e => String(e.id_usuario) === String(t.id_especialista));
          return {
            ...t,
            especialista_color: especialista?.color || "#e0e7ff"
          };
        });
        setTurnos(turnosConColor);
      }
    });
  }, [semanaBase, especialistas]);

  useEffect(() => {
    // Traer especialistas solo de pilates (id_especialidad === 4)
    obtenerEspecialistas().then((res: any) => {
      if (res.success && Array.isArray(res.data)) {
        const pilates = res.data.filter((e: any) => {
          const principal = e.especialidad?.id_especialidad === 4;
          const adicional = Array.isArray(e.usuario_especialidad)
            ? e.usuario_especialidad.some((ue: any) => ue.especialidad?.id_especialidad === 4)
            : false;
          return principal || adicional;
        });
        setEspecialistas(pilates);
      }
    });
    // Traer pacientes
    obtenerPacientes().then((res: any) => {
      if (res.success && Array.isArray(res.data)) {
        const lista = res.data.map((p: any) => ({
          id_paciente: p.id_paciente,
          nombre: p.nombre,
          apellido: p.apellido,
        }));
        setPacientes(lista);
      }
    });
  }, []);

  const weekDays = getWeekDays(semanaBase);

  const handleAgregarTurno = (dia: Date, horario: string) => {
    setDiaSeleccionado(dia);
    setHorarioSeleccionado(horario);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setHorarioSeleccionado(null);
    setDiaSeleccionado(null);
    setEspecialistaId('');
    setPacientesSeleccionados([]);
    setObservaciones("");
  };

  const handlePacienteClick = (pacienteId: number) => {
    setPacientesSeleccionados(prev => {
      if (prev.includes(pacienteId)) {
        return prev.filter(pid => pid !== pacienteId);
      } else if (prev.length < 4) {
        return [...prev, pacienteId];
      } else {
        return prev;
      }
    });
  };

  const handleGuardarTurno = async () => {
    if (
      !diaSeleccionado ||
      !horarioSeleccionado ||
      !especialistaId ||
      pacientesSeleccionados.length === 0
    ) {
      return;
    }

    const fecha = format(diaSeleccionado, "yyyy-MM-dd");
    const hora = horarioSeleccionado;
    const especialidad_id = 4; // Pilates
    const plan = "particular";

    for (const paciente_id of pacientesSeleccionados) { 
      await crearTurno({
        fecha,
        hora,
        id_especialista: especialistaId, 
        id_especialidad: especialidad_id, 
        id_paciente: paciente_id,         
        estado: "pendiente",              
        observaciones,
      });
    }

    // Refrescar turnos (el mapeo de color se hace en el useEffect de arriba)
    const desde = format(startOfWeek(semanaBase, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const hasta = format(addDays(startOfWeek(semanaBase, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
    obtenerTurnosConFiltros({ fecha_desde: desde, fecha_hasta: hasta }).then((res: any) => {
      if (res.success && Array.isArray(res.data)) {
        const turnosConColor = res.data.map((t: any) => {
          const especialista = especialistas.find(e => String(e.id_usuario) === String(t.id_especialista));
          return {
            ...t,
            especialista_color: especialista?.color || "#e0e7ff"
          };
        });
        setTurnos(turnosConColor);
      }
    });

    handleCloseDialog();
  };

  return (
    <div className="min-h-screen text-black">
      <h1 className="text-3xl font-bold mb-4">Turnos de Pilates</h1>
      {/* Navegación de semana */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="secondary" onClick={() => setSemanaBase(addDays(semanaBase, -7))}>Anterior</Button>
        <span className="font-semibold text-lg">
          {format(weekDays[0], "d MMM", { locale: es })} - {format(weekDays[6], "d MMM yyyy", { locale: es })}
        </span>
        <Button variant="secondary" onClick={() => setSemanaBase(addDays(semanaBase, 7))}>Siguiente</Button>
      </div>
      {/* Calendario semanal */}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-gray-50">Horario</th>
              {weekDays.map((dia) => (
                <th key={dia.toISOString()} className="border px-2 py-1 bg-gray-50">
                  {format(dia, "EEE dd/MM", { locale: es })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horariosDisponibles.map((horario) => (
              <tr key={horario}>
                <td className="border px-2 py-1 font-semibold">{horario}</td>
                {weekDays.map((dia) => {
                  const fechaStr = format(dia, "yyyy-MM-dd");
                  const turno = turnos.find(
                    (t: any) => t.fecha === fechaStr && t.hora === horario
                  );
                  return (
                    <td
                      key={fechaStr + horario}
                      className="border px-1 py-0.5 align-top group relative"
                      style={{ minWidth: "90px", height: "28px", verticalAlign: "top" }}
                    >
                      {turno ? (
                        <div
                          className="flex flex-col items-start gap-0.5 mb-1 px-1 py-0.5 rounded"
                          style={{
                            background: "#fff",
                            border: "1px solid #eee",
                            fontSize: "0.90em",
                            minHeight: "18px",
                            maxHeight: "22px",
                            lineHeight: "1.1"
                          }}
                        >
                          <span className="truncate font-semibold">{turno.paciente_nombre}</span>
                          <span className="truncate text-xs text-gray-600">{turno.especialista_nombre}</span>
                        </div>
                      ) : null}
                      {/* Botón "+" solo visible en hover */}
                      <button
                        className="absolute top-1 right-1 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Agregar turno"
                        onClick={() => handleAgregarTurno(dia, horario)}
                        style={{ zIndex: 10 }}
                      >
                        +
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Diálogo para agregar turno */}
      {showDialog && (
        <BaseDialog
          type="info"
          size="md"
          title="Agregar Turno de Pilates"
          message={
            <div>
              <p>
                Día: <b>{diaSeleccionado ? format(diaSeleccionado, "EEEE dd/MM", { locale: es }) : ""}</b>
                <br />
                Horario: <b>{horarioSeleccionado}</b>
              </p>
              {/* Selección de especialista */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Especialista*</label>
                <select
                  className="w-full border rounded px-3 py-2 mb-2"
                  value={especialistaId}
                  onChange={e => setEspecialistaId(e.target.value)}
                >
                  <option value="">Seleccionar especialista</option>
                  {especialistas.map(e => (
                    <option key={e.id_usuario} value={String(e.id_usuario)}>
                      {e.nombre} {e.apellido}
                    </option>
                  ))}
                </select>
              </div>
              {/* Selección de pacientes */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Pacientes (máx. 4)</label>
                <div className="max-h-60 overflow-y-auto border rounded">
                  {pacientes.map(p => (
                    <label key={p.id_paciente} className="flex items-center gap-2 cursor-pointer px-2 py-1">
                      <input
                        type="checkbox"
                        checked={pacientesSeleccionados.includes(p.id_paciente)}
                        onChange={() => handlePacienteClick(p.id_paciente)}
                        disabled={
                          !pacientesSeleccionados.includes(p.id_paciente) &&
                          pacientesSeleccionados.length >= 4
                        }
                      />
                      <span>{p.nombre} {p.apellido}</span>
                    </label>
                  ))}
                </div>
                {pacientesSeleccionados.length === 4 && (
                  <p className="text-xs text-red-500 mt-1">Máximo 4 pacientes por turno.</p>
                )}
              </div>
              {/* Observaciones */}
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Observaciones"
                  className="w-full border rounded px-3 py-2"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                />
              </div>
            </div>
          }
          primaryButton={{
            text: "Guardar Turno",
            onClick: handleGuardarTurno
          }}
          secondaryButton={{
            text: "Cancelar",
            onClick: handleCloseDialog
          }}
          onClose={handleCloseDialog}
          showCloseButton
          isOpen={showDialog}
        />
      )}
    </div>
  );
}