"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltrosTurnos({ especialistas, boxes, initial }: any) {
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState(initial);

  useEffect(() => setF(initial), [params]); // sync si cambian params

  const apply = () => {
    const usp = new URLSearchParams();
    if (f.fecha_desde) usp.set("desde", f.fecha_desde);
    if (f.fecha_hasta) usp.set("hasta", f.fecha_hasta);
    if (f.especialista_id) usp.set("especialista", f.especialista_id);
    if (f.hora_desde) usp.set("hdesde", f.hora_desde);
    if (f.hora_hasta) usp.set("hhasta", f.hora_hasta);
    if (f.estado) usp.set("estado", f.estado);
    router.push(`/turnos?${usp.toString()}`);
  };

  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      <input type="date" value={f.fecha_desde || ""} onChange={(e)=>setF({...f,fecha_desde:e.target.value})} className="border rounded px-3 py-2"/>
      <input type="date" value={f.fecha_hasta || ""} onChange={(e)=>setF({...f,fecha_hasta:e.target.value})} className="border rounded px-3 py-2"/>
      <select value={f.especialista_id || ""} onChange={(e)=>setF({...f,especialista_id:e.target.value || undefined})} className="border rounded px-3 py-2">
        <option value="">Todos los especialistas</option>
        {especialistas?.map((e:any)=>(
          <option key={e.id_usuario} value={e.id_usuario}>{e.apellido}, {e.nombre}</option>
        ))}
      </select>
      <select value={f.estado || ""} onChange={(e)=>setF({...f,estado:e.target.value || undefined})} className="border rounded px-3 py-2">
        <option value="">Todos los estados</option>
        <option value="programado">Programado</option>
        <option value="cancelado">Cancelado</option>
        <option value="atendido">Atendido</option>
      </select>
      <input type="time" value={f.hora_desde || ""} onChange={(e)=>setF({...f,hora_desde:e.target.value})} className="border rounded px-3 py-2"/>
      <input type="time" value={f.hora_hasta || ""} onChange={(e)=>setF({...f,hora_hasta:e.target.value})} className="border rounded px-3 py-2"/>
      <div className="sm:col-span-2 lg:col-span-6 flex gap-2">
        <button onClick={apply} className="bg-[var(--brand)] text-white px-4 py-2 rounded">Aplicar</button>
        <button onClick={()=>router.push("/turnos")} className="border px-4 py-2 rounded">Limpiar</button>
      </div>
    </div>
  );
}
