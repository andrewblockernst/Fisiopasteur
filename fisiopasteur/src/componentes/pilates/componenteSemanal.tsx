'use client'
import { dayjs, isPastDateTime } from "@/lib/dayjs";
import { HORARIOS_PILATES_30MIN } from "@/lib/constants/especialidades";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Button from "../boton";

interface PilatesCalendarioSemanalProps {
  turnos: any[];
  semanaBase: Date;
  onSemanaChange: (fecha: Date) => void;
  onAgregarTurno: (dia: Date, horario: string) => void;
  onNuevoTurno: () => void;
  onVerTurno?: (turnos: any[]) => void;
  especialistas: any[];
}

// Función para obtener días de la semana (lunes a viernes)
function getWeekDays(fecha: Date) {
  const start = dayjs(fecha).startOf("week"); // locale "es": semana arranca el lunes
  return Array.from({ length: 5 }, (_, i) => start.add(i, "day").toDate());
}

export default function PilatesCalendarioSemanal({
  turnos,
  semanaBase,
  onSemanaChange,
  onAgregarTurno,
  onNuevoTurno,
  onVerTurno,
  especialistas
}: PilatesCalendarioSemanalProps) {
  const diasSemana = getWeekDays(semanaBase);

  // Navegación de semanas
  const irSemanaAnterior = () => {
    onSemanaChange(dayjs(semanaBase).subtract(7, "day").toDate());
  };

  const irSemanaSiguiente = () => {
    onSemanaChange(dayjs(semanaBase).add(7, "day").toDate());
  };

  const irSemanaActual = () => {
    onSemanaChange(dayjs().toDate());
  };

  // Obtener turnos para un día y horario específico
  const getTurnosParaSlot = (dia: Date, horario: string) => {
    const fechaStr = dayjs(dia).format("YYYY-MM-DD");
    return turnos.filter(turno => 
      turno.fecha === fechaStr && 
      turno.hora?.substring(0, 5) === horario
    );
  };

  const isHorarioPasado = (dia: Date, horario: string) => {
    const fechaStr = dayjs(dia).format("YYYY-MM-DD");
    return isPastDateTime(fechaStr, horario);
  };

  const formatDiaNombre = (fecha: Date) => {
    const nombre = dayjs(fecha).format("dddd");
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  };

  const getNivelColor = (dificultad?: string) => {
    switch (dificultad) {
      case 'principiante':
        return { border: '#16a34a', background: '#dcfce7' };
      case 'intermedio':
        return { border: '#eab308', background: '#fef9c3' };
      case 'avanzado':
        return { border: '#dc2626', background: '#fee2e2' };
      default:
        return { border: '#9C1838', background: '#fde2e8' };
    }
  };

  const horariosHora = HORARIOS_PILATES_30MIN.filter((hora) => hora.endsWith(":00"));
  const startHour = Number(horariosHora[0]?.split(":")[0] || 0);
  const rowHeight = 100;
  const halfRowHeight = rowHeight / 2;
  const mobileRowHeight = 140;
  const mobileHalfRowHeight = mobileRowHeight / 2;  

  const shiftHora = (hora: string, deltaMin: number) => {
    const [hStr, mStr] = hora.split(":");
    const h = Number(hStr);
    const m = Number(mStr || 0);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const total = h * 60 + m + deltaMin;
    if (total < 0 || total > 24 * 60) return null;
    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const getTopOffset = (hora: string, isMobile: boolean = false) => {
    const [hStr, mStr] = hora.split(":");
    const h = Number(hStr);
    const m = Number(mStr || 0);
    const rHeight = isMobile ? mobileRowHeight : rowHeight;
    const rHalf = isMobile ? mobileHalfRowHeight : halfRowHeight;
    return (h - startHour) * rHeight + (m === 30 ? rHalf : 0);
  };

  return (
    <div>
      {/* DESKTOP HEADER */}
      <div className="hidden sm:flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-1 z-10">
          <button
            onClick={irSemanaAnterior}
            className="hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 min-w-0 whitespace-nowrap">
            {dayjs(diasSemana[0]).format("DD MMM")} - {dayjs(diasSemana[4]).format("DD MMM YYYY")}
          </h2>
          <button
            onClick={irSemanaSiguiente}
            className="hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-3 text-xs text-gray-700 w-max z-0">
          <span className="font-medium">Niveles:</span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
            Principiante
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            Intermedio
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            Avanzado
          </span>
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            onClick={irSemanaActual}
            className="px-4 py-1 text-sm bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand)]/80 transition-colors font-medium"
          >
            Hoy
          </button>
          <Button onClick={onNuevoTurno} variant="primary" className="ml-2">
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="block sm:hidden ">
        <div className="flex flex-col xs:flex-row items-center justify-center gap-3 py-3 rounded-t-lg px-2 pt-0">
          <button
            onClick={irSemanaActual}
            className="px-4 py-1 text-sm bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand)]/80 transition-colors font-medium shadow-sm shrink-0"
          >
            Hoy
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-gray-700 bg-gray-100 rounded-lg p-1.5 px-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-600" />
              Principiante
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Intermedio
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Avanzado
            </span>
          </div>
        </div>
        <div className="flex items-center border-y justify-between p-4 bg-white shadow-sm">
          <button
            onClick={() => onSemanaChange(dayjs(semanaBase).subtract(1, "day").toDate())}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-800" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 text-center flex-1 capitalize">
            {semanaBase.toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </h3>
          <button
            onClick={() => onSemanaChange(dayjs(semanaBase).add(1, "day").toDate())}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-800" />
          </button>
        </div>

        {/* <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-700 bg-white p-2 rounded-lg border">
          <span className="font-medium">Niveles:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-600" /> Principiante
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Intermedio
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600" /> Avanzado
          </span>
        </div> */}
      </div>

      {/* DESKTOP WEEK GRID */}
      <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-h-[calc(100vh-100px)] overflow-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-200 sticky top-0 z-30 bg-white">
              <div className="p-3 border-r border-gray-200 bg-gray-50" />
              {diasSemana.map((fecha, index) => {
                const esHoy = dayjs(fecha).isSame(dayjs(), 'day');
                return (
                  <div
                    key={index}
                    className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${esHoy
                      ? 'bg-[#9C1838] text-white shadow-inner'
                      : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                  >
                    <div className="text-sm font-semibold">
                      {formatDiaNombre(fecha)}
                    </div>
                    <div className={`text-xs mt-1 ${esHoy ? 'opacity-90' : 'text-gray-500'}`}>
                      {dayjs(fecha).format("DD MMM")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[80px_repeat(5,1fr)]">
              <div>
                {horariosHora.map((horario, idx) => (
                  <div
                    key={horario}
                    className={`w-20 p-3 text-sm text-gray-600 border-b border-r border-gray-200 bg-gray-50/50 font-mono flex items-center justify-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    style={{ height: rowHeight }}
                  >
                    <span className="text-xs font-medium">{horario}</span>
                  </div>
                ))}
              </div>

              {diasSemana.map((fecha, di) => {
                const fechaStr = dayjs(fecha).format("YYYY-MM-DD");
                const turnosDelDia = turnos.filter((turno) => turno.fecha === fechaStr);
                const turnosPorInicio = turnosDelDia.reduce((acc: Record<string, any[]>, turno) => {
                  const horaInicio = turno.hora?.substring(0, 5);
                  if (!horaInicio) return acc;
                  if (!acc[horaInicio]) acc[horaInicio] = [];
                  acc[horaInicio].push(turno);
                  return acc;
                }, {});

                const ocupados = new Set(Object.keys(turnosPorInicio));
                const tieneConflicto = (hora: string) => {
                  const prev = shiftHora(hora, -30);
                  const next = shiftHora(hora, 30);
                  return ocupados.has(hora) || (prev ? ocupados.has(prev) : false) || (next ? ocupados.has(next) : false);
                };

                return (
                  <div
                    key={di}
                    className="relative border-r border-gray-200 last:border-r-0"
                    style={{ height: horariosHora.length * rowHeight }}
                  >
                    <div className="absolute inset-0 pointer-events-none z-0">
                      {horariosHora.map((horario, idx) => (
                        <div
                          key={horario}
                          className={`border-b border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          style={{ height: rowHeight }}
                        />
                      ))}
                    </div>

                    <div className="absolute inset-0 z-10">
                      {horariosHora.map((horario) => {
                        const mitad = shiftHora(horario, 30);
                        const puedeAgregarHora = !isHorarioPasado(fecha, horario) && !tieneConflicto(horario);
                        const puedeAgregarMitad = mitad
                          ? !isHorarioPasado(fecha, mitad) && !tieneConflicto(mitad)
                          : false;

                        return (
                          <div key={horario} style={{ height: rowHeight }} className="flex flex-col">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (puedeAgregarHora) onAgregarTurno(fecha, horario);
                              }}
                              className="relative flex-1 group"
                              disabled={!puedeAgregarHora}
                            >
                              {puedeAgregarHora && (
                                <span className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#9C1838] hover:bg-[#7D1329] text-white p-1 rounded-full shadow-md">
                                  <Plus className="w-3 h-3" />
                                </span>
                              )}
                            </button>
                            {mitad && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (puedeAgregarMitad) onAgregarTurno(fecha, mitad);
                                }}
                                className="relative flex-1 group"
                                disabled={!puedeAgregarMitad}
                              >
                                {puedeAgregarMitad && (
                                  <span className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#9C1838] hover:bg-[#7D1329] text-white p-1 rounded-full shadow-md">
                                    <Plus className="w-3 h-3" />
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {Object.entries(turnosPorInicio).map(([horaInicio, turnosInicio]) => {
                        const especialista = turnosInicio[0]?.especialista;
                        const color = getNivelColor(turnosInicio[0]?.dificultad);
                        const top = getTopOffset(horaInicio);

                        return (
                          <div
                            key={horaInicio}
                            className="absolute left-1 right-5 text-xs rounded-lg shadow-md border-l-2 border-b-1 border-b-gray-400 overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer pointer-events-auto"
                            style={{
                              top,
                              height: rowHeight,
                              backgroundColor: color.background,
                              borderLeftColor: color.border,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerTurno?.(turnosInicio);
                            }}
                          >
                            <div className="p-1.5">
                              <div className="font-semibold truncate text-xs text-gray-900 leading-tight">
                                {especialista?.nombre || 'Especialista'} {especialista?.apellido || ''}
                              </div>
                              <div className="mt-1 space-y-0.5">
                                {Array.from({ length: 4 }, (_, index) => {
                                  const turno = turnosInicio[index];
                                  if (!turno) {
                                    return (
                                      <div key={`disponible-${index}`} className="text-[10px] text-gray-500 truncate leading-tight italic">
                                        Lugar disponible
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={turno.id_turno} className="text-[10px] text-gray-700 truncate leading-tight">
                                      {turno.paciente?.nombre || 'Paciente'} {turno.paciente?.apellido || ''}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE DAY VIEW */}
      <div className="block sm:hidden bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="max-h-[65vh] overflow-y-auto relative">
          <div className="grid grid-cols-[64px_1fr]">
            {/* Hours column */}
            <div>
              {horariosHora.map((horario, idx) => (
                <div
                  key={horario}
                  className={`w-16 p-2 text-xs text-gray-500 border-b border-r border-gray-200 font-mono flex items-start justify-center pt-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  style={{ height: mobileRowHeight }}
                >
                  {horario}
                </div>
              ))}
            </div>

            {/* Turnos column */}
            <div className="relative" style={{ height: horariosHora.length * mobileRowHeight }}>
              {/* Background rows */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {horariosHora.map((horario, idx) => (
                  <div
                    key={horario}
                    className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    style={{ height: mobileRowHeight }}
                  />
                ))}
              </div>

              {/* Add buttons */}
              <div className="absolute inset-0 z-10 flex flex-col">
                {horariosHora.map((horario) => {
                  const mitad = shiftHora(horario, 30);
                  const fechaStr = dayjs(semanaBase).format("YYYY-MM-DD");
                  const turnosDelDia = turnos.filter((turno) => turno.fecha === fechaStr);
                  const ocupados = new Set(turnosDelDia.map(t => t.hora?.substring(0, 5)));
                  ocupados.add("23:00")

                  const tieneConflicto = (hora: string) => {
                    const prev = shiftHora(hora, -30);
                    const next = shiftHora(hora, 30);
                    return ocupados.has(hora) || (prev ? ocupados.has(prev) : false) || (next ? ocupados.has(next) : false);
                  };

                  const puedeAgregarHora = !isHorarioPasado(semanaBase, horario) && !tieneConflicto(horario);
                  const puedeAgregarMitad = mitad
                    ? !isHorarioPasado(semanaBase, mitad) && !tieneConflicto(mitad)
                    : false;

                  return (
                    <div key={horario} style={{ height: mobileRowHeight }} className="flex flex-col relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (puedeAgregarHora) onAgregarTurno(semanaBase, horario);
                        }}
                        className="relative flex-1 active:bg-gray-50 transition-colors flex items-center justify-center border-b border-transparent border-dashed"
                        disabled={!puedeAgregarHora}
                      >
                        {puedeAgregarHora && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-sm font-medium opacity-60">
                            <Plus className="w-4 h-4" /> Agregar turno a las {horario}
                          </div>
                        )}
                      </button>
                      {mitad && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (puedeAgregarMitad) onAgregarTurno(semanaBase, mitad);
                          }}
                          className="relative flex-1 active:bg-gray-50 transition-colors flex items-center justify-center border-b border-transparent border-dashed"
                          disabled={!puedeAgregarMitad}
                        >
                          {puedeAgregarMitad && (
                            <div className="flex items-center gap-1.5 text-gray-400 text-sm font-medium opacity-60">
                              <Plus className="w-4 h-4" /> Agregar turno a las {mitad}
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Render Turnos Cards absolutely */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {(() => {
                  const fechaStr = dayjs(semanaBase).format("YYYY-MM-DD");
                  const turnosDelDia = turnos.filter((turno) => turno.fecha === fechaStr);
                  const turnosPorInicio = turnosDelDia.reduce((acc: Record<string, any[]>, turno) => {
                    const horaInicio = turno.hora?.substring(0, 5);
                    if (!horaInicio) return acc;
                    if (!acc[horaInicio]) acc[horaInicio] = [];
                    acc[horaInicio].push(turno);
                    return acc;
                  }, {});

                  return Object.entries(turnosPorInicio).map(([horaInicio, turnosInicio]) => {
                    const especialista = turnosInicio[0]?.especialista;
                    const color = getNivelColor(turnosInicio[0]?.dificultad);
                    const top = getTopOffset(horaInicio, true);

                    return (
                      <div
                        key={horaInicio}
                        className="absolute left-2 right-12 rounded-lg shadow-md border-l-4 border-y border-r border-gray-200 overflow-hidden transition-all duration-200 cursor-pointer pointer-events-auto"
                        style={{
                          top: top + 2,
                          height: mobileRowHeight - 5,
                          backgroundColor: color.background,
                          borderLeftColor: color.border,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerTurno?.(turnosInicio);
                        }}
                      >
                        <div className="p-2 flex flex-col h-full">
                          <div className="flex items-center mb-1">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 text-sm leading-tight">
                                {especialista?.nombre} {especialista?.apellido}
                              </span>
                              {/* <span className="text-[10px] text-gray-600 font-mono mt-0.5">
                                {horaInicio}
                              </span> */}
                            </div>
                            {/* <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-white border" style={{ borderColor: color.border, color: color.border }}>
                              {turnosInicio[0]?.dificultad || 'Pilates'}
                            </span> */}
                          </div>
                          <div className="space-y-0.5">
                            {Array.from({ length: 4 }).map((_, index) => {
                              const turno = turnosInicio[index];
                              if (turno) {
                                return (
                                  <div key={turno.id_turno} className="text-xs text-gray-800 flex items-center gap-1.5">
                                    {/* <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: turno.especialista?.color || '#9C1838' }} /> */}
                                    <span className="truncate">{turno.paciente?.nombre} {turno.paciente?.apellido}</span>
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={`disp-${index}`} className="text-[10px] text-gray-500 italic flex items-center gap-1.5">
                                    {/* <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" /> */}
                                    Libre
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}