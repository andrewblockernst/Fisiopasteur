"use client";

import { useState, useEffect } from "react"; 
import BaseDialog from "@/componentes/dialog/base-dialog";
import { crearTurno, crearTurnosEnLote, notificarParticipantesPilates } from "@/lib/actions/turno.action";
import { dayjs, isPastDateTime, toYmd } from "@/lib/dayjs";
import { HORARIOS_PILATES_30MIN } from "@/lib/constants/especialidades";
import { useToastStore } from '@/stores/toast-store';
import { AlertTriangle, Users, Clock, Info, Plus, Trash2, CalendarDays } from "lucide-react"; 
import Image from "next/image";
import PacienteAutocomplete from "@/componentes/paciente/paciente-autocomplete";

interface SlotInfo {
  disponible: boolean;
  razon: string;
  tipo: 'libre' | 'existente' | 'completa';
  especialistaAsignado?: string;
  participantes?: number;
}

interface NuevoTurnoPilatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnoCreated?: () => void;
  fechaSeleccionada?: Date | null;
  horaSeleccionada?: string | null;
  especialistas: any[];
  pacientes: any[];
  slotInfo?: SlotInfo | null;
  userRole?: number;
  puedeGestionarTurnos?: boolean;
  currentUserId?: string;
  turnosPorSlot?: Map<string, number>;
}

// Días de la semana (solo lunes a viernes)
const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes', nombreCorto: 'Lun' },
  { id: 2, nombre: 'Martes', nombreCorto: 'Mar' },
  { id: 3, nombre: 'Miércoles', nombreCorto: 'Mié' },
  { id: 4, nombre: 'Jueves', nombreCorto: 'Jue' },
  { id: 5, nombre: 'Viernes', nombreCorto: 'Vie' },
];

// ✅ FUNCIÓN HELPER PARA VALIDAR FECHA Y HORA
function esFechaHoraPasada(fecha: string, hora: string): boolean {
  try {
    return isPastDateTime(fecha, hora);
  } catch {
    return false;
  }
}

function shiftHora(hora: string, deltaMin: number): string | null {
  const [hStr, mStr] = hora.split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + deltaMin;
  if (total < 0 || total > 24 * 60) return null;
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Obtiene las fechas disponibles a partir de hoy (L-V solamente, próximos 90 días)
 */
function obtenerFechasDisponibles(cantidadDias: number = 90): Date[] {
  const fechas: Date[] = [];
  let fecha = dayjs();

  while (fechas.length < cantidadDias) {
    // Solo incluir L-V (1-5, donde 0 = domingo, 6 = sábado)
    const dayOfWeek = fecha.day();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      fechas.push(fecha.toDate());
    }
    fecha = fecha.add(1, 'day');
  }

  return fechas;
}

