"use client";

import { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from "lucide-react";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { Button, IconButton, Card } from "@/componentes/ui";
import { cn } from "@/lib/utils";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { toYmd } from "@/lib/dayjs";
import { EspecialistaMultiSelect } from "@/componentes/calendario/especialista-multi-select";

interface CalendarioTurnosProps {
  turnos: TurnoConDetalles[];
  especialistas: any[];
  especialistasSeleccionados: string[];
  onEspecialistasChange: (ids: string[]) => void;
  onDayClick: (date: Date, turnos: TurnoConDetalles[]) => void;
  onCreateTurno: (date: Date, hora?: string) => void;
  setIsCreateModalOpen?: (open: boolean) => void; // ✅ Nueva prop para controlar el modal desde el padre
}

export type VistaCalendario = 'mes' | 'semana' | 'dia';

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
  onViewContextChange?: (context: { vista: VistaCalendario; fecha: Date }) => void;
  goToTodaySignal?: number; // increment this to trigger go to today
  hideHeaderControls?: boolean;
}

export function CalendarioTurnos({
  turnos,
  especialistas,
  especialistasSeleccionados,
  onEspecialistasChange,
  onDayClick,
  onCreateTurno,
  setIsCreateModalOpen,
  vistaProp,
  onVistaChange,
  onViewContextChange,
  goToTodaySignal,
  hideHeaderControls
}: CalendarioTurnosProps & CalendarioTurnosExtraProps) {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vistaInternal, setVistaInternal] = useState<VistaCalendario>('mes');
  const vista = vistaProp ?? vistaInternal;
  const turnosPorFecha = useMemo(() => {
    const index = new Map<string, TurnoConDetalles[]>();

    for (const turno of turnos) {
      const key = turno.fecha;
      const actuales = index.get(key);
      if (actuales) {
        actuales.push(turno);
      } else {
        index.set(key, [turno]);
      }
    }

    return index;
  }, [turnos]);

  // Usa la fecha en timezone ART, no UTC: `toISOString()` corre el día al
  // siguiente cuando la Date conserva la hora del reloj (vistas semana/día
  // arman fechas desde `fechaActual`, que lleva la hora actual). Después de
  // las 21:00 ART el día UTC ya cambió y los turnos se buscaban con la key
  // equivocada. La vista mes no fallaba porque arma fechas a medianoche local.
  const formatDateKey = (fecha: Date) => toYmd(fecha);

  useEffect(() => {
    if (!onViewContextChange) return;
    onViewContextChange({
      vista,
      fecha: new Date(fechaActual),
    });
  }, [vista, fechaActual, onViewContextChange]);


  // Maneja el estado para abrir/cerrar el modal de creación de turno
