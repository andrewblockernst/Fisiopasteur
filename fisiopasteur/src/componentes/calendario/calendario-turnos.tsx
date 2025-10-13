"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useTurnoStore } from "@/stores/turno-store";
import type { TurnoConDetalles } from "@/stores/turno-store";
import Button from "../boton";

interface CalendarioTurnosProps {
  turnos: TurnoConDetalles[];
  especialistas: any[];
  especialistaSeleccionado: string;
  onEspecialistaChange: (especialistaId: string) => void;
  onDayClick: (date: Date, turnos: TurnoConDetalles[]) => void;
  onCreateTurno: (date: Date, hora?: string) => void;
}

type VistaCalendario = 'mes' | 'semana' | 'dia';

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// (Remove this line from the top-level scope)

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_SEMANA_COMPLETOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface CalendarioTurnosExtraProps {
  vistaProp?: VistaCalendario;
  onVistaChange?: (v: VistaCalendario) => void;
  goToTodaySignal?: number; // increment this to trigger go to today
  hideHeaderControls?: boolean;
}

export function CalendarioTurnos({
  turnos,
  especialistas,
  especialistaSeleccionado,
  onEspecialistaChange,
  onDayClick,
  onCreateTurno,
  vistaProp,
  onVistaChange,
  goToTodaySignal,
  hideHeaderControls
}: CalendarioTurnosProps & CalendarioTurnosExtraProps) {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vistaInternal, setVistaInternal] = useState<VistaCalendario>('mes');
  const vista = vistaProp ?? vistaInternal;
  const [isMobile, setIsMobile] = useState(false);
  const { getTurnosByDate } = useTurnoStore();

  useEffect(() => {
    // Solo se ejecuta en el cliente
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Maneja el estado para abrir/cerrar el modal de creación de turno
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


    const handleCreateTurno = () => {
    setIsCreateModalOpen(true);
  };



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

  // Función para ir al día actual
  const irAHoy = () => {
    setFechaActual(new Date());
  };

  // Listen to external goToTodaySignal
  useEffect(() => {
    if (typeof goToTodaySignal === 'number') {
      irAHoy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToTodaySignal]);

  const setVista = (v: VistaCalendario) => {
    if (onVistaChange) onVistaChange(v);
    else setVistaInternal(v);
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
      return fechaActual.toLocaleDateString('es-AR', {
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
                  className="w-full h-full rounded cursor-pointer transition-colors relative hover:bg-gray-50"
                  onClick={() => onDayClick(fecha, turnosDelDia)}
                >
                  <div className="h-full flex flex-col">
                    {/* Número del día */}
                    <div className="flex justify-between items-start p-1">
                      <span className={`text-sm font-medium ${
                        esHoy 
                          ? 'bg-[#9C1838] text-white w-6 h-6 rounded-2xl flex items-center justify-center' 
                          : 'text-gray-900'
                      }`}>
                        {fecha.getDate()}
                      </span>
                    </div>
                    
                    {/* Lista de turnos */}
                    <div className="flex-1 overflow-hidden">
                      {turnosDelDia.length > 0 ? (
                        <div className="space-y-1">
                          {turnosDelDia.slice(0, 3).map((turno) => (
                            <div
                              key={turno.id_turno}
                              className="flex items-center gap-1 text-xs"
                            >
                              {/* Indicador de color del especialista */}
                              <div 
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ 
                                  backgroundColor: turno.especialista?.color || '#9C1838' 
                                }}
                              />
                              {/* Horario y nombre del paciente en una línea */}
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <span className="text-gray-900 font-medium truncate">
                                  {turno.paciente?.nombre || 'Paciente'} {turno.paciente?.apellido || ''}
                                </span>
                              </div>
                            </div>
                          ))}
                          {turnosDelDia.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{turnosDelDia.length - 3} más
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
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
    
    const diasSemana: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      diasSemana.push(dia);
    }

    // 6:00 a 23:00
    const horas = Array.from({ length: 18 }, (_, i) => i + 6);

    const getTurnoEnHora = (fecha: Date, hora: number) => {
      const turnosDelDia = getTurnosParaDia(fecha);
      const horaStr = hora.toString().padStart(2, '0');
      return turnosDelDia.filter(
        (t) => t.hora.startsWith(horaStr) || t.hora.startsWith(`${horaStr}:`)
      );
    };

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="max-h-[calc(100vh-100px)] overflow-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b sticky top-0 z-20 bg-gray-50">
              <div className="p-3 border-r bg-gray-50" />
              {diasSemana.map((fecha, index) => {
                const esHoy = esDiaActual(fecha);
                return (
                  <div
                    key={index}
                    className={`p-3 text-center border-r last:border-r-0 ${
                      esHoy ? 'bg-[#9C1838] text-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {DIAS_SEMANA_COMPLETOS[fecha.getDay()]}
                    </div>
                    <div className="text-xs mt-1">
                      {fecha.getDate()} {MESES[fecha.getMonth()]}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              {horas.map((hora) => (
                <div key={hora} className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
                  <div className="w-20 p-2 text-sm text-gray-500 border-r bg-gray-50 font-mono flex items-center justify-center">
                    {`${hora.toString().padStart(2, '0')}:00`}
                  </div>

                  {diasSemana.map((fecha, di) => {
                    const turnosEnHora = getTurnoEnHora(fecha, hora);
                    const turnosDelDiaCompleto = getTurnosParaDia(fecha);

                    return (
                      <div key={di} className="p-2 relative group min-h-[60px]">
                        {turnosEnHora.length > 0 && (
                          <div
                            className={`grid gap-0.5 ${
                              turnosEnHora.length === 1 ? 'grid-cols-1' :
                              turnosEnHora.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                            }`}
                          >
                            {turnosEnHora.slice(0, 3).map((turno) => (
                              <div
                                key={turno.id_turno}
                                className="text-xs rounded cursor-pointer shadow-sm border overflow-hidden"
                                style={{
                                  backgroundColor: (turno.especialista?.color || '#9C1838') + '20',
                                  borderColor: turno.especialista?.color || '#9C1838',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDayClick(fecha, turnosDelDiaCompleto);
                                }}
                              >
                                <div className="p-1 h-full flex flex-col justify-center">
                                  <div className="font-medium truncate text-xs text-black leading-tight">
                                    {turno.paciente?.nombre}
                                  </div>
                                  <div className="text-xs opacity-75 truncate text-black leading-tight">
                                    {turno.hora.substring(0, 5)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {turnosEnHora.length > 3 && (
                          <div
                            className="text-center text-xs text-gray-600 mt-1 cursor-pointer hover:text-[#9C1838] transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDayClick(fecha, turnosDelDiaCompleto);
                            }}
                          >
                            +{turnosEnHora.length - 3} más
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const horaString = `${hora.toString().padStart(2, '0')}:00`;
                            onCreateTurno(fecha, horaString);
                          }}
                          className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#9C1838] text-white p-0.5 rounded-full"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVistaDia = () => {
    const turnosDelDia = getTurnosParaDia(fechaActual);
    const horas = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM a 11 PM

    const getTurnosEnHora = (hora: number) => {
      const horaStr = hora.toString().padStart(2, '0');
      return turnosDelDia.filter(turno => 
        turno.hora.startsWith(horaStr) || 
        turno.hora.startsWith(`${horaStr}:`)
      );
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* MOBILE LAYOUT */}
            <div className="block sm:hidden">
                {/* Botón Hoy y Toggle en la misma línea */}
                <div className="flex items-center justify-center gap-4 py-3 bg-gray-50 border-b">
                    <button
                    onClick={irAHoy}
                    className="px-4 py-1 text-sm bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand)]/80 transition-colors font-medium"
                    >
                    Hoy
                    </button>
                    
                    <div className="flex bg-gray-100 rounded-lg p-1">
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
                    </div>
                </div>

                {/* Fecha detallada con navegación adicional */}
                <div className="flex items-center justify-between p-4 bg-white border-b">
                    <button
                        onClick={() => navegarFecha('anterior')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-800" />
                    </button>
                    
                    <h3 className="text-xl font-bold text-gray-900 text-center flex-1">
                        {fechaActual.toLocaleDateString('es-AR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </h3>
                    
                    <button
                        onClick={() => navegarFecha('siguiente')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-800" />
                    </button>
                </div>

                {/* Celdas de horas */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {horas.map((hora) => {
                        const turnosHora = getTurnosEnHora(hora);
                        const horaStr = `${hora.toString().padStart(2, '0')}:00`;
                        
                        return (
                            <div key={hora} className="border-b border-gray-200 min-h-[60px]">
                                <div className="flex">
                                    {/* Columna de hora */}
                                    <div className="w-16 p-3 text-sm text-gray-500 border-r bg-gray-50 font-mono flex items-center justify-center">
                                        {horaStr}
                                    </div>
                                    
                                    {/* Contenido de turnos */}
                                    <div className="flex-1 p-3">
                                        {turnosHora.length > 0 ? (
                                            <div className="space-y-2">
                                                {turnosHora.map((turno) => (
                                                    <div
                                                        key={turno.id_turno}
                                                        className="border rounded-lg p-3 cursor-pointer active:scale-95 transition-transform"
                                                        style={{ 
                                                            borderColor: turno.especialista?.color || '#9C1838',
                                                            backgroundColor: (turno.especialista?.color || '#9C1838') + '15'
                                                        }}
                                                        onClick={() => onDayClick(fechaActual, [turno])}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">                                                  
                                                                <span className="font-semibold text-black">
                                                                    {turno.paciente?.nombre} {turno.paciente?.apellido}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                {turno.estado || 'programado'}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="font-medium text-sm text-black">
                                                                {turno.especialista?.nombre} {turno.especialista?.apellido} 
                                                            </div>
                                                            <div className="text-sm text-black opacity-75">
                                                                {turno.hora.substring(0, 5)}
                                                            </div>
                                                            {turno.observaciones && (
                                                                <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                                                    {turno.observaciones}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div 
                                                className="text-gray-400 text-sm cursor-pointer hover:text-[#9C1838] transition-colors py-2"
                                                onClick={() => {
                                                    const horaString = `${hora.toString().padStart(2, '0')}:00`;
                                                    onCreateTurno(fechaActual, horaString); // Pasar hora como string
                                                }}
                                            >
                                                Sin turnos - Toca para agregar
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* DESKTOP: Layout original sin cambios */}
            <div className="hidden sm:block">
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {fechaActual.toLocaleDateString('es-AR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </h3>
                        <button
                            onClick={() => onCreateTurno(fechaActual)} // Vista día header - sin hora específica
                            className="bg-[#9C1838] text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Nuevo Turno
                        </button>
                    </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                    {Array.from({ length: 12 }, (_, i) => i + 8).map((hora) => {
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
                                            <div className="font-medium text-black">{turno.paciente?.nombre} {turno.paciente?.apellido}</div>
                                            <div className="text-xs text-black opacity-75">Dr. {turno.especialista?.nombre}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header con controles - Solo mostrar si NO es vista día en mobile Y no está oculto */}
        {!(vista === 'dia' && typeof window !== 'undefined' && window.innerWidth < 768) && !hideHeaderControls && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navegarFecha('anterior')}
                className="hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <h2 className="text-xl font-bold text-gray-900 min-w-0 whitespace-nowrap">
                {obtenerTituloVista()}
              </h2>
              
              <button
                onClick={() => navegarFecha('siguiente')}
                className="hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Selector de vista, botón Hoy, filtro especialista y botón nuevo turno */}
            <div className="flex items-center gap-2">
              <button
                onClick={irAHoy}
                className="px-4 py-1 text-sm bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand)]/80 transition-colors font-medium"
              >
                Hoy
              </button>

              <div className="flex bg-gray-100 rounded-lg p-1">
                {isMobile ? (
                  <>
                    <button
                      onClick={() => setVista('mes')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        vista === 'mes' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-gray-600'
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

              {/* Filtro por especialista (solo desktop) */}
              {!isMobile && (
                <select
                  value={especialistaSeleccionado}
                  onChange={(e) => onEspecialistaChange(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent ml-2"
                >
                  <option value="">Todos los especialistas</option>
                  {especialistas.map((especialista) => (
                    <option key={especialista.id_usuario} value={especialista.id_usuario}>
                      {especialista.nombre} {especialista.apellido}
                    </option>
                  ))}
                </select>
              )}

              {/* Botón nuevo turno (solo desktop) */}
              {!isMobile && (
                <Button
                  onClick={handleCreateTurno}
                  variant="primary"
                  className="ml-2"
                >
                  Nuevo Turno
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Renderizar vista actual */}
        {vista === 'mes' && renderVistaMes()}
        {vista === 'semana' && renderVistaSemana()}
        {vista === 'dia' && renderVistaDia()}
      </div>
    </>
  );
}

export default CalendarioTurnos;
