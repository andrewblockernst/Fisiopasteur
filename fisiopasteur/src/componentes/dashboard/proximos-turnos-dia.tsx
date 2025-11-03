"use client";

import { Clock, MapPin, Phone, AlertCircle } from "lucide-react";

interface ProximoTurnoProps {
  id_turno: number;
  hora: string;
  nombrePaciente: string;
  apellidoPaciente: string;
  especialista: string;
  box: number | null;
  estado: string;
  telefono: string;
}

function getEstadoBadge(estado: string) {
  const estilos: Record<string, { bg: string; text: string; etiqueta: string }> = {
    programado: { bg: "bg-blue-100", text: "text-blue-800", etiqueta: "Programado" },
    completado: { bg: "bg-green-100", text: "text-green-800", etiqueta: "Completado" },
    cancelado: { bg: "bg-red-100", text: "text-red-800", etiqueta: "Cancelado" },
    ausencia: { bg: "bg-orange-100", text: "text-orange-800", etiqueta: "No asistió" },
  };

  return estilos[estado] || { bg: "bg-gray-100", text: "text-gray-800", etiqueta: "Desconocido" };
}

function TurnoCard({ 
  hora, 
  nombrePaciente, 
  apellidoPaciente, 
  especialista, 
  box, 
  estado, 
  telefono 
}: ProximoTurnoProps) {
  const estadoInfo = getEstadoBadge(estado);
  const horaNum = parseInt(hora.split(":")[0]);
  const ahora = new Date().getHours();
  const estaProximo = horaNum === ahora && estado === "programado";

  return (
    <div
      className={`bg-white rounded-lg border-l-4 p-4 hover:shadow-md transition-all ${
        estaProximo
          ? "border-l-red-500 bg-red-50 shadow-md"
          : "border-l-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Columna izquierda: Hora y paciente */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-lg font-bold text-gray-900">{hora}</span>
            {estaProximo && (
              <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold animate-pulse">
                <AlertCircle className="w-3 h-3" />
                EN PROGRESO
              </div>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {nombrePaciente} {apellidoPaciente}
          </p>
          <p className="text-xs text-gray-600 truncate">{especialista}</p>
        </div>

        {/* Columna central: Box */}
        {box && (
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded text-sm">
            <MapPin className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900">Box {box}</span>
          </div>
        )}

        {/* Columna derecha: Estado */}
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoInfo.bg} ${estadoInfo.text}`}>
            {estadoInfo.etiqueta}
          </span>
          {/* {telefono && (
            <a
              href={`tel:${telefono}`}
              className="text-gray-600 hover:text-blue-600 transition-colors"
              title={`Llamar a ${telefono}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          )} */}
        </div>
      </div>
    </div>
  );
}

interface ProximosTurnosProps {
  turnos: ProximoTurnoProps[];
  isLoading?: boolean;
}

export function ProximosTurnosDia({ turnos, isLoading = false }: ProximosTurnosProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Turnos del Día</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Turnos del Día</h2>

      {turnos && turnos.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {turnos.map((turno) => (
            <TurnoCard key={turno.id_turno} {...turno} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No hay turnos programados para hoy</p>
          <p className="text-gray-500 text-sm mt-1">Buen día para descansar 😊</p>
        </div>
      )}
    </div>
  );
}