// const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


    const handleCreateTurno = () => {
      if (setIsCreateModalOpen) {
        setIsCreateModalOpen(true);
      } else {
        onCreateTurno(new Date());
      }
  };



  const getTurnosParaDia = (fecha: Date) => {
    return turnosPorFecha.get(formatDateKey(fecha)) || [];
  };

  const esDiaActual = (fecha: Date) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };

  const isFechaPasada = (fecha: Date) => {
    const hoy = new Date();
    const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return inicioFecha.getTime() < inicioHoy.getTime();
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'atendido':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'programado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isHorarioPasado = (fecha: Date, hora: string) => {
    const [horasRaw, minutosRaw] = hora.split(':');
    const horas = Number.parseInt(horasRaw, 10);
    const minutos = Number.parseInt(minutosRaw ?? '0', 10);

    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
      return false;
    }

    const horario = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
      horas,
      minutos,
      0,
      0
    );

    return horario.getTime() <= Date.now();
  };

  const navegarFecha = useCallback((direccion: 'anterior' | 'siguiente') => {
    setFechaActual((prev) => {
      const nuevaFecha = new Date(prev);
      if (vista === 'mes') {
        nuevaFecha.setMonth(nuevaFecha.getMonth() + (direccion === 'siguiente' ? 1 : -1));
      } else if (vista === 'semana') {
        nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 7 : -7));
      } else if (vista === 'dia') {
        nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 1 : -1));
      }
      return nuevaFecha;
    });
  }, [vista]);

  // Swipe horizontal en <lg para navegar fechas (todas las vistas)
  const isBelowLg = useMediaQuery('(max-width: 1023px)');
  const swipeRef = useHorizontalSwipe<HTMLDivElement>({
    enabled: isBelowLg,
    onSwipeLeft: () => navegarFecha('siguiente'),
    onSwipeRight: () => navegarFecha('anterior'),
  });

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

  // Auto-switch entre 'dia' (< md) y 'semana' (md+) cuando el viewport cruza el breakpoint.
  // Mantiene 'mes' intacto.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const sync = (matches: boolean) => {
      if (matches && vista === 'dia') {
        if (onVistaChange) onVistaChange('semana');
        else setVistaInternal('semana');
      } else if (!matches && vista === 'semana') {
        if (onVistaChange) onVistaChange('dia');
        else setVistaInternal('dia');
      }
    };
    sync(mql.matches);
    const handler = (e: MediaQueryListEvent) => sync(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [vista, onVistaChange]);

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

    const totalCeldas = diaSemanaInicio + diasEnMes;
    const filas = Math.ceil(totalCeldas / 7);

    return (
      <Card variant="elevated" padding="none" className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Header días de la semana */}
        <div className="shrink-0 grid grid-cols-7 bg-muted/40 border-b border-border">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="p-3 text-center text-sm font-medium text-muted-foreground">
              {dia}
            </div>
          ))}
        </div>

        {/*
          Contenedor scrollable: la altura del grid está acotada a este
          contenedor (h-full, no min-h-full), así los tracks `1fr` reparten
          el espacio real disponible y cada celda recorta su contenido con
          overflow-hidden en vez de crecer con la cantidad de turnos. Si el
          mínimo de 124px por fila no entra, el grid excede el contenedor y
          recién ahí aparece scroll.
        */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            className="grid grid-cols-7 gap-px bg-border h-full"
            style={{
              gridTemplateRows: `repeat(${filas}, minmax(124px, 1fr))`,
            }}
          >
          {dias.map((fecha, index) => {
            if (!fecha) {
              return <div key={index} className="bg-white min-h-0" />;
            }
            
            const turnosDelDia = getTurnosParaDia(fecha);
            // En los recuadros ocultamos cancelados; el modal recibe la lista completa.
            const turnosVisibles = turnosDelDia.filter((t) => t.estado !== 'cancelado');
            const esHoy = esDiaActual(fecha);
            const puedeAgregarEnFecha = !isFechaPasada(fecha);
            
            return (
              <div
                key={index}
                // Coherente con el minmax(124px, 1fr) del grid: garantiza
                // ~26px del número + 3 turnos (~20px c/u con gap) + línea "+X más" (~16px).
                className="bg-white min-h-[124px] p-1 relative group transition-all overflow-hidden"
              >
                <div
                  className="w-full h-full rounded cursor-pointer transition-colors relative hover:bg-gray-50"
                  onClick={() => onDayClick(fecha, turnosDelDia)}
                >
                  <div className="h-full flex flex-col">
                    {/* Número del día */}
                    <div className="flex justify-between items-start px-1 pt-0.5 pb-1 shrink-0">
                      <span className={cn(
                        'text-sm font-medium',
                        esHoy
                          ? 'bg-brand text-brand-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs'
                          : 'text-foreground',
                      )}>
                        {fecha.getDate()}
                      </span>
                    </div>

                    {/* Lista de turnos — calcula dinámicamente cuántos entran */}
                    <DiaTurnosLista turnos={turnosVisibles} />
                  </div>

                  {/* Botón crear turno (visible en hover) */}
                  {puedeAgregarEnFecha && (
                    <button
                      type="button"
                      aria-label="Crear turno este día"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateTurno(fecha);
                      }}
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-brand text-brand-foreground p-1 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </Card>
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
      // Los recuadros no muestran cancelados; el modal del día sí los incluye.
      return turnosDelDia.filter(
        (t) => t.estado !== 'cancelado' && (t.hora.startsWith(horaStr) || t.hora.startsWith(`${horaStr}:`))
      );
    };

    return (
      <Card variant="default" padding="none" className="overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border sticky top-0 z-20 bg-gradient-to-b from-muted/40 to-card">
              <div className="p-3 border-r border-border bg-muted/30" />
              {diasSemana.map((fecha, index) => {
                const esHoy = esDiaActual(fecha);
                return (
                  <div
                    key={index}
                    className={cn(
                      'p-3 text-center border-r border-border last:border-r-0 transition-colors',
                      esHoy
                        ? 'bg-brand text-brand-foreground shadow-inner'
                        : 'bg-gradient-to-b from-muted/40 to-card hover:bg-muted/40',
                    )}
                  >
                    <div className="text-sm font-semibold">
                      {DIAS_SEMANA_COMPLETOS[fecha.getDay()]}
                    </div>
                    <div className={cn('text-xs mt-1', esHoy ? 'opacity-90' : 'text-muted-foreground')}>
                      {fecha.getDate()} {MESES[fecha.getMonth()]}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              {horas.map((hora, idx) => (
                <div
                  key={hora}
                  className={cn(
                    'grid grid-cols-[80px_repeat(7,1fr)] border-b border-border/50 hover:bg-muted/20 transition-colors',
                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/20',
                  )}
                >
                  <div className="w-20 p-3 text-sm text-muted-foreground border-r border-border bg-muted/30 font-mono flex items-center justify-center">
                    <span className="text-xs font-medium">{`${hora.toString().padStart(2, '0')}:00`}</span>
                  </div>

                  {diasSemana.map((fecha, di) => {
                    const turnosEnHora = getTurnoEnHora(fecha, hora);
                    const turnosDelDiaCompleto = getTurnosParaDia(fecha);
                    const horaString = `${hora.toString().padStart(2, '0')}:00`;
                    const puedeAgregarEnSlot = !isHorarioPasado(fecha, horaString);

                    return (
                      <div
                        key={di}
                        className="p-2 relative group min-h-[70px] transition-all duration-200 border-r border-border/50 last:border-r-0 hover:bg-muted/30"
                      >
                        {turnosEnHora.length > 0 && (
                          <div
                            className={cn(
                              'grid gap-1',
                              turnosEnHora.length === 1 && 'grid-cols-1',
                              turnosEnHora.length === 2 && 'grid-cols-2',
                              turnosEnHora.length >= 3 && 'grid-cols-3',
                            )}
                          >
                            {turnosEnHora.slice(0, 3).map((turno) => (
                              <button
                                key={turno.id_turno}
                                type="button"
                                className="text-xs rounded-md shadow-sm border-l-2 overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                style={{
                                  backgroundColor: (turno.especialista?.color || 'var(--brand)') + '15',
                                  borderLeftColor: turno.especialista?.color || 'var(--brand)',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDayClick(fecha, turnosDelDiaCompleto);
                                }}
                              >
                                <div className="p-1.5 h-full flex flex-col justify-center">
                                  <div className="font-semibold truncate text-xs text-foreground leading-tight">
                                    {turno.paciente?.nombre}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight font-medium">
                                    {turno.hora.substring(0, 5)}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {turnosEnHora.length > 3 && (
                          <button
                            type="button"
                            className="block w-full text-center text-xs text-muted-foreground mt-1.5 cursor-pointer hover:text-brand transition-all hover:font-semibold bg-muted/50 rounded-sm px-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDayClick(fecha, turnosDelDiaCompleto);
                            }}
                          >
                            +{turnosEnHora.length - 3} más
                          </button>
                        )}

                        {puedeAgregarEnSlot && (
                          <button
                            type="button"
                            aria-label={`Crear turno ${horaString}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateTurno(fecha, horaString);
                            }}
                            className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-brand hover:bg-brand-hover text-brand-foreground p-1 rounded-full shadow-md hover:shadow-lg hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
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
        <Card variant="elevated" padding="none" className="overflow-hidden flex-1 min-h-0 flex flex-col">
            {/* MOBILE LAYOUT */}
            <div className="flex md:hidden flex-col flex-1 min-h-0">
                {/* Celdas de horas */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {horas.map((hora) => {
                        const turnosHora = getTurnosEnHora(hora);
                        const horaStr = `${hora.toString().padStart(2, '0')}:00`;
                      const puedeAgregarEnSlot = !isHorarioPasado(fechaActual, horaStr);
                        
                        return (
                            <div key={hora} className="border-b border-gray-200 min-h-[60px]">
                                <div className="flex">
                                    {/* Columna de hora */}
                                    <div className="w-16 p-3 text-sm text-gray-500 border-r bg-gray-50 font-mono flex items-center justify-center">
                                        {horaStr}
                                    </div>
                                    
                                    {/* Contenido de turnos */}
                                    <div
                                        className={cn(
                                            "flex-1 p-3",
                                            puedeAgregarEnSlot && "cursor-pointer hover:bg-muted/30 transition-colors"
                                        )}
                                        onClick={(e) => {
                                            if (e.target !== e.currentTarget) return;
                                            if (puedeAgregarEnSlot) onCreateTurno(fechaActual, horaStr);
                                        }}
                                    >
                                        {turnosHora.length > 0 ? (
                                            <div className="space-y-2 max-w-[75%]">
                                                {turnosHora.map((turno) => (
                                                    <div
                                                        key={turno.id_turno}
                                                        className="border rounded-lg p-3 active:scale-95 transition-all cursor-pointer"
                                                        style={{
                                                            borderColor: turno.especialista?.color || '#9C1838',
                                                            backgroundColor: (turno.especialista?.color || '#9C1838') + '15'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDayClick(fechaActual, [turno]);
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-black">
                                                                    {turno.paciente?.nombre} {turno.paciente?.apellido}
                                                                </span>
                                                            </div>
                                                            <span className={cn(
                                                                "text-xs px-2 py-1 rounded border",
                                                                getEstadoColor(turno.estado || 'programado')
                                                            )}>
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
                                            <>
                                              {puedeAgregarEnSlot ? (
                                                <div 
                                                  className="text-gray-400 text-sm cursor-pointer hover:text-[#9C1838] transition-colors py-2"
                                                  onClick={() => {
                                                    onCreateTurno(fechaActual, horaStr);
                                                  }}
                                                >
                                                  Sin turnos - Toca para agregar
                                                </div>
                                              ) : (
                                                <div className="text-gray-400 text-sm py-2">
                                                  Sin turnos
                                                </div>
                                              )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* DESKTOP */}
            <div className="hidden md:flex flex-col flex-1 min-h-0">
                <div className="shrink-0 p-4 border-b border-border bg-muted/40">
                    <div className="flex justify-between items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground capitalize">
                            {fechaActual.toLocaleDateString('es-AR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </h3>
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={() => onCreateTurno(fechaActual)}
                        >
                            Nuevo turno
                        </Button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    {Array.from({ length: 12 }, (_, i) => i + 8).map((hora) => {
                        const horaStr = `${hora.toString().padStart(2, '0')}:00`;
                        const turnosHora = turnosDelDia.filter(t => t.hora.startsWith(hora.toString().padStart(2, '0')));
                        const puedeAgregarEnSlot = !isHorarioPasado(fechaActual, horaStr);

                        return (
                            <div key={hora} className="border-b border-border flex">
                                <div className="w-16 p-3 text-sm text-muted-foreground border-r border-border font-mono">
                                    {horaStr}
                                </div>
                                <div
                                    className={cn(
                                        "flex-1 p-3 min-h-16",
                                        puedeAgregarEnSlot && "cursor-pointer hover:bg-muted/30 transition-colors"
                                    )}
                                    onClick={(e) => {
                                        if (e.target !== e.currentTarget) return;
                                        if (puedeAgregarEnSlot) onCreateTurno(fechaActual, horaStr);
                                    }}
                                >
                                    {turnosHora.map((turno) => (
                                        <button
                                            key={turno.id_turno}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDayClick(fechaActual, [turno]);
                                            }}
                                            className="max-w-[75%] text-left p-2 rounded-md mb-1 transition-all cursor-pointer hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring block"
                                            style={{
                                                backgroundColor: (turno.especialista?.color || 'var(--brand)') + '20',
                                                borderLeft: `3px solid ${turno.especialista?.color || 'var(--brand)'}`,
                                            }}
                                        >
                                            <div className="font-medium text-foreground">
                                                {turno.paciente?.nombre} {turno.paciente?.apellido}
                                            </div>
                                            <div className="text-xs text-foreground/70">
                                                Dr. {turno.especialista?.nombre}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
  };

  return (
    <>
      <div className="h-full flex flex-col gap-1.5 sm:gap-4 min-h-0">
        {!hideHeaderControls && (
          <>
            {/* Header mobile — una sola fila ultra compacta */}
            <div className="lg:hidden shrink-0 flex items-center gap-0.5 bg-card border border-border rounded-md px-1">
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => navegarFecha('anterior')}
                className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold text-foreground text-center flex-1 capitalize min-w-0 truncate leading-none">
                {obtenerTituloVista()}
              </h3>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={() => navegarFecha('siguiente')}
                className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={irAHoy}
                className="h-7 px-2 rounded-sm text-xs font-medium bg-brand text-brand-foreground hover:bg-brand/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Hoy
              </button>
              <div
                role="tablist"
                aria-label="Vista del calendario"
                className="flex bg-muted rounded-sm p-0.5"
              >
                {([
                  { v: 'mes' as const, label: 'Mes', visibility: '' },
                  { v: 'dia' as const, label: 'Día', visibility: 'md:hidden' },
                  { v: 'semana' as const, label: 'Semana', visibility: 'hidden md:inline-flex' },
                ]).map(({ v, label, visibility }) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={vista === v}
                    onClick={() => setVista(v)}
                    className={cn(
                      'px-2 h-6 inline-flex items-center rounded-sm text-xs font-medium transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      visibility,
                      vista === v
                        ? 'bg-background text-brand shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header desktop — una sola fila */}
            <div className="hidden lg:flex shrink-0 lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-1 min-w-0">
                <IconButton
                  aria-label="Anterior"
                  variant="ghost"
                  size="sm"
                  icon={<ChevronLeft className="w-5 h-5" />}
                  onClick={() => navegarFecha('anterior')}
                />
                <h2 className="text-lg sm:text-xl font-bold text-foreground min-w-0 whitespace-nowrap capitalize">
                  {obtenerTituloVista()}
                </h2>
                <IconButton
                  aria-label="Siguiente"
                  variant="ghost"
                  size="sm"
                  icon={<ChevronRight className="w-5 h-5" />}
                  onClick={() => navegarFecha('siguiente')}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" onClick={irAHoy}>
                  Hoy
                </Button>

                <div
                  role="tablist"
                  aria-label="Vista del calendario"
                  className="flex bg-muted rounded-md p-1"
                >
                  {(['mes', 'semana'] as const).map((v) => (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={vista === v}
                      onClick={() => setVista(v)}
                      className={cn(
                        'px-3 py-1 rounded-sm text-sm font-medium transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        vista === v
                          ? 'bg-background text-brand shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {v === 'mes' ? 'Mes' : 'Semana'}
                    </button>
                  ))}
                </div>

                <EspecialistaMultiSelect
                  especialistas={especialistas}
                  seleccionados={especialistasSeleccionados}
                  onChange={onEspecialistasChange}
                />

                <Button
                  onClick={handleCreateTurno}
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Nuevo turno
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Renderizar vista actual */}
        <div ref={swipeRef} className="flex-1 min-h-0 flex flex-col">
          {vista === 'mes' && renderVistaMes()}
          {vista === 'semana' && renderVistaSemana()}
          {vista === 'dia' && renderVistaDia()}
        </div>
      </div>
    </>
  );
}

export default CalendarioTurnos;

/**
 * Lista de turnos dentro de un cell de día.
 * Mide su altura real con ResizeObserver y calcula cuántos items entran.
 * Si hay overflow, el último slot se sustituye por "+x más".
 *
 * Altura por ítem: ~18px (text-xs + py-0.5 + gap del space-y-0.5).
 */
function DiaTurnosLista({ turnos }: { turnos: TurnoConDetalles[] }) {
  const ITEM_HEIGHT = 20; // alto aproximado por ítem (16px item + 2px gap + margen)
  // Piso garantizado: la cell siempre tiene altura para 3 registros + "+X más".
  // Si la medición devuelve algo más chico (primer render, layout transitorio),
  // forzamos al menos 4 slots para nunca caer por debajo de 3 turnos visibles.
  const MIN_FIT = 4;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [maxFit, setMaxFit] = useState<number>(Math.max(MIN_FIT, turnos.length));

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const recompute = () => {
      const h = el.clientHeight;
      const fit = Math.floor(h / ITEM_HEIGHT);
      setMaxFit(Math.max(MIN_FIT, fit));
    };

    recompute();

    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (turnos.length === 0) {
    return <div ref={containerRef} className="flex-1 overflow-hidden" />;
  }

  // Si entran todos, los mostramos completos.
  // Si no, reservamos el último slot para "+x más".
  const todosEntran = turnos.length <= maxFit;
  const itemsAMostrar = todosEntran ? turnos.length : Math.max(0, maxFit - 1);
  const restantes = turnos.length - itemsAMostrar;

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <div className="space-y-0.5">
        {turnos.slice(0, itemsAMostrar).map((turno) => (
          <div
            key={turno.id_turno}
            className="flex items-center gap-1 text-xs px-1 py-0.5 rounded transition-all"
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: turno.especialista?.color || 'var(--brand)',
              }}
            />
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-foreground font-medium truncate">
                {turno.paciente?.nombre || 'Paciente'} {turno.paciente?.apellido || ''}
              </span>
            </div>
          </div>
        ))}
        {restantes > 0 && (
          <div className="text-xs text-muted-foreground px-1 leading-tight">
            +{restantes} más
          </div>
        )}
      </div>
    </div>
  );
}