export function NuevoTurnoPilatesModal({
  isOpen,
  onClose,
  onTurnoCreated,
  fechaSeleccionada,
  horaSeleccionada,
  especialistas,
  pacientes,
  slotInfo,
  userRole = 2,
  puedeGestionarTurnos = false,
  currentUserId,
  turnosPorSlot
}: NuevoTurnoPilatesModalProps) {
  const { addToast } = useToastStore();
  
  // ============= ESTADO DEL FORMULARIO =============
  const [formData, setFormData] = useState({
    especialistaId: '',
    pacientesSeleccionados: [] as number[],
    observaciones: '',
    dificultad: 'principiante' as 'principiante' | 'intermedio' | 'avanzado',
    fecha: fechaSeleccionada || null,
    hora: horaSeleccionada || null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifParticipantes, setNotifParticipantes] = useState(true);

  // ============= ESTADOS PARA BÚSQUEDA DE PACIENTES =============
  const [busquedaPaciente, setBusquedaPaciente] = useState('');

  // ============= ESTADOS PARA SELECTORES DE FECHA/HORA =============
  const [fechasDisponibles, setFechasDisponibles] = useState<Date[]>([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([]);

  // ============= ESTADOS PARA REPETICIÓN =============
  const [mostrarRepeticion, setMostrarRepeticion] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [semanas, setSemanas] = useState<number>(4);
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [hayConflictos, setHayConflictos] = useState(false);
  const [errorFecha, setErrorFecha] = useState('');

  // ============= INICIALIZAR FORMULARIO Y FECHAS DISPONIBLES =============
  useEffect(() => {
    if (isOpen) {
      // Generar fechas disponibles
      setFechasDisponibles(obtenerFechasDisponibles(90));

      // Pre-llenar fecha y hora si vienen seleccionadas
      if (fechaSeleccionada) {
        setFormData(prev => ({
          ...prev,
          fecha: fechaSeleccionada,
          hora: horaSeleccionada || null
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          fecha: null,
          hora: null
        }));
      }

      // Pre-llenar especialista si hay slot existente
      if (slotInfo?.tipo === 'existente' && slotInfo.especialistaAsignado) {
        setFormData(prev => ({
          ...prev,
          especialistaId: slotInfo.especialistaAsignado || '',
        }));
      }

      if (!puedeGestionarTurnos && currentUserId) {
        setFormData(prev => ({
          ...prev,
          especialistaId: String(currentUserId),
        }));
      }

      setNotifParticipantes(true);
      setBusquedaPaciente('');
      setMostrarRepeticion(false);
      setDiasSeleccionados([]);
      setSemanas(4);
      setHorariosOcupados([]);
      setHayConflictos(false);
    }
  }, [isOpen, fechaSeleccionada, horaSeleccionada, slotInfo, puedeGestionarTurnos, currentUserId]);

  // ============= CALCULAR ESPACIOS DISPONIBLES =============
  const espaciosDisponibles = slotInfo?.tipo === 'existente' 
    ? 4 - (slotInfo.participantes || 0)
    : 4;

  // ============= VERIFICAR SI FECHA/HORA ESTÁN EN EL PASADO =============
  const esHoraPasada = formData.fecha && formData.hora
    ? esFechaHoraPasada(
      toYmd(formData.fecha),
      formData.hora
    )
    : false;

  // ============= VERIFICAR CAPACIDAD DEL SLOT EN REAL-TIME =============
  useEffect(() => {
    if (!isOpen || isSubmitting) return;
    console.log('Validando disponibilidad para fecha:', formData.fecha, 'hora:', formData.hora);

    if (!formData.fecha || !formData.hora) {
      setHorariosDisponibles(HORARIOS_PILATES_30MIN);
      return;
    }

    const fechaStr = dayjs(formData.fecha).format('YYYY-MM-DD');
    const key = `${fechaStr}:${formData.hora}`;
    const prev = shiftHora(formData.hora, -30);
    const next = shiftHora(formData.hora, 30);
    const conflictos = [formData.hora, prev, next].filter(Boolean) as string[];
    const hayConflicto = conflictos.some((hora) => {
      const k = `${fechaStr}:${hora}`;
      return (turnosPorSlot?.get(k) || 0) > 0;
    });
    const participantesActuales = turnosPorSlot?.get(key) || 0;
    const horaEstaDisponible = !hayConflicto && participantesActuales < 4;

    if (!horaEstaDisponible && formData.hora) {
      // Si la hora actual no está disponible, limpiarla
      setFormData(prev => ({
        ...prev,
        hora: null
      }));
      addToast({
        variant: 'warning',
        message: 'Horario completo',
        description: 'Este horario tiene su capacidad máxima (4/4)',
      });
    }
  }, [formData.fecha, turnosPorSlot, addToast, isOpen, isSubmitting]);

  // ============= FUNCIONES PARA MANEJAR PACIENTES =============

  const agregarPaciente = (paciente: any) => {
    if (formData.pacientesSeleccionados.length >= espaciosDisponibles) {
      addToast({
        variant: 'error',
        message: 'Límite alcanzado',
        description: `No se pueden agregar más de ${espaciosDisponibles} participantes`,
      });
      return;
    }

    if (!formData.pacientesSeleccionados.includes(paciente.id_paciente)) {
      setFormData(prev => ({
        ...prev,
        pacientesSeleccionados: [...prev.pacientesSeleccionados, paciente.id_paciente]
      }));
      setBusquedaPaciente('');
    }
  };

  const eliminarPaciente = (pacienteId: number) => {
    setFormData(prev => ({
      ...prev,
      pacientesSeleccionados: prev.pacientesSeleccionados.filter(id => id !== pacienteId)
    }));
  };

  // ============= FUNCIONES PARA REPETICIÓN =============
  const toggleDia = (diaId: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(diaId) 
        ? prev.filter(d => d !== diaId)
        : [...prev, diaId]
    );
  };

  // ============= VALIDACIÓN EN TIEMPO REAL DE DISPONIBILIDAD (REPETICIÓN) =============
  useEffect(() => {
    const validarDisponibilidad = async () => {
      if (!mostrarRepeticion || diasSeleccionados.length === 0 || !formData.fecha || !formData.hora) {
        setHorariosOcupados([]);
        setHayConflictos(false);
        return;
      }

      setValidandoDisponibilidad(true);

      try {
        const { verificarDisponibilidadPilates } = await import("@/lib/actions/turno.action");
        const diaBaseNumero = dayjs(formData.fecha).day();
        const ahora = dayjs();
        const ocupados: string[] = [];

        for (let semana = 0; semana < semanas; semana++) {
          for (const diaSeleccionado of diasSeleccionados) {
            const diasDiferencia = (diaSeleccionado - diaBaseNumero + 7) % 7;
            const fechaTurno = dayjs(formData.fecha).add(diasDiferencia + (semana * 7), 'day');
            
            if (fechaTurno.isBefore(ahora)) continue;
            
            const fechaStr = fechaTurno.format("YYYY-MM-DD");
            const horaStr = formData.hora + ':00';
            
            const disponibilidad = await verificarDisponibilidadPilates(fechaStr, horaStr);
            
            if (!disponibilidad.success || !disponibilidad.disponible) {
              const diaSpanish = DIAS_SEMANA.find(d => d.id === diaSeleccionado)?.nombreCorto || '';
              ocupados.push(`${diaSpanish} ${fechaTurno.format("DD/MM")}`);
            }
          }
        }

        setHorariosOcupados(ocupados);
        setHayConflictos(ocupados.length > 0);
      } catch (error) {
        console.error('Error validando disponibilidad:', error);
      } finally {
        setValidandoDisponibilidad(false);
      }
    };

    const timeoutId = setTimeout(() => {
      validarDisponibilidad();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mostrarRepeticion, diasSeleccionados, semanas, formData.fecha, formData.hora]);

  // ============= HANDLE SUBMIT =============
  const handleSubmit = async () => {
    // Validación: Bloquear si la fecha/hora ya pasaron
    if (esHoraPasada) {
      addToast({
        variant: 'error',
        message: 'Horario no disponible',
        description: 'No se pueden crear turnos en horarios que ya pasaron',
      });
      return;
    }

    // Validación: Campos requeridos
    if (!formData.fecha || !formData.hora || !formData.especialistaId || formData.pacientesSeleccionados.length === 0) {
      addToast({
        variant: 'error',
        message: 'Campos requeridos',
        description: 'Por favor completa todos los campos requeridos (Fecha, Hora, Especialista, Participantes)',
      });
      return;
    }

    // Validación: Bloquear si hay conflictos en repetición
    if (mostrarRepeticion && hayConflictos) {
      addToast({
        variant: 'error',
        message: 'Horarios ocupados',
        description: 'Hay conflictos con los horarios seleccionados. Por favor ajusta los días o la cantidad de semanas.',
        duration: 5000,
      });
      return;
    }

    // Validación de permisos
    if (slotInfo?.tipo === 'existente' && !puedeGestionarTurnos && formData.especialistaId !== slotInfo.especialistaAsignado) {
      addToast({
        variant: 'error',
        message: 'Sin permisos',
        description: 'Solo los administradores pueden cambiar el especialista de una clase existente.',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const fecha = toYmd(formData.fecha);
      const hora = formData.hora;

      // ============= SIN REPETICIÓN: CREAR TURNOS SIMPLES =============
      if (!mostrarRepeticion || diasSeleccionados.length === 0) {

        const resultados = [];
        const turnosCreados: any[] = [];
        for (const pacienteId of formData.pacientesSeleccionados) {
          console.log('Creando turno para paciente ID:', pacienteId, 'en fecha:', fecha, 'hora:', hora);

          const resultado = await crearTurno(
            {
              fecha,
              hora: hora + ':00',
              id_especialista: formData.especialistaId,
              id_paciente: pacienteId,
              estado: "programado",
              observaciones: formData.observaciones || null,
              tipo_plan: "particular",
              dificultad: formData.dificultad,
              es_pilates: true,
            },
            ['1d', '2h', '1h'],  // programar recordatorios
            true,                 // enviarNotificacion=true para registrar recordatorios
            undefined,
            { enviarConfirmacion: false }  // omitir confirmación individual
          );
          resultados.push(resultado);
          if (resultado.success && resultado.data) {
            turnosCreados.push(resultado.data);
          }
        }

        // Enviar un único mensaje de confirmación agrupado por participante
        if (notifParticipantes && turnosCreados.length > 0) {
          await notificarParticipantesPilates(turnosCreados);
        }

        const esClaseNueva = slotInfo?.tipo === 'libre';
        const mensaje = esClaseNueva 
          ? `Se creó nueva clase con ${formData.pacientesSeleccionados.length} participante(s)`
          : `Se agregaron ${formData.pacientesSeleccionados.length} participante(s) a la clase existente`;

        addToast({
          variant: 'success',
          message: esClaseNueva ? 'Clase creada' : 'Participantes agregados',
          description: mensaje,
        });

        if (onTurnoCreated) {
          setFormData(prev => ({
            ...prev,
            especialistaId: '',
            fecha: null,
            hora: null,
            pacientesSeleccionados: [],
            observaciones: ''
          }));
          await Promise.resolve(onTurnoCreated());
        }
        
        setTimeout(() => {
          onClose();
        }, 500);
        return;
      }

      // ============= CON REPETICIÓN: CREAR TURNOS EN LOTE =============
      const turnosParaCrear = [];
      const diaBaseNumero = dayjs(formData.fecha).day();

      for (const pacienteId of formData.pacientesSeleccionados) {
        const semanaInicial = 0;

        for (let semana = semanaInicial; semana < semanas + semanaInicial; semana++) {
          for (const diaSeleccionado of diasSeleccionados) {
            let diferenciaDias = diaSeleccionado - diaBaseNumero;
            if (diferenciaDias < 0) diferenciaDias += 7;

            const fechaTurno = dayjs(formData.fecha).add((semana * 7) + diferenciaDias, 'day');
            const fechaFormateada = fechaTurno.format("YYYY-MM-DD");

            const esPasado = esFechaHoraPasada(fechaFormateada, hora);

            if (!esPasado) {
              turnosParaCrear.push({
                id_paciente: pacienteId.toString(),
                id_especialista: formData.especialistaId,
                fecha: fechaFormateada,
                hora_inicio: hora,
                hora_fin: (parseInt(hora.split(':')[0]) + 1).toString().padStart(2, '0') + ':00',
                estado: 'programado',
                dificultad: formData.dificultad,
                es_pilates: true
              });
            }
          }
        }
      }

      if (turnosParaCrear.length === 0) {
        addToast({
          variant: 'warning',
          message: 'Sin turnos para crear',
          description: 'Todos los horarios seleccionados ya pasaron',
        });
        setIsSubmitting(false);
        return;
      }


      const resultado = await crearTurnosEnLote(turnosParaCrear, { enviarNotificacion: notifParticipantes });

      if (resultado.success) {
        const { exitosos, fallidos } = resultado.data as { exitosos: number; fallidos: number; };
        
        if (fallidos > 0) {
          addToast({
            variant: 'warning',
            message: 'Turnos creados parcialmente',
            description: `Se crearon ${exitosos} turnos. ${fallidos} fallaron.`,
          });
        } else {
          addToast({
            variant: 'success',
            message: 'Turnos creados',
            description: `✅ ${exitosos} turnos creados exitosamente`,
          });
        }
        
        if (onTurnoCreated) {
          setFormData(prev => ({
            ...prev,
            esopecialistaId: '',
            fecha: null,
            hora: null,
            pacientesSeleccionados: [],
            observaciones: ''
          }));
          await Promise.resolve(onTurnoCreated());
        }
        
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        addToast({
          variant: 'error',
          message: 'Error',
          description: resultado.error || "Error al crear los turnos",
        });
      }

    } catch (error) {
      console.error('💥 Error creando turnos:', error);
      addToast({
        variant: 'error',
        message: 'Error al crear turnos',
        description: 'No se pudieron crear los turnos de Pilates',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============= RENDERIZAR INFORMACIÓN DEL SLOT =============
  const renderSlotInfo = () => {
    if (!slotInfo) return null;

    // ✅ ALERTA SI EL HORARIO YA PASÓ
    if (esHoraPasada) {
      return (
        <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-800 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium">Horario no disponible</span>
          </div>
          <p className="text-xs md:text-sm">Este horario ya pasó. No se pueden crear turnos en el pasado.</p>
        </div>
      );
    }

    const getIconAndColor = () => {
      switch (slotInfo.tipo) {
        case 'libre':
          return { icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />, color: 'bg-green-50 border-green-200 text-green-800' };
        case 'existente':
          return { icon: <Users className="w-3 h-3 md:w-4 md:h-4" />, color: 'bg-blue-50 border-blue-200 text-blue-800' };
        case 'completa':
          return { icon: <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />, color: 'bg-red-50 border-red-200 text-red-800' };
        default:
          return { icon: <Info className="w-3 h-3 md:w-4 md:h-4" />, color: 'bg-gray-50 border-gray-200 text-gray-800' };
      }
    };

    const { icon, color } = getIconAndColor();

    return (
      <div className={`p-2 md:p-3 rounded-lg border ${color} mb-4`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs md:text-sm font-medium">
            {slotInfo.tipo === 'libre' && 'Nuevo horario disponible'}
            {slotInfo.tipo === 'existente' && 'Agregar a clase existente'}
            {slotInfo.tipo === 'completa' && 'Horario completo'}
          </span>
        </div>
        <p className="text-xs md:text-sm">{slotInfo.razon}</p>
        {slotInfo.tipo === 'existente' && (
          <p className="text-xs mt-1">
            Participantes actuales: {slotInfo.participantes}/4
          </p>
        )}
      </div>
    );
  };

  return (
    <BaseDialog
      type="custom"
      size="lg"
      title={
        slotInfo?.tipo === 'existente' 
          ? "Agregar Participantes a Clase de Pilates"
          : "Crear Nueva Clase de Pilates"
      }
      customIcon={
        <Image
          src="/favicon.svg"
          alt="Logo Fisiopasteur"
          width={24}
          height={24}
          className="w-6 h-6"
        />
      }
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton
      customColor="#9C1838"
      message={
        <div className="space-y-3 md:space-y-4 text-left max-h-[60vh] md:max-h-[70vh] overflow-y-auto px-1">
          {renderSlotInfo()}

          {/* Selector de Fecha */}
          {/* {!fechaSeleccionada && ( */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Fecha*
            </label>
            <input
              type="date"
              value={formData.fecha ? dayjs(formData.fecha).format('YYYY-MM-DD') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-');
                  const nuevaFecha = new Date(Number(y), Number(m) - 1, Number(d));
                  
                  const diaSemana = nuevaFecha.getDay();
                  if (diaSemana === 0 || diaSemana === 6) {
                    setErrorFecha('Los fines de semana no están disponibles para Pilates.');
                    return;
                  }

                  setErrorFecha('');
                  setFormData(prev => ({
                    ...prev,
                    fecha: nuevaFecha,
                    hora: null
                  }));
                } else {
                  setErrorFecha('');
                  setFormData(prev => ({ ...prev, fecha: null, hora: null }));
                }
              }}
              min={dayjs().format('YYYY-MM-DD')}
              max={dayjs().add(90, 'days').format('YYYY-MM-DD')}
              className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
            />
            {errorFecha ? (
              <p className="text-xs text-red-500 mt-1 font-medium">{errorFecha}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Selecciona un día de lunes a viernes</p>
            )}
          </div>
          {/* )} */}

          {/* Selector de Hora */}
          {/* {!horaSeleccionada && ( */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Hora*
            </label>
            <select
              value={formData.hora || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value || null }))}
              className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
            >
              <option value="">Seleccionar hora</option>
              {HORARIOS_PILATES_30MIN.map((hora) => {
                const fechaStr = dayjs(formData.fecha).format('YYYY-MM-DD');
                const key = `${fechaStr}:${hora}`;
                const prev = shiftHora(hora, -30);
                const next = shiftHora(hora, 30);
                const conflictos = [hora, prev, next].filter(Boolean) as string[];
                const hayConflicto = conflictos.some((h) => {
                  const k = `${fechaStr}:${h}`;
                  return (turnosPorSlot?.get(k) || 0) > 0;
                });
                const participantesActuales = turnosPorSlot?.get(key) || 0;
                const disponible = !hayConflicto && participantesActuales < 4;

                return (
                  <option key={hora} value={hora} disabled={!disponible}>
                    {hora} {disponible ? '' : '(Ocupado)'}
                  </option>
                );
              })}
            </select>
            {/* <p className="text-xs text-gray-500 mt-1">Solo se muestran horarios sin superposiciones</p> */}
          </div>
          {/* )} */}

          {/* Información básica del turno */}
          {/* {formData.fecha && formData.hora && (
            <div className="p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs md:text-sm">
                <span className="font-medium text-gray-700">Fecha:</span> {dayjs(formData.fecha).format("dddd DD/MM")}
                <br />
                <span className="font-medium text-gray-700">Hora:</span> {formData.hora}
                {esHoraPasada && (
                  <span className="ml-2 text-xs text-red-600 font-medium">(ya pasó)</span>
                )}
              </p>
            </div>
          )} */}

          {/* Información básica del turno (ANTIGUO - ELIMINAR) */}
          {/* {fechaSeleccionada && horaSeleccionada && (
            <div className="p-2 md:p-3 bg-gray-50 rounded-lg">
              <p className="text-xs md:text-sm">
                <span className="font-medium text-gray-700">Día:</span> {dayjs(fechaSeleccionada).format("dddd DD/MM")}
                <br />
                <span className="font-medium text-gray-700">Horario:</span> {horaSeleccionada}
                {esHoraPasada && (
                  <span className="ml-2 text-xs text-red-600 font-medium">(ya pasó)</span>
                )}
              </p>
            </div>
          )} */}

          {/* Selección de especialista */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Especialista*              
            </label>
            <select
              value={formData.especialistaId}
              onChange={(e) => setFormData(prev => ({ ...prev, especialistaId: e.target.value }))}
              className={`w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent 
              ${puedeGestionarTurnos ? '' : 'cursor-not-allowed bg-gray-50'}`}
              disabled={!puedeGestionarTurnos}
              required
            >
              <option value="">Seleccionar especialista</option>
              {especialistas.map(esp => (
                <option key={esp.id_usuario} value={esp.id_usuario}>
                  {esp.nombre} {esp.apellido}
                </option>
              ))}
            </select>
          </div>

          {/* Selección de dificultad */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Nivel de Dificultad*
            </label>
            <select
              value={formData.dificultad}
              onChange={(e) => setFormData(prev => ({ ...prev, dificultad: e.target.value as any }))}
              className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              required
            >
              <option value="principiante">🟢 Principiante</option>
              <option value="intermedio">🟡 Intermedio</option>
              <option value="avanzado">🔴 Avanzado</option>
            </select>
          </div>

          {/* Selección de pacientes */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Participantes ({formData.pacientesSeleccionados.length}/{espaciosDisponibles})*
            </label>

            {formData.pacientesSeleccionados.length > 0 && (
              <div className="mb-3 space-y-2">
                {formData.pacientesSeleccionados.map(pacienteId => {
                  const paciente = pacientes.find(p => p.id_paciente === pacienteId);
                  if (!paciente) return null;
                  
                  return (
                    <div key={pacienteId} className="flex items-center justify-between p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-xs md:text-sm font-medium text-green-800">
                        {paciente.nombre} {paciente.apellido}
                      </span>
                      <button
                        onClick={() => eliminarPaciente(pacienteId)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Eliminar participante"
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {formData.pacientesSeleccionados.length < espaciosDisponibles && (
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Plus className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  <span className="text-xs md:text-sm font-medium text-gray-700">Agregar participante</span>
                </div>

                <div className="mt-2">
                  <PacienteAutocomplete
                    value={busquedaPaciente}
                    onChange={setBusquedaPaciente}
                    onSelect={agregarPaciente}
                    excludePatientIds={formData.pacientesSeleccionados}
                    placeholder="Buscar por nombre, DNI o teléfono..."
                    inputClassName="w-full pl-8 pr-2 md:pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                    dropdownClassName="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 md:max-h-60 overflow-y-auto"
                    showMinCharsHint
                  />
                </div>
              </div>
            )}
          </div>

          {/* ============= NOTIFICACIONES WHATSAPP ============= */}
          <div className="border-t pt-3 md:pt-4">
            <p className="text-xs md:text-sm font-medium text-gray-700 mb-2">Notificaciones WhatsApp</p>
            <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs md:text-sm text-gray-700">Confirmar a los participantes</span>
                  <p className="text-xs text-gray-500">Enviar mensaje de confirmación de la clase</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifParticipantes(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    notifParticipantes ? 'bg-[#9C1838]' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={notifParticipantes}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    notifParticipantes ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* ============= SECCIÓN DE REPETICIÓN ============= */}
          {!esHoraPasada && formData.fecha && formData.hora && (
            <div className="border-t pt-3 md:pt-4 space-y-2 md:space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="repetir"
                  checked={mostrarRepeticion}
                  onChange={(e) => setMostrarRepeticion(e.target.checked)}
                  className="w-3 h-3 md:w-4 md:h-4 text-[#9C1838] border-gray-300 rounded focus:ring-[#9C1838]"
                />
                <label htmlFor="repetir" className="text-xs md:text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                  <CalendarDays className="w-3 h-3 md:w-4 md:h-4" />
                  Repetir en días específicos
                </label>
              </div>

              {mostrarRepeticion && (
                <div className="space-y-2 md:space-y-3 pl-3 md:pl-6 border-l-2 border-[#9C1838]/20">
                  {/* Selector de días */}
                  <div className="space-y-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-700">
                      Seleccionar días (Lunes a Viernes)
                    </label>
                    <div className="flex gap-1 md:gap-2 flex-wrap">
                      {DIAS_SEMANA.map((dia) => (
                        <button
                          key={dia.id}
                          type="button"
                          onClick={() => toggleDia(dia.id)}
                          className={`w-8 h-8 md:w-10 md:h-10 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                            diasSeleccionados.includes(dia.id)
                              ? 'bg-[#9C1838] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {dia.nombreCorto}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Número de semanas */}
                  <div className="space-y-2">
                    <label htmlFor="semanas" className="block text-xs md:text-sm font-medium text-gray-700">
                      Cantidad de semanas
                    </label>
                    <input
                      id="semanas"
                      type="number"
                      min="1"
                      max="12"
                      value={semanas}
                      onChange={(e) => setSemanas(parseInt(e.target.value) || 1)}
                      className="w-20 md:w-24 px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                    />
                  </div>

                  {/* ⚠️ ALERTA DE CONFLICTOS EN TIEMPO REAL */}
                  {validandoDisponibilidad && diasSeleccionados.length > 0 && (
                    <div className="text-xs md:text-sm bg-gray-50 border border-gray-200 text-gray-600 p-2 md:p-3 rounded-lg animate-pulse">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        Verificando disponibilidad...
                      </div>
                    </div>
                  )}

                  {!validandoDisponibilidad && hayConflictos && horariosOcupados.length > 0 && (
                    <div className="text-xs md:text-sm bg-red-50 border-2 border-red-300 text-red-800 p-2 md:p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="block mb-1">⚠️ Horarios no disponibles</strong>
                          <p className="text-xs text-red-700 mb-2">
                            Ya existen clases de Pilates en los siguientes horarios:
                          </p>
                          <div className="max-h-20 overflow-y-auto bg-red-100 p-2 rounded space-y-1">
                            {horariosOcupados.slice(0, 10).map((horario, idx) => (
                              <div key={idx} className="text-xs text-red-900">
                                • {horario} a las {formData.hora}hs
                              </div>
                            ))}
                            {horariosOcupados.length > 10 && (
                              <div className="text-xs text-red-700 font-medium pt-1 border-t border-red-200">
                                ... y {horariosOcupados.length - 10} más
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-red-700 mt-2 font-medium">
                            💡 Cambia los días seleccionados o reduce las semanas
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview (solo si NO hay conflictos) */}
                  {!validandoDisponibilidad && !hayConflictos && diasSeleccionados.length > 0 && formData.pacientesSeleccionados.length > 0 && (
                    <div className="text-xs md:text-sm bg-green-50 border border-green-200 text-green-800 p-2 md:p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="text-lg">✅</div>
                        <div>
                          <strong className="block">Todos los horarios disponibles</strong>
                          <div className="text-xs mt-1 text-green-700">
                            Se crearán {diasSeleccionados.length * semanas * formData.pacientesSeleccionados.length} turnos
                          </div>
                          <div className="text-xs mt-0.5 text-green-600">
                            {formData.pacientesSeleccionados.length} participante(s) × {diasSeleccionados.length} día(s) × {semanas} semana(s)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              rows={3}
              placeholder="Información adicional sobre la clase..."
            />
          </div>
        </div>
      }
      primaryButton={{
        text: isSubmitting 
          ? "Procesando..." 
          : hayConflictos && mostrarRepeticion
            ? "⚠️ Horarios ocupados"
            : mostrarRepeticion && diasSeleccionados.length > 0
              ? `Crear Turnos`
              : slotInfo?.tipo === 'existente' 
                ? "Agregar Participantes" 
                : "Crear Clase",
        onClick: handleSubmit,
        disabled: isSubmitting || esHoraPasada || (mostrarRepeticion && hayConflictos) || validandoDisponibilidad || !formData.fecha || !formData.hora,
      }}
      secondaryButton={{
        text: "Cancelar",
        onClick: onClose,
      }}
    />
  );
}