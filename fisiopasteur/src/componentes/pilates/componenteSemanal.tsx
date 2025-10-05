'use client'
import { useState } from "react";
import { addDays, format, startOfWeek, isToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Eye } from "lucide-react";

interface PilatesCalendarioSemanalProps {
  turnos: any[];
  semanaBase: Date;
  onSemanaChange: (fecha: Date) => void;
  onAgregarTurno: (dia: Date, horario: string) => void;
  onVerTurno?: (turnos: any[]) => void;
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
  onVerTurno,
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

  // Agrupar turnos por especialista
  const agruparTurnosPorEspecialista = (turnosSlot: any[]) => {
    const grupos: { [key: string]: any[] } = {};
    
    turnosSlot.forEach(turno => {
      const especialistaId = turno.id_especialista;
      if (!grupos[especialistaId]) {
        grupos[especialistaId] = [];
      }
      grupos[especialistaId].push(turno);
    });
    
    return grupos;
  };

  // Verificar si un slot está ocupado
  const isSlotOcupado = (dia: Date, horario: string) => {
    const turnosEnSlot = getTurnosParaSlot(dia, horario);
    const grupos = agruparTurnosPorEspecialista(turnosEnSlot);
    
    // Si hay múltiples especialistas, está mal configurado
    if (Object.keys(grupos).length > 1) {
      return true;
    }
    
    return turnosEnSlot.length >= 4; // Máximo 4 personas por clase
  };

  // Obtener el color de fondo según la ocupación
  const getSlotBackgroundColor = (dia: Date, horario: string) => {
    const turnosEnSlot = getTurnosParaSlot(dia, horario);
    const grupos = agruparTurnosPorEspecialista(turnosEnSlot);
    
    // Si hay múltiples especialistas, mostrar error
    if (Object.keys(grupos).length > 1) {
      return "bg-red-100 border-red-300";
    }
    
    const count = turnosEnSlot.length;
    
    if (count === 0) return "bg-gray-50 hover:bg-gray-100";
    if (count === 1) return "bg-green-50 hover:bg-green-100";
    if (count === 2) return "bg-yellow-50 hover:bg-yellow-100";
    if (count === 3) return "bg-orange-50 hover:bg-orange-100";
    if (count >= 4) return "bg-red-50";
    
    return "bg-gray-50 hover:bg-gray-100";
  };

  // Renderizar el contenido de un slot con clase
  const renderClaseContent = (dia: Date, horario: string) => {
    const turnosEnSlot = getTurnosParaSlot(dia, horario);
    const grupos = agruparTurnosPorEspecialista(turnosEnSlot);
    
    if (turnosEnSlot.length === 0) {
      return null;
    }

    // Si hay múltiples especialistas (error de configuración)
    if (Object.keys(grupos).length > 1) {
      return (
        <div className="h-full flex flex-col justify-center items-center text-center p-2">
          <div className="text-xs font-medium text-red-600 mb-1">⚠️ CONFLICTO</div>
          <div className="text-xs text-red-500 mb-2">Múltiples especialistas</div>
          <button 
            onClick={() => onVerTurno?.(turnosEnSlot)}
            className="text-xs text-red-600 underline hover:text-red-800"
          >
            Ver detalles
          </button>
        </div>
      );
    }

    // Clase normal con un especialista
    const especialistaId = Object.keys(grupos)[0];
    const turnosEspecialista = grupos[especialistaId];
    const especialista = especialistas.find(e => String(e.id_usuario) === String(especialistaId));
    const color = especialista?.color || "#e0e7ff";

    // Calcular espacios disponibles
    const espaciosDisponibles = 4 - turnosEspecialista.length;

    return (
      <div 
        className="h-full w full p-2 rounded-lg cursor-pointer hover:shadow-md transition-all"
        style={{ 
          backgroundColor: color + "40",
          border: `2px solid ${color}`
        }}
        onClick={() => onVerTurno?.(turnosEnSlot)}
      >
        {/* Horario en la esquina superior derecha */}
        <div className="text-right mb-1">
          <span className="text-xs font-medium text-gray-700 bg-white bg-opacity-60 px-1 rounded">
            {horario}
          </span>
        </div>

        {/* Nombre del especialista */}
        <div className="text-sm font-semibold text-gray-800 mb-2 text-center">
          {especialista?.nombre} {especialista?.apellido}
        </div>

        {/* Lista de participantes */}
        <div className="space-y-1 mb-2">
          {turnosEspecialista.map((turno, index) => (
            <div key={turno.id_turno} className="flex items-center text-xs text-gray-700">
              <span className="w-1 h-1 bg-gray-600 rounded-full mr-2 flex-shrink-0"></span>
              <span className="truncate">
                {turno.paciente?.nombre} {turno.paciente?.apellido}
              </span>
            </div>
          ))}
          
          {/* Mostrar espacios disponibles */}
          {Array.from({ length: espaciosDisponibles }, (_, index) => (
            <div key={`disponible-${index}`} className="flex items-center text-xs text-gray-500">
              <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
              <span className="italic">Lugar disponible</span>
            </div>
          ))}
        </div>

        {/* Indicador de capacidad en la parte inferior */}
        <div className="text-center">
          <span className="text-xs font-medium text-gray-600 bg-white bg-opacity-60 px-2 py-1 rounded-full">
            {turnosEspecialista.length}/4
          </span>
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

        {/* Leyenda de ocupación */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="text-gray-600">Ocupación:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span className="text-gray-700">1 participante</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-200 rounded"></div>
            <span className="text-gray-700">2 participantes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-200 rounded"></div>
            <span className="text-gray-700">3 participantes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-200 rounded"></div>
            <span className="text-gray-700">Completo (4)</span>
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
                const tieneClase = turnosEnSlot.length > 0;

                return (
                  <div
                    key={`${horario}-${diaIndex}`}
                    className={`
                      border-b border-l border-gray-200 min-h-[120px] relative
                      ${!tieneClase ? bgColor : ''}
                      ${!isOcupado && !tieneClase ? 'cursor-pointer' : ''}
                      transition-colors
                    `}
                    onClick={() => !isOcupado && !tieneClase && onAgregarTurno(dia, horario)}
                  >
                    {/* Slot vacío */}
                    {!tieneClase && (
                      <>
                        {/* Botón de agregar */}
                        <div className="absolute top-2 right-2">
                          <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </div>
                        
                        {/* Contador de participantes */}
                        <div className="absolute top-2 left-2 text-xs font-medium text-gray-600">
                          0/4
                        </div>
                      </>
                    )}

                    {/* Slot con clase */}
                    {tieneClase && (
                      <div className="h-full p-1">
                        {renderClaseContent(dia, horario)}
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