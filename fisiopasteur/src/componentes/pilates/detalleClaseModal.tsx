"use client";

import { useState, useEffect, useMemo } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { eliminarTurno, actualizarTurno, crearPaquetePilates, actualizarClasePilates, notificarCancelacionesPilates, notificarModificacionesPilates } from "@/lib/actions/turno.action";
import { dayjs, isPastDateTime } from "@/lib/dayjs";
import {
  validarFechaTurnoInline,
  validarHoraPasadaInline,
  fechaTurnoEditarMinInput,
  fechaTurnoMaxInput,
} from "@/lib/validators/common";
import { DateInput } from "@/componentes/ui/date-input";
import { HORARIOS_PILATES_30MIN } from "@/lib/constants/especialidades";
import { useToastStore } from '@/stores/toast-store';
import { Users, Clock, Calendar, User, AlertTriangle, Trash2, Settings, CalendarDays, Info } from "lucide-react";
import Image from "next/image";
import PacienteAutocomplete from "@/componentes/paciente/paciente-autocomplete";

interface DetalleClaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnosActualizados?: () => Promise<void> | void;
  turnos: any[];
  especialistas: any[];
  pacientes: any[];
  userRole?: number;
  puedeGestionarTurnos?: boolean;
  currentUserId?: string;
}

// Días de la semana (solo lunes a viernes)
const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes', nombreCorto: 'Lun' },
  { id: 2, nombre: 'Martes', nombreCorto: 'Mar' },
  { id: 3, nombre: 'Miércoles', nombreCorto: 'Mié' },
  { id: 4, nombre: 'Jueves', nombreCorto: 'Jue' },
  { id: 5, nombre: 'Viernes', nombreCorto: 'Vie' },
];

