"use client";
import { useState } from "react";
import NuevoTurnoDialog from "@/componentes/turnos/nuevo-turno-modal";
import AccionesTurno from "@/componentes/turnos/acciones-turno";

export default function TurnosTable({ turnos }: { turnos: any[] }) {
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Turnos</h1>
        <button
          onClick={() => setOpenNew(true)}
          className="px-3 py-2 rounded bg-rose-700 text-white hover:bg-rose-800"
        >
          Nuevo turno
        </button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Hora</th>
              <th className="text-left p-2">Paciente</th>
              <th className="text-left p-2">Especialista</th>
              <th className="text-left p-2">Box</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {turnos?.map((t) => (
              <tr key={t.id_turno} className="border-t">
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
                <td className="p-2">{t.box?.numero ?? "-"}</td>
                <td className="p-2 capitalize">{t.estado}</td>
                <td className="p-2">
                  <AccionesTurno turno={t} />
                </td>
              </tr>
            ))}
            {(!turnos || turnos.length === 0) && (
              <tr><td className="p-3 text-center text-neutral-500" colSpan={7}>Sin turnos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <NuevoTurnoDialog open={openNew} onClose={() => setOpenNew(false)} onCreated={() => { /* opcional */ }} />
    </div>
  );
}
