"use client";
import { useState } from "react";
import NuevoTurnoModal from "@/componentes/calendario/nuevo-turno-dialog";
import AccionesTurno from "@/componentes/turnos/acciones-turno";
import Button from "../boton";

export default function TurnosTable({ turnos }: { turnos: any[] }) {

  const [openNew, setOpenNew] = useState(false);

  // Función para formatear fecha como DD/MM/YYYY
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr + 'T00:00:00'); // Evitar problemas de zona horaria
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Función para formatear hora como HH:MM
  const formatearHora = (horaStr: string) => {
    if (!horaStr) return '-';
    return horaStr.slice(0, 5); // Solo toma HH:MM
  };

  // Función para determinar el color de fondo de la fila
  const getRowClassName = (turno: any) => {
    let baseClass = "border-t hover:bg-gray-50 transition-colors";
    if (turno.estado === 'atendido') {
      baseClass += " bg-green-100";
    }
    if (turno.estado === 'cancelado') {
      baseClass += " bg-red-100";
    }
    return baseClass;
  };

  // Función para el estilo del texto según estado
  const getTextStyle = (turno: any) => {
    if (turno.estado === 'cancelado') {
      return "text-gray-500"; // Solo color más suave, sin tachado
    }
    return "text-gray-900";
  };

  // Función para verificar si es turno de Pilates
  const esTurnoPilates = (turno: any) => {
    // Verificar por nombre de especialidad (case insensitive)
    if (turno.especialidad && turno.especialidad.nombre) {
      return turno.especialidad.nombre.toLowerCase().includes('pilates');
    }
    return false;
  };

  // Filtrar turnos: excluir Pilates y luego ordenar
  const turnosOrdenados = turnos
    ?.filter(turno => !esTurnoPilates(turno)) // Filtrar Pilates
    ?.sort((a, b) => {
      // Prioridad por estado: programado (0),  (1), atendido (2), cancelado (3)
      const prioridadEstado = (estado: string) => {
        switch (estado?.toLowerCase()) {
          case 'programado': return 0;
          case '': return 1;
          case 'atendido': return 2;
          case 'cancelado': return 3;
          default: return 4;
        }
      };

      const prioridadA = prioridadEstado(a.estado || '');
      const prioridadB = prioridadEstado(b.estado || '');

      // Si tienen diferente estado, ordenar por prioridad
      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }

      // Si tienen el mismo estado, ordenar por fecha y hora
      const fechaA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
      const fechaB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
      return fechaA.getTime() - fechaB.getTime();
    }) || [];

  return (
    <div className="bg-white space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Turnos</h1>
        <Button
          variant="primary"
          onClick={() => setOpenNew(true)}
        >
          Nuevo turno
        </Button>
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium text-gray-600">Fecha</th>
              <th className="text-left p-3 font-medium text-gray-600">Hora</th>
              <th className="text-left p-3 font-medium text-gray-600">Paciente</th>
              <th className="text-left p-3 font-medium text-gray-600">Especialista</th>
              <th className="text-left p-3 font-medium text-gray-600">Especialidad</th>
              <th className="text-left p-3 font-medium text-gray-600">Box</th>
              <th className="text-left p-3 font-medium text-gray-600">Estado</th>
              <th className="text-left p-3 font-medium text-gray-600">Observaciones</th>
              <th className="text-left p-3 font-medium text-gray-600 w-16">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {turnosOrdenados.map((t) => (
              <tr key={t.id_turno} className={getRowClassName(t)}>
                <td className={`p-3 ${getTextStyle(t)}`}>
                  {formatearFecha(t.fecha)}
                </td>
                <td className={`p-3 font-mono ${getTextStyle(t)}`}>
                  {formatearHora(t.hora)}
                </td>
                <td className={`p-3 ${getTextStyle(t)}`}>
                  {t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : "Sin asignar"}
                </td>
                <td className={`p-3 ${getTextStyle(t)}`}>
                  {t.especialista ? (
                    <span className="inline-flex items-center gap-2">
                      <span 
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: t.especialista.color || '#9C1838' }}
                      />
                      {`${t.especialista.apellido}, ${t.especialista.nombre}`}
                    </span>
                  ) : "Sin asignar"}
                </td>
                <td className={`p-3 ${getTextStyle(t)}`}>
                  {t.especialidad ? t.especialidad.nombre : "Sin asignar"}
                </td>
                <td className={`p-3 text-center ${getTextStyle(t)}`}>
                  {t.box ? t.box.numero : "-"}
                </td>
                <td className={`p-3 capitalize ${getTextStyle(t)}`}>
                  {t.estado || "Sin estado"}
                </td>
                <td className={`p-3 text-gray-600 max-w-xs truncate ${t.estado === 'cancelado' ? 'text-gray-400' : ''}`} 
                    title={t.observaciones || ''}>
                  {t.observaciones || "-"}
                </td>
                <td className="p-3">
                  <AccionesTurno turno={t} onDone={() => window.location.reload()} />
                </td>
              </tr>
            ))}
            {(!turnosOrdenados || turnosOrdenados.length === 0) && (
              <tr>
                <td className="p-8 text-center text-gray-500" colSpan={9}>
                  <div className="flex flex-col items-center gap-2">
                    <span>No hay turnos para mostrar</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NuevoTurnoModal 
        isOpen={openNew} 
        onClose={() => setOpenNew(false)}
        onTurnoCreated={() => window.location.reload()}
      />
    </div>
  );
}