'use client'
import { useState } from "react";
import { addDays, format, startOfWeek, isToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface PilatesCalendarioSemanalProps {
  turnos: any[];
  semanaBase: Date;
  onSemanaChange: (fecha: Date) => void;
  onAgregarTurno: (dia: Date, horario: string) => void;
  especialistas: any[];
}

// Horarios disponibles para Pilates
const HORARIOS_PILATES = [
  "08:00", "09:00", "10:00", "11:00", 
  "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"
];

// Función para obtener días de la semana
function getWeekDays(fecha: Date) {
  const start = startOfWeek(fecha, { weekStartsOn: 1 }); // Lunes
  return Array.from({ length: 5 }, (_, i) => addDays(start, i)); // Solo lunes a viernes
}

export default function PilatesCalendarioSemanal({
  turnos,
  semanaBase,
  onSemanaChange,
  onAgregarTurno,
  especialistas
}: PilatesCalendarioSemanalProps) {
  const diasSemana = getWeekDays(semanaBase);

  // Navegación de semanas
  const irSemanaAnterior = () => {
    onSemanaChange(addDays(semanaBase, -7));
  };

  const irSemanaSiguiente = () => {
    onSemanaChange(addDays(semanaBase, 7));
  };

  const irSemanaActual = () => {
    onSemanaChange(new Date());
  };

  // Obtener turnos para un día y horario específico
  const getTurnosParaSlot = (dia: Date, horario: string) => {
    const fechaStr = format(dia, "yyyy-MM-dd");
    return turnos.filter(turno => 
      turno.fecha === fechaStr && 
      turno.hora?.substring(0, 5) === horario
    );
  };

  // Verificar si un slot está ocupado
  const isSlotOcupado = (dia: Date, horario: string) => {
    const turnosEnSlot = getTurnosParaSlot(dia, horario);
    return turnosEnSlot.length >= 4; // Máximo 4 personas por clase
  };

  // Obtener el color de fondo según la ocupación
  const getSlotBackgroundColor = (dia: Date, horario: string) => {
    const turnosEnSlot = getTurnosParaSlot(dia, horario);
    const count = turnosEnSlot.length;
    
    if (count === 0) return "bg-gray-50 hover:bg-gray-100";
    if (count === 1) return "bg-green-50 hover:bg-green-100";
    if (count === 2) return "bg-yellow-50 hover:bg-yellow-100";
    if (count === 3) return "bg-orange-50 hover:bg-orange-100";
    if (count >= 4) return "bg-red-50";
    
    return "bg-gray-50 hover:bg-gray-100";
  };

  // Renderizar un turno individual
  const renderTurno = (turno: any) => {
    const especialista = especialistas.find(e => String(e.id_usuario) === String(turno.id_especialista));
    const color = especialista?.color || "#e0e7ff";
    
    return (
      <div
        key={turno.id_turno}
        className="text-xs p-1 rounded mb-1 border border-gray-200"
        style={{ 
          backgroundColor: color + "30",
          borderColor: color
        }}
        title={`${turno.paciente?.nombre} ${turno.paciente?.apellido} - ${especialista?.nombre} ${especialista?.apellido}`}
      >
        <div className="font-medium truncate">
          {turno.paciente?.nombre} {turno.paciente?.apellido}
        </div>
        <div className="text-gray-600 truncate">
          {especialista?.nombre} {especialista?.apellido}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header del calendario */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Pilates - Calendario Semanal
            </h1>
            <button
              onClick={irSemanaActual}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
            >
              Hoy
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={irSemanaAnterior}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
              {format(diasSemana[0], "dd MMM", { locale: es })} - {format(diasSemana[4], "dd MMM yyyy", { locale: es })}
            </span>
            
            <button
              onClick={irSemanaSiguiente}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Leyenda de dificultad */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="text-gray-600">Dificultad:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span>Principiante</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-200 rounded"></div>
            <span>Intermedio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-200 rounded"></div>
            <span>Avanzado</span>
          </div>
        </div>
      </div>

      {/* Grilla del calendario */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 min-w-[800px]">
          {/* Header de columnas */}
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="text-sm font-medium text-gray-700">Hora</div>
          </div>
          
          {diasSemana.map((dia, index) => (
            <div
              key={index}
              className={`p-2 border-b border-l border-gray-200 bg-gray-50 ${
                isToday(dia) ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700">
                  {format(dia, "EEEE", { locale: es })}
                </div>
                <div className={`text-lg font-semibold ${
                  isToday(dia) ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {format(dia, "dd/MM")}
                </div>
              </div>
            </div>
          ))}

          {/* Filas de horarios */}
          {HORARIOS_PILATES.map((horario, horarioIndex) => (
            <div key={horario} className="contents">
              {/* Columna de hora */}
              <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">{horario}</span>
              </div>

              {/* Celdas de días */}
              {diasSemana.map((dia, diaIndex) => {
                const turnosEnSlot = getTurnosParaSlot(dia, horario);
                const isOcupado = isSlotOcupado(dia, horario);
                const bgColor = getSlotBackgroundColor(dia, horario);

                return (
                  <div
                    key={`${horario}-${diaIndex}`}
                    className={`
                      border-b border-l border-gray-200 p-1 min-h-[80px] relative
                      ${bgColor}
                      ${!isOcupado ? 'cursor-pointer' : 'cursor-not-allowed'}
                      transition-colors
                    `}
                    onClick={() => !isOcupado && onAgregarTurno(dia, horario)}
                  >
                    {/* Botón de agregar */}
                    {!isOcupado && (
                      <div className="absolute top-1 right-1">
                        <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </div>
                    )}

                    {/* Contador de participantes */}
                    <div className="absolute top-1 left-1 text-xs text-gray-600">
                      {turnosEnSlot.length}/4
                    </div>

                    {/* Lista de turnos */}
                    <div className="mt-4 space-y-1">
                      {turnosEnSlot.map(renderTurno)}
                    </div>

                    {/* Indicador de lleno */}
                    {isOcupado && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-75">
                        <span className="text-xs font-medium text-red-600">COMPLETO</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}