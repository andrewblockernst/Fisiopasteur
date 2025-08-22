"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { useTurnoStore } from "@/stores/turno-store";
import type { TurnoConDetalles } from "@/stores/turno-store";

interface CalendarioTurnosProps {
  turnos: TurnoConDetalles[];
  especialistas: any[];
  especialistaSeleccionado: string;
  onEspecialistaChange: (especialistaId: string) => void;
  onDayClick: (date: Date, turnos: TurnoConDetalles[]) => void;
  onCreateTurno: (date: Date) => void;
}

type VistaCalendario = 'mes' | 'semana' | 'dia';

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_SEMANA_COMPLETOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function CalendarioTurnos({
  turnos,
  especialistas,
  especialistaSeleccionado,
  onEspecialistaChange,
  onDayClick,
  onCreateTurno
}: CalendarioTurnosProps) {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vista, setVista] = useState<VistaCalendario>('mes');
  const { getTurnosByDate } = useTurnoStore();

  // Detectar si es móvil
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const getTurnosParaDia = (fecha: Date) => {
    return getTurnosByDate(turnos, fecha);
  };

  const esDiaActual = (fecha: Date) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };

  const navegarFecha = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(fechaActual);
    
    if (vista === 'mes') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + (direccion === 'siguiente' ? 1 : -1));
    } else if (vista === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 7 : -7));
    } else if (vista === 'dia') {
      nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 1 : -1));
    }
    
    setFechaActual(nuevaFecha);
  };

  const obtenerTituloVista = () => {
    if (vista === 'mes') {
      return `${MESES[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;
    } else if (vista === 'semana') {
      const inicioSemana = new Date(fechaActual);
      inicioSemana.setDate(fechaActual.getDate() - fechaActual.getDay());
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      
      return `${inicioSemana.getDate()} - ${finSemana.getDate()} ${MESES[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;
    } else {
      return fechaActual.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const renderVistaMes = () => {
    const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaSemanaInicio = primerDia.getDay();

    const dias = [];
    
    // Días vacíos del mes anterior
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null);
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(new Date(fechaActual.getFullYear(), fechaActual.getMonth(), dia));
    }

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header días de la semana */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="p-3 text-center text-sm font-medium text-gray-600">
              {dia}
            </div>
          ))}
        </div>
        
        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {dias.map((fecha, index) => {
            if (!fecha) {
              return <div key={index} className="bg-white h-24 md:h-32" />;
            }
            
            const turnosDelDia = getTurnosParaDia(fecha);
            const esHoy = esDiaActual(fecha);
            
            return (
              <div key={index} className="bg-white h-24 md:h-32 p-1 relative group">
                <div
                  className={`
                    w-full h-full rounded cursor-pointer transition-colors relative
                    ${esHoy ? 'bg-[#9C1838] text-white' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => onDayClick(fecha, turnosDelDia)}
                >
                  <div className="p-2">
                    <span className={`text-sm font-medium ${esHoy ? 'text-white' : 'text-gray-900'}`}>
                      {fecha.getDate()}
                    </span>
                    
                    {/* Indicador de turnos */}
                    {turnosDelDia.length > 0 && (
                      <div className="mt-1">
                        <div className={`text-xs ${esHoy ? 'text-white' : 'text-[#9C1838]'}`}>
                          {turnosDelDia.length} turno{turnosDelDia.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Botón crear turno (visible en hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateTurno(fecha);
                    }}
                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#9C1838] text-white p-1 rounded text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVistaSemana = () => {
    const inicioSemana = new Date(fechaActual);
    inicioSemana.setDate(fechaActual.getDate() - fechaActual.getDay());
    
    const diasSemana = [];
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      diasSemana.push(dia);
    }

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header días de la semana */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {diasSemana.map((fecha, index) => {
            const esHoy = esDiaActual(fecha);
            return (
              <div key={index} className={`p-4 text-center border-r last:border-r-0 ${esHoy ? 'bg-[#9C1838] text-white' : ''}`}>
                <div className="text-sm font-medium">
                  {DIAS_SEMANA_COMPLETOS[index]}
                </div>
                <div className={`text-lg font-bold ${esHoy ? 'text-white' : 'text-gray-900'}`}>
                  {fecha.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Contenido de los días */}
        <div className="grid grid-cols-7 min-h-96">
          {diasSemana.map((fecha, index) => {
            const turnosDelDia = getTurnosParaDia(fecha);
            const esHoy = esDiaActual(fecha);
            
            return (
              <div key={index} className="border-r last:border-r-0 p-2 relative group">
                <div
                  className="cursor-pointer h-full"
                  onClick={() => onDayClick(fecha, turnosDelDia)}
                >
                  {/* Turnos del día */}
                  <div className="space-y-1">
                    {turnosDelDia.slice(0, 4).map((turno) => (
                      <div
                        key={turno.id_turno}
                        className="bg-blue-100 text-blue-800 text-xs p-1 rounded truncate"
                        style={{ backgroundColor: turno.especialista?.color + '20', color: turno.especialista?.color || '#9C1838' }}
                      >
                        {turno.hora} - {turno.paciente?.nombre}
                      </div>
                    ))}
                    {turnosDelDia.length > 4 && (
                      <div className="text-xs text-gray-500">
                        +{turnosDelDia.length - 4} más
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Botón crear turno */}
                <button
                  onClick={() => onCreateTurno(fecha)}
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#9C1838] text-white p-1 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVistaDia = () => {
    const turnosDelDia = getTurnosParaDia(fechaActual);
    const horas = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM a 7 PM

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {fechaActual.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            <button
              onClick={() => onCreateTurno(fechaActual)}
              className="bg-[#9C1838] text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Nuevo Turno
            </button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {horas.map((hora) => {
            const horaStr = `${hora.toString().padStart(2, '0')}:00`;
            const turnosHora = turnosDelDia.filter(t => t.hora.startsWith(hora.toString().padStart(2, '0')));
            
            return (
              <div key={hora} className="border-b flex">
                <div className="w-16 p-3 text-sm text-gray-500 border-r">
                  {horaStr}
                </div>
                <div className="flex-1 p-3 min-h-16">
                  {turnosHora.map((turno) => (
                    <div
                      key={turno.id_turno}
                      className="bg-blue-100 text-blue-800 p-2 rounded mb-1 cursor-pointer"
                      style={{ backgroundColor: turno.especialista?.color + '20', color: turno.especialista?.color || '#9C1838' }}
                      onClick={() => onDayClick(fechaActual, [turno])}
                    >
                      <div className="font-medium">{turno.paciente?.nombre} {turno.paciente?.apellido}</div>
                      <div className="text-xs">Dr. {turno.especialista?.nombre}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navegarFecha('anterior')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h2 className="text-xl font-bold text-gray-900 min-w-0">
            {obtenerTituloVista()}
          </h2>
          
          <button
            onClick={() => navegarFecha('siguiente')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Selector de vista */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {isMobile ? (
            <>
              <button
                onClick={() => setVista('mes')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  vista === 'mes' ? 'bg-white text-[#9C1838] shadow-sm' : 'text-gray-600'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setVista('dia')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  vista === 'dia' ? 'bg-white text-[#9C1838] shadow-sm' : 'text-gray-600'
                }`}
              >
                Día
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setVista('mes')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  vista === 'mes' ? 'bg-white text-[#9C1838] shadow-sm' : 'text-gray-600'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setVista('semana')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  vista === 'semana' ? 'bg-white text-[#9C1838] shadow-sm' : 'text-gray-600'
                }`}
              >
                Semana
              </button>
            </>
          )}
        </div>
      </div>

      {/* Renderizar vista actual */}
      {vista === 'mes' && renderVistaMes()}
      {vista === 'semana' && renderVistaSemana()}
      {vista === 'dia' && renderVistaDia()}
    </div>
  );
}

export default CalendarioTurnos;