export function DetalleClaseModal({
  isOpen,
  onClose,
  onTurnosActualizados,
  turnos: turnosIniciales,
  especialistas,
  pacientes,
  userRole = 2,
  puedeGestionarTurnos = false,
  currentUserId
}: DetalleClaseModalProps) {
  const { addToast } = useToastStore();
  
  // ============= ESTADO INTERNO PARA LOS TURNOS =============
  const [turnos, setTurnos] = useState(turnosIniciales);
  const [modoResolucionConflicto, setModoResolucionConflicto] = useState(false);
  const [especialistaSeleccionado, setEspecialistaSeleccionado] = useState('');
  const [pacientesSeleccionados, setPacientesSeleccionados] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [dificultadSeleccionada, setDificultadSeleccionada] = useState<'principiante' | 'intermedio' | 'avanzado'>('principiante');
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // ============= FECHA Y HORA EDITABLES (inline, junto a los demás campos) =============
  const [fechaEditable, setFechaEditable] = useState<string>('');
  const [horaEditable, setHoraEditable] = useState<string>('');

  // Errores inline (mismo patrón que /turnos y nuevo-turno-pilates).
  const [fieldErrors, setFieldErrors] = useState<{ fecha?: string; hora?: string }>({});

  useEffect(() => {
    let errFecha = validarFechaTurnoInline(fechaEditable, "editar") ?? undefined;
    if (!errFecha && fechaEditable) {
      const diaSemana = dayjs(fechaEditable, "YYYY-MM-DD", true).day();
      if (diaSemana === 0 || diaSemana === 6) {
        errFecha = "Los fines de semana no están disponibles para Pilates.";
      }
    }
    const errHora = !errFecha
      ? validarHoraPasadaInline(fechaEditable, horaEditable) ?? undefined
      : undefined;
    setFieldErrors({ fecha: errFecha, hora: errHora });
  }, [fechaEditable, horaEditable]);

  // ============= BÚSQUEDA SMART DE PACIENTES (RPC vía PacienteAutocomplete) =============
  const [busquedaPaciente, setBusquedaPaciente] = useState('');

  // ============= PAQUETE DE SESIONES (inline checkbox, copiado de nuevo-turno) =============
  const [mostrarRepeticion, setMostrarRepeticion] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [numeroSesiones, setNumeroSesiones] = useState<number>(10);
  // Horario del paquete: por defecto se mantiene la hora de la clase original.
  // Si el usuario quiere variar por día, destilda y completa el mapa.
  const [mantenerHorarioRepeticion, setMantenerHorarioRepeticion] = useState<boolean>(true);
  const [horariosPorDiaRepeticion, setHorariosPorDiaRepeticion] = useState<Record<number, string>>({});
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [hayConflictos, setHayConflictos] = useState(false);
  const [isRepitiendo, setIsRepitiendo] = useState(false);

  // ============= SINCRONIZAR CON PROPS CUANDO CAMBIAN =============
  useEffect(() => {
    setTurnos(turnosIniciales);
  }, [turnosIniciales]);

  const especialistaClaseId = turnos[0]?.id_especialista ?? turnosIniciales[0]?.id_especialista;
  const puedeEditar = puedeGestionarTurnos || (currentUserId && String(especialistaClaseId) === String(currentUserId));


  // Obtener información de la clase (usar estado interno)
  const primeraClase = turnos[0];
  const fechaClase = primeraClase?.fecha;
  const horaClase = primeraClase?.hora?.substring(0, 5);
  
  // ✅ Parsear correctamente para mostrar
  const fechaClaseDate = fechaClase ? (() => {
    return dayjs(fechaClase, 'YYYY-MM-DD').toDate();
  })() : null;

  // Sincronizar fecha/hora editable con la clase cuando cambian los turnos
  useEffect(() => {
    setFechaEditable(fechaClase ?? '');
    setHoraEditable(horaClase ?? '');
  }, [fechaClase, horaClase]);

  // Verificar si hay conflicto de especialistas
  const especialistasUnicos = [...new Set(turnos.map(t => t.id_especialista))];
  const hayConflicto = especialistasUnicos.length > 1;

  // Agrupar turnos por especialista
  const turnosPorEspecialista = turnos.reduce((acc: any, turno: any) => {
    const key = turno.id_especialista;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(turno);
    return acc;
  }, {});

  // ============= FUNCIÓN PARA RECARGAR DATOS INTERNOS =============
  const recargarDatosModal = async () => {
    try {
      if (!turnos.length) return;
      
      const primeraClase = turnos[0];
      const fechaClase = primeraClase?.fecha;
      const horaClase = primeraClase?.hora?.slice(0, 5);
      
      
      const { obtenerTurnosConFiltros } = await import("@/lib/actions/turno.action");
      
      const resultado = await obtenerTurnosConFiltros({
        fecha_desde: fechaClase,
        fecha_hasta: fechaClase,
        // especialidad_id: 4,
        hora_desde: horaClase,
        hora_hasta: horaClase,
        es_pilates: true,
      });
      
      if (resultado.success && resultado.data) {
        const turnosClase = ((resultado as any).data as any[]).filter(turno => 
          turno.fecha === fechaClase && 
          turno.hora?.slice(0, 5) === horaClase &&
          turno.id_especialista === primeraClase.id_especialista
        );
        
        setTurnos(turnosClase);
        
        return turnosClase;
      } else {
        console.error('❌ Error recargando datos del modal:', resultado.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado recargando datos del modal:', error);
    }
    
    return turnos;
  };

  // ================= FUNCION: Verificar disponibilidad para fecha/hora (ignora conflicto consigo mismo si se pasa excludeTurnoId) =================
  const checkDisponibilidad = async (fecha: string, hora: string, excludeTurnoId?: number) => {
    try {
      const { verificarDisponibilidadPilates } = await import("@/lib/actions/turno.action");
      const horaFormateada = hora.endsWith(':00') ? hora : `${hora}:00`;
      const res = await verificarDisponibilidadPilates(fecha, horaFormateada);

      if (!res || !res.success) {
        return { ok: false, message: res?.error || 'Error verificando disponibilidad' };
      }

      if (res.disponible === true) return { ok: true };

      const conflictos = res.conflictos as any[] | undefined;
      if (Array.isArray(conflictos) && excludeTurnoId) {
        if (conflictos.length === 1 && Number(conflictos[0].id_turno) === Number(excludeTurnoId)) {
          return { ok: true };
        }
      }

      return { ok: false, message: 'Horario no disponible' };
    } catch (error) {
      console.error('Error checkDisponibilidad:', error);
      return { ok: false, message: 'Error verificando disponibilidad' };
    }
  };

  // Similar a checkDisponibilidad pero acepta un array de ids a excluir (para mover toda la clase)
  const checkDisponibilidadMultiple = async (fecha: string, hora: string, excludeTurnoIds?: number[]) => {
    try {
      const { verificarDisponibilidadPilates } = await import("@/lib/actions/turno.action");
      const horaFormateada = hora.endsWith(':00') ? hora : `${hora}:00`;
      const res = await verificarDisponibilidadPilates(fecha, horaFormateada);

      if (!res || !res.success) {
        return { ok: false, message: res?.error || 'Error verificando disponibilidad' };
      }

      if (res.disponible === true) return { ok: true };

      const conflictos = res.conflictos as any[] | undefined;
      if (Array.isArray(conflictos) && Array.isArray(excludeTurnoIds) && excludeTurnoIds.length > 0) {
        // Si todos los conflictos están dentro de excludeTurnoIds, lo consideramos disponible
        const conflictosFiltrados = conflictos.filter(c => !excludeTurnoIds.includes(Number(c.id_turno)));
        if (conflictosFiltrados.length === 0) {
          return { ok: true };
        }
      }

      return { ok: false, message: 'Horario no disponible' };
    } catch (error) {
      console.error('Error checkDisponibilidadMultiple:', error);
      return { ok: false, message: 'Error verificando disponibilidad' };
    }
  };

  // Helpers para validar/normalizar hora según cuadrilla de Pilates
  const HORA_MIN_AM = '08:00';
  const HORA_MAX_AM = '11:00';
  const HORA_MIN_PM = '14:30';
  const HORA_MAX_PM = '21:30';

  const timeToMinutes = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + (mm || 0);
  };

  const isHoraEnRango = (t: string) => {
    const m = timeToMinutes(t);
    return (m >= timeToMinutes(HORA_MIN_AM) && m <= timeToMinutes(HORA_MAX_AM)) ||
           (m >= timeToMinutes(HORA_MIN_PM) && m <= timeToMinutes(HORA_MAX_PM));
  };

  const normalizeHoraToNearest = (t: string) => {
    const m = timeToMinutes(t);
    if (m <= timeToMinutes(HORA_MIN_AM)) return HORA_MIN_AM;
    if (m >= timeToMinutes(HORA_MIN_AM) && m <= timeToMinutes(HORA_MAX_AM)) return t;
    if (m > timeToMinutes(HORA_MAX_AM) && m < timeToMinutes(HORA_MIN_PM)) return HORA_MIN_PM;
    if (m >= timeToMinutes(HORA_MIN_PM) && m <= timeToMinutes(HORA_MAX_PM)) return t;
    return HORA_MAX_PM;
  };

  const handleMovingClaseHoraChange = (value: string) => {
    if (!value) {
      setHoraEditable(value);
      return;
    }

    const normalized = normalizeHoraToNearest(value);
    if (normalized !== value) {
      addToast({ variant: 'info', message: 'Hora ajustada', description: `La hora se ajustó a ${normalized} según la cuadrilla disponible.` });
    }
    setHoraEditable(normalized);
  };

  // Generar lista de horarios permitidos (cada 15 minutos) dentro de las franjas
  const generateAllowedTimes = () => {
    const times: string[] = [];
    const pushRange = (start: string, end: string) => {
      let current = timeToMinutes(start);
      const endM = timeToMinutes(end);
      while (current <= endM) {
        const hh = Math.floor(current / 60).toString().padStart(2, '0');
        const mm = (current % 60).toString().padStart(2, '0');
        times.push(`${hh}:${mm}`);
        current += 15; // 15-minute steps
      }
    };

    pushRange(HORA_MIN_AM, HORA_MAX_AM);
    pushRange(HORA_MIN_PM, HORA_MAX_PM);
    return times;
  };

  const allowedTimes = generateAllowedTimes();

  // Inicializar valores cuando se abre el modal
  useEffect(() => {
    if (isOpen && turnos.length > 0) {
      if (hayConflicto) {
        setModoResolucionConflicto(true);
        setEspecialistaSeleccionado('');
        setPacientesSeleccionados([]);
      } else {
        setEspecialistaSeleccionado(primeraClase.id_especialista);
        setPacientesSeleccionados(turnos.map(t => t.id_paciente));
        setModoResolucionConflicto(false);
      }
      setDificultadSeleccionada(primeraClase?.dificultad || 'principiante');
      setCambiosPendientes(false);

      setBusquedaPaciente('');

      // Resetear estado de repetición
      setMostrarRepeticion(false);
      setDiasSeleccionados([]);
      setNumeroSesiones(10);
      setHorariosOcupados([]);
      setHayConflictos(false);
    }
  }, [isOpen, turnos, hayConflicto]);

  // ============= DETECTAR CAMBIOS =============
  useEffect(() => {
    if (!isOpen || !turnos.length || hayConflicto) return;
    
    const pacientesOriginales = turnos.map(t => t.id_paciente).sort();
    const pacientesActuales = [...pacientesSeleccionados].sort();
    const especialistaOriginal = primeraClase?.id_especialista;
    const dificultadOriginal = primeraClase?.dificultad || 'principiante';
    
    const hayCambiosParticipantes = JSON.stringify(pacientesOriginales) !== JSON.stringify(pacientesActuales);
    const hayCambioEspecialista = especialistaSeleccionado !== especialistaOriginal;
    const hayCambioDificultad = dificultadSeleccionada !== dificultadOriginal;
    const hayCambioFechaHora = (fechaEditable && fechaEditable !== fechaClase) || (horaEditable && horaEditable !== horaClase);

    setCambiosPendientes(hayCambiosParticipantes || hayCambioEspecialista || hayCambioDificultad || Boolean(hayCambioFechaHora));
  }, [pacientesSeleccionados, especialistaSeleccionado, dificultadSeleccionada, fechaEditable, horaEditable, fechaClase, horaClase, turnos, isOpen, hayConflicto]);

  // ============= FUNCIONES PARA MANEJAR PACIENTES =============
  const agregarPaciente = (paciente: any) => {
    if (pacientesSeleccionados.length >= 4) {
      addToast({
        variant: 'error',
        message: 'Clase completa',
        description: 'No se pueden agregar más de 4 participantes',
      });
      return;
    }

    if (pacientesSeleccionados.includes(paciente.id_paciente)) {
      addToast({
        variant: 'warning',
        message: 'Paciente ya agregado',
        description: 'Este paciente ya está en la clase',
      });
      setBusquedaPaciente('');
      return;
    }

    setPacientesSeleccionados(prev => [...prev, paciente.id_paciente]);
    setBusquedaPaciente('');
  };

  const eliminarPaciente = (pacienteId: number) => {
    setPacientesSeleccionados(prev => prev.filter(id => id !== pacienteId));
  };

  // ============= FUNCIÓN PARA MANEJAR DÍAS DE LA SEMANA =============
  const toggleDia = (diaId: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(diaId) 
        ? prev.filter(d => d !== diaId)
        : [...prev, diaId]
    );
  };

  // ============= SEMANAS DERIVADAS DEL NÚMERO DE SESIONES =============
  // Para reusar la lógica existente que itera por semanas/días, derivamos
  // cuántas semanas necesitamos para cubrir `numeroSesiones` con los días seleccionados.
  const semanasDerivadas = useMemo(() => {
    if (diasSeleccionados.length === 0) return 0;
    return Math.ceil(numeroSesiones / diasSeleccionados.length);
  }, [numeroSesiones, diasSeleccionados.length]);

  // ============= VALIDACIÓN EN TIEMPO REAL DE DISPONIBILIDAD (PAQUETE DE SESIONES) =============
  // Comportamiento idéntico al nuevo modal de Pilates: marcamos `validando`
  // sincrónicamente al detectar cambio de inputs para que el ✓ stale no
  // confunda al usuario durante el debounce.
  useEffect(() => {
    const puedeValidar =
      mostrarRepeticion &&
      diasSeleccionados.length > 0 &&
      !!fechaClase &&
      !!horaClase &&
      (mantenerHorarioRepeticion ||
        diasSeleccionados.every((d) => horariosPorDiaRepeticion[d]));

    if (!puedeValidar) {
      setValidandoDisponibilidad(false);
      setHorariosOcupados([]);
      setHayConflictos(false);
      return;
    }

    setValidandoDisponibilidad(true);

    const timeoutId = setTimeout(async () => {
      try {
        const { verificarDisponibilidadPaquetePilates } = await import("@/lib/actions/turno.action");
        const idClaseOriginal = turnos[0]?.id_turno;
        const resultado = await verificarDisponibilidadPaquetePilates({
          fechaBase: fechaClase!,
          horaBase: horaClase,
          diasSeleccionados,
          numeroSesiones,
          mantenerHorario: mantenerHorarioRepeticion,
          horariosPorDia: horariosPorDiaRepeticion,
          id_turno_excluir: idClaseOriginal,
        });

        if (!resultado.success) {
          throw new Error(resultado.error || "No se pudo validar disponibilidad");
        }

        const ocupados = resultado.data?.ocupados ?? [];
        setHorariosOcupados(ocupados);
        setHayConflictos(ocupados.length > 0);
      } catch (error) {
        console.error('Error validando disponibilidad:', error);
      } finally {
        setValidandoDisponibilidad(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mostrarRepeticion, diasSeleccionados, numeroSesiones, semanasDerivadas, fechaClase, horaClase, mantenerHorarioRepeticion, horariosPorDiaRepeticion]);

  // ============= RESOLVER CONFLICTO =============
  const handleResolverConflicto = async () => {
    if (!especialistaSeleccionado) {
      addToast({
        variant: 'error',
        message: 'Selecciona especialista',
        description: 'Debes elegir qué especialista mantendrá todos los turnos.',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      
      for (const turno of turnos) {
        if (turno.id_especialista !== especialistaSeleccionado) {
          await actualizarTurno(turno.id_turno, {
            id_especialista: especialistaSeleccionado,
            dificultad: dificultadSeleccionada
          });
        }
      }

      addToast({
        variant: 'success',
        message: 'Conflicto resuelto',
        description: `Todos los turnos ahora pertenecen al mismo especialista.`,
      });

      setModoResolucionConflicto(false);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await recargarDatosModal();
      
      if (onTurnosActualizados) {
        await Promise.resolve(onTurnosActualizados());
      }
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error resolviendo conflicto:', error);
      addToast({
        variant: 'error',
        message: 'Error al resolver conflicto',
        description: 'No se pudo unificar la clase bajo un especialista.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============= GUARDAR CAMBIOS NORMALES =============
  const handleGuardarCambios = async () => {
    if (!puedeEditar) {
      addToast({
        variant: 'error',
        message: 'Sin permisos',
        description: 'Solo puedes editar clases propias o si eres administrador.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const fechaCambia = Boolean(fechaEditable && fechaEditable !== fechaClase);
      const horaCambia = Boolean(horaEditable && horaEditable !== horaClase);
      const fechaFinal = fechaCambia ? fechaEditable! : fechaClase;
      const horaFinal = horaCambia ? horaEditable! : horaClase;

      // ✅ Una sola transacción atómica: mover + eliminar + actualizar + crear
      const resultado = await actualizarClasePilates({
        turno_ids: turnos.map((t) => t.id_turno),
        pacientes_finales: pacientesSeleccionados,
        fecha_destino: fechaFinal,
        hora_destino: horaFinal,
        id_especialista: especialistaSeleccionado,
        dificultad: dificultadSeleccionada,
      });

      if (!resultado.success) {
        addToast({
          variant: 'error',
          message: 'No se pudo actualizar la clase',
          description: resultado.error,
          duration: 6000,
        });
        setIsSubmitting(false);
        return;
      }

      // ✅ Notificaciones agrupadas a partir de lo que reporta la RPC
      const { eliminados, actualizados } = resultado.data;
      const nuevoEspecialista = especialistas.find(
        (e) => String(e.id_usuario) === especialistaSeleccionado,
      );

      const notifsCancel = eliminados
        .filter((a) => a.paciente.telefono)
        .map((a) => ({
          nombre: a.paciente.nombre,
          telefono: String(a.paciente.telefono),
          fecha: dayjs(a.fecha).format('DD/MM/YYYY'),
          hora: String(a.hora).substring(0, 5),
        }));
      if (notifsCancel.length > 0) {
        await notificarCancelacionesPilates(notifsCancel);
      }

      const notifsModif = actualizados
        .filter((a) => {
          if (!a.paciente.telefono) return false;
          const movioFechaHora = fechaCambia || horaCambia;
          const cambioEspecialista = a.anterior.id_especialista !== a.id_especialista;
          return movioFechaHora || cambioEspecialista;
        })
        .map((a) => {
          const fechaActualFmt = dayjs(a.fecha).format('DD/MM/YYYY');
          const horaActualFmt = String(a.hora).substring(0, 5);
          const fechaAntFmt = a.anterior.fecha ? dayjs(a.anterior.fecha).format('DD/MM/YYYY') : fechaActualFmt;
          const horaAntFmt = a.anterior.hora ? String(a.anterior.hora).substring(0, 5) : horaActualFmt;
          return {
            telefono: String(a.paciente.telefono),
            nombrePaciente: `${a.paciente.nombre ?? ''} ${a.paciente.apellido ?? ''}`.trim(),
            anterior: {
              fecha: fechaAntFmt,
              hora: horaAntFmt,
              profesional: a.anterior.especialista
                ? `${a.anterior.especialista.nombre} ${a.anterior.especialista.apellido}`.trim()
                : 'Profesional',
              especialidad: 'Pilates',
              boxLabel: null,
            },
            actual: {
              fecha: fechaActualFmt,
              hora: horaActualFmt,
              profesional: nuevoEspecialista
                ? `${nuevoEspecialista.nombre} ${nuevoEspecialista.apellido}`.trim()
                : `${a.especialista.nombre} ${a.especialista.apellido}`.trim(),
              especialidad: 'Pilates',
              boxLabel: null,
            },
          };
        });
      if (notifsModif.length > 0) {
        await notificarModificacionesPilates(notifsModif);
      }

      addToast({
        variant: 'success',
        message: 'Clase actualizada',
        description: 'Se aplicaron todos los cambios correctamente',
      });

      setCambiosPendientes(false);

      await new Promise((resolve) => setTimeout(resolve, 800));
      await recargarDatosModal();

      if (onTurnosActualizados) {
        await Promise.resolve(onTurnosActualizados());
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
      onClose();
    } catch (error) {
      console.error('❌ Error actualizando clase:', error);
      addToast({
        variant: 'error',
        message: 'Error al actualizar',
        description: error instanceof Error ? error.message : 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============= ELIMINAR CLASE =============
  const handleEliminarClase = async () => {
    if (!puedeEditar) {
      addToast({
        variant: 'error',
        message: 'Sin permisos',
        description: 'Solo puedes eliminar clases propias o si eres administrador.',
      });
      return;
    }
    setIsSubmitting(true);
    
    try {
      // Acumular datos de notificación antes de eliminar
      const notifsCancel = turnos
        .filter(t => t.paciente?.telefono)
        .map(t => ({
          nombre: t.paciente.nombre,
          telefono: String(t.paciente.telefono),
          fecha: dayjs(t.fecha).format("DD/MM/YYYY"),
          hora: String(t.hora).substring(0, 5),
        }));

      for (const turno of turnos) {
        await eliminarTurno(turno.id_turno, { notificar: false });
      }

      if (notifsCancel.length > 0) {
        await notificarCancelacionesPilates(notifsCancel); // after() internamente → retorna inmediato
      }

      addToast({
        variant: 'success',
        message: 'Clase eliminada',
        description: 'La clase se eliminó correctamente',
      });

      if (onTurnosActualizados) {
        await Promise.resolve(onTurnosActualizados());
      }
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error eliminando clase:', error);
      addToast({
        variant: 'error',
        message: 'Error al eliminar',
        description: 'No se pudo eliminar la clase',
      });
    } finally {
      setIsSubmitting(false);
      setMostrarConfirmacionEliminar(false);
    }
  };

  // ============= FUNCIÓN PARA REPETIR CLASE (SIMPLIFICADA) =============
  const handleRepetirClase = async () => {
    if (!puedeEditar) {
      addToast({
        variant: 'error',
        message: 'Sin permisos',
        description: 'Solo puedes repetir clases propias o si eres administrador.',
      });
      return;
    }
    if (diasSeleccionados.length === 0) {
      addToast({
        variant: 'error',
        message: 'Días requeridos',
        description: 'Debes seleccionar al menos un día de la semana',
      });
      return;
    }

    if (pacientesSeleccionados.length === 0) {
      addToast({
        variant: 'error',
        message: 'Sin participantes',
        description: 'La clase actual no tiene participantes para repetir',
      });
      return;
    }

    // ✅ BLOQUEAR si hay conflictos detectados
    if (hayConflictos) {
      addToast({
        variant: 'error',
        message: 'Horarios ocupados',
        description: 'Hay conflictos con los horarios seleccionados. Por favor ajusta los días o la cantidad de semanas.',
        duration: 5000,
      });
      return;
    }

    setIsRepitiendo(true);

    try {
      const [year, month, day] = fechaClase!.split('-').map(Number);
      const fechaBase = new Date(year, month - 1, day);
      const diaBaseNumeroJS = fechaBase.getDay();
      const diaBaseNumero = diaBaseNumeroJS === 0 ? 7 : diaBaseNumeroJS;

      // Generar TODOS los candidatos posibles en un horizonte amplio y luego
      // ordenarlos cronológicamente para tomar los primeros N. Evita que la
      // cuenta termine antes de visitar el último día seleccionado cuando la
      // fecha base cae sobre ese mismo día (ver crearPaqueteSesiones).
      const candidatos: Array<{ fecha: string; hora: string }> = [];
      const horizonteSemanas =
        Math.ceil((numeroSesiones + diasSeleccionados.length) / diasSeleccionados.length) + 2;
      for (let semana = 0; semana < horizonteSemanas; semana++) {
        for (const diaSeleccionado of diasSeleccionados) {
          let diferenciaDias = diaSeleccionado - diaBaseNumero;
          if (diferenciaDias < 0) diferenciaDias += 7;

          const fechaTurno = new Date(fechaBase);
          fechaTurno.setDate(fechaTurno.getDate() + (semana * 7) + diferenciaDias);
          const fechaFormateada = dayjs(fechaTurno).format("YYYY-MM-DD");

          const horaSlot = mantenerHorarioRepeticion ? horaClase! : horariosPorDiaRepeticion[diaSeleccionado];
          if (!horaSlot) continue;

          const esMismaFecha = fechaFormateada === fechaClase && horaSlot === horaClase;
          if (esMismaFecha) continue; // la clase original no se replica
          if (isPastDateTime(fechaFormateada, horaSlot)) continue;

          candidatos.push({ fecha: fechaFormateada, hora: horaSlot });
        }
      }

      candidatos.sort((a, b) =>
        `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`)
      );
      const slots = candidatos.slice(0, numeroSesiones);

      if (slots.length === 0) {
        addToast({
          variant: 'warning',
          message: 'Sin turnos nuevos',
          description: 'Todos los horarios seleccionados ya pasaron o coinciden con la clase original',
        });
        setIsRepitiendo(false);
        return;
      }

      // 🚀 Una sola llamada RPC atómica
      const resultado = await crearPaquetePilates({
        id_pacientes: pacientesSeleccionados,
        id_especialista: especialistaSeleccionado,
        dificultad: dificultadSeleccionada,
        turnos: slots,
      });

      if (resultado.success) {
        const creados = resultado.data?.turnosCreados ?? 0;
        addToast({
          variant: 'success',
          message: 'Paquete de sesiones creado',
          description: `✅ ${creados} turnos creados`,
        });

        setMostrarRepeticion(false);
        setDiasSeleccionados([]);

        if (onTurnosActualizados) {
          await Promise.resolve(onTurnosActualizados());
        }

        setTimeout(() => {
          onClose();
        }, 1200);

      } else {
        addToast({
          variant: 'error',
          message: 'Error',
          description: resultado.error || 'No se pudieron crear los turnos',
        });
      }

    } catch (error) {
      console.error('❌ Error repitiendo clase:', error);
      addToast({
        variant: 'error',
        message: 'Error al repetir clase',
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsRepitiendo(false);
    }
  };

  const renderContenido = () => {
    // Confirmación de eliminación
    if (mostrarConfirmacionEliminar) {
      return (
        <div className="text-center space-y-4">
          <div className="text-red-600 text-4xl">⚠️</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar clase completa?
            </h3>
            <p className="text-gray-600">
              Esta acción eliminará todos los turnos de esta clase y no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setMostrarConfirmacionEliminar(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEliminarClase}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      );
    }

    // Modo resolución de conflictos
    if (modoResolucionConflicto && hayConflicto) {
      return (
        <div className="space-y-6">
          {/* Alerta de conflicto */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">Conflicto de Especialistas</span>
            </div>
            <p className="text-sm text-red-700 mb-3">
              Esta clase tiene turnos asignados a múltiples especialistas. Como administrador, puedes resolver este conflicto seleccionando un especialista único para toda la clase.
            </p>
            
            {/* Mostrar especialistas en conflicto */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-800">Especialistas actuales:</p>
              {Object.entries(turnosPorEspecialista).map(([especialistaId, turnosEsp]: [string, any]) => {
                const especialista = especialistas.find(e => String(e.id_usuario) === String(especialistaId));
                return (
                  <div key={especialistaId} className="text-sm text-red-700 ml-4">
                    • {especialista?.nombre} {especialista?.apellido} ({turnosEsp.length} turnos)
                  </div>
                );
              })}
            </div>
          </div>

          {/* Información básica */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">Información de la clase</span>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {fechaClaseDate ? dayjs(fechaClaseDate).format("dddd DD/MM") : ''} - {horaClase}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Users className="w-4 h-4" />
                <span>{turnos.length} participantes totales</span>
              </div>
            </div>
          </div>

          {/* Selección de especialista para resolver conflicto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona el especialista que mantendrá TODOS los turnos:
            </label>
            <select
              value={especialistaSeleccionado}
              onChange={(e) => setEspecialistaSeleccionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Seleccionar especialista...</option>
              {especialistas.map(esp => (
                <option key={esp.id_usuario} value={esp.id_usuario}>
                  {esp.nombre} {esp.apellido}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Todos los turnos de esta clase se asignarán a este especialista.
            </p>
          </div>

          {/* Selección de dificultad para resolver conflicto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nivel de dificultad para toda la clase:
            </label>
            <select
              value={dificultadSeleccionada}
              onChange={(e) => setDificultadSeleccionada(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="principiante">🟢 Principiante</option>
              <option value="intermedio">🟡 Intermedio</option>
              <option value="avanzado">🔴 Avanzado</option>
            </select>
          </div>

          {/* Lista de participantes afectados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participantes que se verán afectados:
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
              {turnos.map((turno, index) => {
                const especialistaActual = especialistas.find(e => String(e.id_usuario) === String(turno.id_especialista));
                return (
                  <div key={turno.id_turno} className="text-sm flex justify-between">
                    <span>{turno.paciente?.nombre} {turno.paciente?.apellido}</span>
                    <span className="text-gray-500">
                      (Actual: {especialistaActual?.nombre} {especialistaActual?.apellido})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones de resolución */}
          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={() => setModoResolucionConflicto(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleResolverConflicto}
              disabled={isSubmitting || !especialistaSeleccionado}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Resolviendo...' : 'Resolver Conflicto'}
            </button>
          </div>
        </div>
      );
    }

    // Vista principal del modal - TODO EDITABLE
    const especialistaActual = especialistas.find(e => String(e.id_usuario) === String(primeraClase?.id_especialista));

    return (
      <div className="space-y-3 md:space-y-4 text-left px-1">
        {/* Especialista */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            <span className="inline-flex items-center gap-2">
              <User className="w-3 h-3 md:w-4 md:h-4" />
              Especialista
              {userRole === 1 && (
                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded">Admin</span>
              )}
            </span>
          </label>
          {userRole === 1 ? (
            <select
              value={especialistaSeleccionado}
              onChange={(e) => setEspecialistaSeleccionado(e.target.value)}
              className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
            >
              {especialistas.map(esp => (
                <option key={esp.id_usuario} value={esp.id_usuario}>
                  {esp.apellido}, {esp.nombre}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
              <div
                className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: especialistaActual?.color || '#e0e7ff' }}
              />
              <span className="text-xs md:text-sm font-medium">
                {especialistaActual?.apellido}, {especialistaActual?.nombre}
              </span>
            </div>
          )}
        </div>

        {/* Nivel de Dificultad */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            <span className="inline-flex items-center gap-2">
              <Settings className="w-3 h-3 md:w-4 md:h-4" />
              Nivel de Dificultad
            </span>
          </label>
          <select
            value={dificultadSeleccionada}
            onChange={(e) => setDificultadSeleccionada(e.target.value as any)}
            className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
            disabled={!puedeEditar}
          >
            <option value="principiante">🟢 Principiante</option>
            <option value="intermedio">🟡 Intermedio</option>
            <option value="avanzado">🔴 Avanzado</option>
          </select>
        </div>

        {/* Participantes — búsqueda smart vía RPC */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            <span className="inline-flex items-center gap-2">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              Participantes ({pacientesSeleccionados.length}/4)
            </span>
          </label>

          {pacientesSeleccionados.length > 0 && (
            <div className="mb-2 space-y-2">
              {pacientesSeleccionados.map(pacienteId => {
                const paciente = pacientes.find(p => p.id_paciente === pacienteId);
                if (!paciente) return null;
                return (
                  <div key={pacienteId} className="flex items-center justify-between p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-xs md:text-sm font-medium text-green-800">
                      {paciente.apellido}, {paciente.nombre}
                    </span>
                    <button
                      onClick={() => eliminarPaciente(pacienteId)}
                      className={`text-red-500 hover:text-red-700 transition-colors ${!puedeEditar ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Eliminar participante"
                      disabled={!puedeEditar}
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {puedeEditar && pacientesSeleccionados.length < 4 && (
            <PacienteAutocomplete
              value={busquedaPaciente}
              onChange={setBusquedaPaciente}
              onSelect={(p: any) => agregarPaciente(p)}
              excludePatientIds={pacientesSeleccionados}
              placeholder="Buscar por nombre, DNI o teléfono..."
              containerClassName="relative"
              inputClassName="w-full pl-8 pr-2 md:pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
              dropdownClassName="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 md:max-h-60 overflow-y-auto"
            />
          )}
          {pacientesSeleccionados.length === 4 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <span>⚠️</span>
              Clase completa (máximo 4 participantes)
            </p>
          )}
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
              Fecha
            </span>
          </label>
          <DateInput
            value={fechaEditable}
            onChange={(v) => setFechaEditable(v)}
            min={fechaTurnoEditarMinInput()}
            max={fechaTurnoMaxInput()}
            className={`w-full px-2 md:px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent ${
              fieldErrors.fecha ? 'border-destructive' : 'border-gray-300'
            }`}
            disabled={!puedeEditar}
          />
          {fieldErrors.fecha && (
            <p className="text-destructive text-xs mt-1">{fieldErrors.fecha}</p>
          )}
        </div>

        {/* Hora */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            <span className="inline-flex items-center gap-2">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              Hora
            </span>
          </label>
          <select
            value={horaEditable}
            onChange={(e) => handleMovingClaseHoraChange(e.target.value)}
            className={`w-full px-2 md:px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent bg-white ${
              fieldErrors.hora ? 'border-destructive' : 'border-gray-300'
            }`}
            disabled={!puedeEditar}
          >
            <option value="">Seleccionar hora</option>
            {allowedTimes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {fieldErrors.hora && (
            <p className="text-destructive text-xs mt-1">{fieldErrors.hora}</p>
          )}
        </div>

        {/* ============= PAQUETE DE SESIONES (checkbox inline, mismo patrón que nuevo-turno) ============= */}
        <div className="border-t pt-3 md:pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="repetirPilates"
              checked={mostrarRepeticion}
              onChange={(e) => setMostrarRepeticion(e.target.checked)}
              className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
              disabled={!puedeEditar}
            />
            <label htmlFor="repetirPilates" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Repetir clase
            </label>
          </div>

          {mostrarRepeticion && (
            <div className="space-y-3 pl-6 border-l-2 border-brand/20">
              {/* Días */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Días</label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map((dia) => (
                    <button
                      key={dia.id}
                      type="button"
                      onClick={() => toggleDia(dia.id)}
                      className={`flex-1 min-w-[50px] h-10 rounded-lg text-sm font-medium transition-colors ${
                        diasSeleccionados.includes(dia.id)
                          ? 'bg-brand text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {dia.nombreCorto}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label htmlFor="sesionesPilates" className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad
                </label>
                <select
                  id="sesionesPilates"
                  value={numeroSesiones}
                  onChange={(e) => setNumeroSesiones(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                >
                  {[5, 8, 10, 12, 15, 20].map(num => (
                    <option key={num} value={num}>{num} sesiones</option>
                  ))}
                </select>
              </div>

              {/* Horario: mantener o por día */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Horario</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="mantenerHorarioRepPilates"
                    checked={mantenerHorarioRepeticion}
                    onChange={(e) => setMantenerHorarioRepeticion(e.target.checked)}
                    disabled={!horaClase || !puedeEditar}
                    className="w-4 h-4 text-brand border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label
                    htmlFor="mantenerHorarioRepPilates"
                    className={`text-sm ${horaClase ? "text-gray-600" : "text-gray-400 cursor-not-allowed"}`}
                  >
                    Mantener horario {horaClase && `(${horaClase})`}
                  </label>
                </div>

                {!mantenerHorarioRepeticion && diasSeleccionados.length > 0 && (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Configurá el horario para cada día
                    </div>
                    {diasSeleccionados.map((diaId) => {
                      const dia = DIAS_SEMANA.find((d) => d.id === diaId);
                      if (!dia) return null;
                      return (
                        <div key={diaId} className="flex items-center gap-2">
                          <label className="text-sm text-gray-700 w-20 shrink-0">{dia.nombre}</label>
                          <select
                            value={horariosPorDiaRepeticion[diaId] || ""}
                            onChange={(e) => setHorariosPorDiaRepeticion((prev) => ({ ...prev, [diaId]: e.target.value }))}
                            disabled={!puedeEditar}
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand focus:border-transparent"
                          >
                            <option value="">Seleccionar hora</option>
                            {HORARIOS_PILATES_30MIN.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preview */}
              {diasSeleccionados.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-green-800">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-sm flex-1">
                      <strong>{numeroSesiones} sesiones</strong>
                      <div className="text-xs text-green-600 mt-1 space-y-0.5">
                        <div>{diasSeleccionados.length} día{diasSeleccionados.length > 1 ? 's' : ''}/semana</div>
                        {mantenerHorarioRepeticion ? (
                          <div>Todos los días a las {horaClase}</div>
                        ) : (
                          <div>Horario distinto por día</div>
                        )}
                        <div>📌 Mismos participantes, especialista y nivel de dificultad</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validación en tiempo real */}
              {validandoDisponibilidad && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm md:text-base">
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-700">Validando disponibilidad de horarios...</span>
                </div>
              )}

              {!validandoDisponibilidad && hayConflictos && horariosOcupados.length > 0 && (
                <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-red-800 text-sm md:text-base mb-2">
                        Horarios ocupados ({horariosOcupados.length})
                      </p>
                      <div className="max-h-32 md:max-h-40 overflow-y-auto">
                        <ul className="space-y-1 text-xs md:text-sm text-red-700">
                          {horariosOcupados.map((horario, index) => (
                            <li key={index} className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-red-500 rounded-full shrink-0"></span>
                              {horario} a las {horaClase}hs
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-xs md:text-sm text-red-600 mt-2">
                        Cambia los días seleccionados o reduce la cantidad de sesiones
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!validandoDisponibilidad && !hayConflictos && diasSeleccionados.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm md:text-base">
                  <span className="text-lg md:text-xl">✓</span>
                  <span className="text-green-700">
                    Todos los horarios están disponibles
                  </span>
                </div>
              )}

              {/* Botón para crear el paquete */}
              <button
                type="button"
                onClick={handleRepetirClase}
                disabled={
                  isRepitiendo ||
                  diasSeleccionados.length === 0 ||
                  hayConflictos ||
                  validandoDisponibilidad ||
                  !puedeEditar ||
                  Boolean(fieldErrors.fecha) ||
                  Boolean(fieldErrors.hora) ||
                  (!mantenerHorarioRepeticion && diasSeleccionados.some((d) => !horariosPorDiaRepeticion[d]))
                }
                className="w-full px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-active disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {isRepitiendo
                  ? 'Creando sesiones...'
                  : hayConflictos
                    ? '⚠️ Horarios ocupados'
                    : validandoDisponibilidad
                      ? 'Validando...'
                      : `Crear ${numeroSesiones} sesiones`}
              </button>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col md:flex-row gap-2 pt-3 md:pt-4 border-t">
          <button
            onClick={() => setMostrarConfirmacionEliminar(true)}
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors ${!puedeEditar ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!puedeEditar}
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden md:inline">Eliminar clase</span>
            <span className="md:hidden">Eliminar</span>
          </button>

          <div className="flex-1 hidden md:block"></div>

          {cambiosPendientes && (
            <button
              onClick={handleGuardarCambios}
              disabled={isSubmitting || !puedeEditar || Boolean(fieldErrors.fecha) || Boolean(fieldErrors.hora)}
              className="px-4 md:px-6 py-2 text-sm bg-[#9C1838] text-white rounded-md hover:bg-[#7d1329] disabled:opacity-50 transition-colors font-medium"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <BaseDialog
      type="custom"
      size="lg"
      title={
        hayConflicto && modoResolucionConflicto
          ? "🚨 Resolver Conflicto de Especialistas"
          : hayConflicto 
            ? "⚠️ Clase con Conflicto - Modo Administrador" 
            : "Detalles de Clase de Pilates"
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
      customColor={hayConflicto ? "#dc2626" : "#9C1838"}
      message={renderContenido()}
    />
  );
}