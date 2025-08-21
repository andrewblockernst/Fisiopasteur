"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "@/componentes/boton";

export default function FiltrosTurnos({ especialistas, especialidades, boxes, initial }: any) {
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState(initial);

  useEffect(() => setF(initial), [params]); // sync si cambian params

  const apply = () => {
    const usp = new URLSearchParams();
    if (f.fecha_desde) usp.set("desde", f.fecha_desde);
    if (f.fecha_hasta) usp.set("hasta", f.fecha_hasta);
    if (f.especialista_id) usp.set("especialista", f.especialista_id);
    if (f.especialidad_id) usp.set("especialidad", f.especialidad_id);
    if (f.hora_desde) usp.set("hdesde", f.hora_desde);
    if (f.hora_hasta) usp.set("hhasta", f.hora_hasta);
    if (f.estado) usp.set("estado", f.estado);
    router.push(`/turnos?${usp.toString()}`);
  };

  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      {/* Fecha desde */}
      <div>
        <label className="text-xs mb-1">Fecha desde</label>
        <input
          type="date"
          className="border rounded px-3 py-2 w-full"
          value={f.fecha_desde || ""}
          onChange={e => setF({ ...f, fecha_desde: e.target.value })}
        />
      </div>
      {/* Fecha hasta */}
      <div>
        <label className="text-xs mb-1">Fecha hasta</label>
        <input
          type="date"
          className="border rounded px-3 py-2 w-full"
          value={f.fecha_hasta || ""}
          onChange={e => setF({ ...f, fecha_hasta: e.target.value })}
        />
      </div>
      {/* Especialista */}
      <div>
        <label className="text-xs mb-1">Especialista</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={f.especialista_id || ""}
          onChange={e => setF({ ...f, especialista_id: e.target.value })}
        >
          <option value="">Todos</option>
          {especialistas.map((esp: any) => (
            <option key={esp.id_usuario} value={esp.id_usuario}>
              {esp.apellido}, {esp.nombre}
            </option>
          ))}
        </select>
      </div>
      {/* Especialidad */}
      <div>
        <label className="text-xs mb-1">Especialidad</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={f.especialidad_id || ""}
          onChange={e => setF({ ...f, especialidad_id: e.target.value })}
        >
          <option value="">Todas</option>
          {especialidades.map((esp: any) => (
            <option key={esp.id_especialidad} value={esp.id_especialidad}>
              {esp.nombre}
            </option>
          ))}
        </select>
      </div>
      {/* Hora desde */}
      <div>
        <label className="text-xs mb-1">Hora desde</label>
        <input
          type="time"
          className="border rounded px-3 py-2 w-full"
          value={f.hora_desde || ""}
          onChange={e => setF({ ...f, hora_desde: e.target.value })}
        />
      </div>
      {/* Hora hasta */}
      <div>
        <label className="text-xs mb-1">Hora hasta</label>
        <input
          type="time"
          className="border rounded px-3 py-2 w-full"
          value={f.hora_hasta || ""}
          onChange={e => setF({ ...f, hora_hasta: e.target.value })}
        />
      </div>
      {/* Botones */}
      <div className="sm:col-span-2 lg:col-span-6 flex gap-2">
        <Button variant="primary" onClick={apply}>
          Aplicar
        </Button>
        <Button variant="secondary" onClick={() => router.push("/turnos")}>
          Limpiar
          </Button>
      </div>
    </div>
  );
}