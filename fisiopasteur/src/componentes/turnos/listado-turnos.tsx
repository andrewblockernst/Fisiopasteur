"use client";
import { useState } from "react";
import NuevoTurnoDialog from "@/componentes/turnos/nuevo-turno-modal";
import AccionesTurno from "@/componentes/turnos/acciones-turno";
import Button from "../boton";

export default function TurnosTable({ turnos }: { turnos: any[] }) {
  console.log(turnos); // <-- agregá esto temporalmente
  const [openNew, setOpenNew] = useState(false);

  // Función para determinar el color de fondo de la fila
const getRowClassName = (turno: any) => {
  let baseClass = "border-t";
  if (turno.estado === 'atendido') {
    baseClass += " bg-green-400";
  }
  if (turno.estado === 'cancelado') {
    baseClass += " bg-red-400";
  }
  return baseClass;
};

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Turnos</h1>
        <Button
          variant="primary"
          onClick={() => setOpenNew(true)}
        >
          Nuevo turno
        </Button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Hora</th>
              <th className="text-left p-2">Paciente</th>
              <th className="text-left p-2">Especialista</th>
              <th className="text-left p-2">Especialidad</th>
              <th className="text-left p-2">Box</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Observaciones</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {turnos?.map((t) => (
              <tr key={t.id_turno} className={getRowClassName(t)}>
                <td className="p-2">{t.fecha}</td>
                <td className="p-2">{t.hora}</td>
                <td className="p-2">
                  {t.paciente?.apellido}, {t.paciente?.nombre}
                </td>
                <td className="p-2">
                  <span
                    className="inline-flex items-center gap-2"
                    style={{ ['--dot' as any]: t.especialista?.color || '#999' }}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: t.especialista?.color || '#999' }}
                    />
                    {t.especialista?.apellido}, {t.especialista?.nombre}
                  </span>
                </td>
                <td className="p-2 font-medium text-blue-700">
                  {/* Muestra la especialidad del turno, o la del especialista, o "-" */}
                  {t.especialidad?.nombre ||
                   t.especialista?.especialidad?.nombre ||
                   "-"}
                </td>
                <td className="p-2">{t.box?.numero ?? "-"}</td>
                <td className="p-2 capitalize">{t.estado}</td>
                <td className="p-2 text-gray-600 max-w-xs truncate" title={t.observaciones || ''}>
                  {t.observaciones || "-"}
                </td>
                <td className="p-2">
                  <AccionesTurno turno={t} onDone={() => window.location.reload()} />
                </td>
              </tr>
            ))}
            {(!turnos || turnos.length === 0) && (
              <tr><td className="p-3 text-center text-neutral-500" colSpan={9}>Sin turnos para hoy</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <NuevoTurnoDialog open={openNew} onClose={() => setOpenNew(false)}
      onCreated={() => window.location.reload()} />
    </div>
  );
}