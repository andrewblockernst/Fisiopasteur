"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { DiscardChangesDialog } from "@/componentes/dialog/discard-changes-dialog";
import { scrollToFirstError } from "@/lib/utils/scroll-to-error";
import {
  crearPaquetePilates,
  verificarDisponibilidadPaquetePilates,
} from "@/lib/actions/turno.action";
import { dayjs, isPastDateTime, toYmd } from "@/lib/dayjs";
import { validarHoraPasadaInline } from "@/lib/validators/common";
import { DateInput } from "@/componentes/ui/date-input";
import { HORARIOS_PILATES_30MIN } from "@/lib/constants/especialidades";
import { useToastStore } from "@/stores/toast-store";
import { AlertTriangle, Users, Clock, Info, Trash2, CalendarDays } from "lucide-react";
import Image from "next/image";
import PacienteAutocomplete from "@/componentes/paciente/paciente-autocomplete";
import SelectorRecordatorios from "@/componentes/turnos/selector-recordatorios";
import type { TipoRecordatorio } from "@/lib/utils/whatsapp.utils";

interface SlotInfo {
  disponible: boolean;
  razon: string;
  tipo: "libre" | "existente" | "completa";
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
  { id: 1, nombre: "Lunes", nombreCorto: "Lun" },
  { id: 2, nombre: "Martes", nombreCorto: "Mar" },
  { id: 3, nombre: "Miércoles", nombreCorto: "Mié" },
  { id: 4, nombre: "Jueves", nombreCorto: "Jue" },
  { id: 5, nombre: "Viernes", nombreCorto: "Vie" },
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
  const [hStr, mStr] = hora.split(":");
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + deltaMin;
  if (total < 0 || total > 24 * 60) return null;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
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
  turnosPorSlot,
}: NuevoTurnoPilatesModalProps) {
  const { addToast } = useToastStore();

  // ============= ESTADO DEL FORMULARIO =============
  const [formData, setFormData] = useState({
    especialistaId: "",
    pacientesSeleccionados: [] as number[],
    observaciones: "",
    dificultad: "principiante" as "principiante" | "intermedio" | "avanzado",
    fecha: fechaSeleccionada || null,
    hora: horaSeleccionada || null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifParticipantes, setNotifParticipantes] = useState(true);
  const [notifRecordatorios, setNotifRecordatorios] = useState(true);
  const [recordatoriosSeleccionados, setRecordatoriosSeleccionados] = useState<TipoRecordatorio[]>(["1d", "2h", "1h"]);

  // ============= ESTADOS PARA BÚSQUEDA DE PACIENTES =============
  const [busquedaPaciente, setBusquedaPaciente] = useState("");

  // ============= ESTADOS PARA PAQUETE DE SESIONES =============
  const [mostrarRepeticion, setMostrarRepeticion] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [numeroSesiones, setNumeroSesiones] = useState<number>(10);
  const [mantenerHorario, setMantenerHorario] = useState<boolean>(true);
  const [horariosPorDia, setHorariosPorDia] = useState<Record<number, string>>({});
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [hayConflictos, setHayConflictos] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"fecha" | "hora" | "especialistaId" | "pacientes" | "dias", string>>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Flag para saltear el primer pase del auto-clear apenas se abre el modal.
  // Sin esto, el auto-clear corre con `formData` viejo (de la sesión anterior)
  // antes de que el init effect haya aplicado los valores frescos del nuevo
  // slot, y genera un toast falso de "horario no disponible".
  const skipNextAutoClearRef = useRef(false);

  // ============= SUPRIMIR AUTO-CLEAR TRAS UN SUBMIT EXITOSO =============
  // Después de crear los turnos, invalidamos la cache → `turnosPorSlot` se
  // refresca con la clase recién insertada. Si el effect de auto-clear corre
  // en ese intervalo (entre setIsSubmitting(false) y onClose()), interpreta
  // nuestro propio turno como conflicto y dispara un toast falso. Este ref
  // bloquea el effect hasta que se reabra el modal.
  const justCreatedRef = useRef(false);

  // ============= INICIALIZAR / RESETEAR FORMULARIO AL ABRIR =============
  // Cada vez que el modal pasa a abierto reconstruimos `formData` desde cero
  // para que no queden datos del turno creado anteriormente. Sólo conservamos
  // las pre-selecciones que vienen por props (fecha/hora desde una celda del
  // calendario, especialista cuando es una clase existente o cuando el usuario
  // no puede gestionar turnos).
  useEffect(() => {
    if (!isOpen) return;

    // Apenas se abre el modal, el auto-clear debe saltearse una vez:
    // su próximo pase aún ve `formData` con valores stale (de la sesión
    // anterior) y, si esos valores apuntan a un slot ahora ocupado por la
    // clase recién creada, dispara un toast falso. El init effect que sigue
    // aplica los valores frescos; el chequeo correcto corre en el pase posterior.
    skipNextAutoClearRef.current = true;
    justCreatedRef.current = false;

    // Resolver especialista pre-seleccionado según contexto
    // (sólo cuando el usuario actual es especialista y no admin).
    let especialistaInicial = "";
    if (!puedeGestionarTurnos && currentUserId) {
      especialistaInicial = String(currentUserId);
    }

    setFormData({
      especialistaId: especialistaInicial,
      pacientesSeleccionados: [],
      observaciones: "",
      dificultad: "principiante",
      fecha: fechaSeleccionada || null,
      hora: fechaSeleccionada ? (horaSeleccionada || null) : null,
    });

    setNotifParticipantes(true);
    setNotifRecordatorios(true);
    setRecordatoriosSeleccionados(["1d", "2h", "1h"]);
    setBusquedaPaciente("");
    setMostrarRepeticion(false);
    setDiasSeleccionados([]);
    setNumeroSesiones(10);
    setMantenerHorario(true);
    setHorariosPorDia({});
    setHorariosOcupados([]);
    setHayConflictos(false);
    setFieldErrors({});
  }, [isOpen, fechaSeleccionada, horaSeleccionada, slotInfo, puedeGestionarTurnos, currentUserId]);

  // ============= CAPACIDAD MÁXIMA POR CLASE DE PILATES =============
  // Una clase de Pilates admite hasta 4 participantes. Como este modal crea
  // siempre una clase NUEVA (a un slot vacío), los 4 lugares están libres.
  // Agregar participantes a una clase existente va por el modal de detalle.
  const espaciosDisponibles = 4;

  // ============= VERIFICAR SI FECHA/HORA ESTÁN EN EL PASADO =============
  const esHoraPasada = formData.fecha && formData.hora
    ? esFechaHoraPasada(toYmd(formData.fecha), formData.hora)
    : false;

  // ============= VALIDACIÓN INLINE EN VIVO =============
  // Mismo patrón que en /turnos: errores bajo el campo, no disable silencioso.
  // Pilates limita la fecha a 90 días vía HTML; este efecto cubre la cota pasada
  // y la combinación fecha+hora ya vencida.
  useEffect(() => {
    const fechaYmd = formData.fecha ? toYmd(formData.fecha) : "";
    let errFecha: string | undefined;
    if (fechaYmd) {
      const d = dayjs(fechaYmd, "YYYY-MM-DD", true);
      if (!d.isValid()) {
        errFecha = "Fecha inválida.";
      } else if (d.startOf("day").valueOf() < dayjs().startOf("day").valueOf()) {
        errFecha = "La fecha no puede ser pasada.";
      } else if (d.startOf("day").valueOf() > dayjs().add(90, "day").startOf("day").valueOf()) {
        errFecha = "La fecha no puede ser de más de 90 días en el futuro.";
      } else {
        const diaSemana = d.day(); // 0 = domingo, 6 = sábado
        if (diaSemana === 0 || diaSemana === 6) {
          errFecha = "Los fines de semana no están disponibles para Pilates.";
        }
      }
    }
    const errHora =
      !errFecha && formData.hora
        ? validarHoraPasadaInline(fechaYmd, formData.hora) ?? undefined
        : undefined;
    setFieldErrors((prev) => ({
      ...prev,
      fecha: errFecha ?? (prev.fecha === "Requerido" ? prev.fecha : undefined),
      hora: errHora ?? (prev.hora === "Requerido" ? prev.hora : undefined),
    }));
  }, [formData.fecha, formData.hora]);

  // Auto-toggle de "Mantener horario" según haya hora seleccionada (mismo patrón que /turnos).
  const horaPrevRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mostrarRepeticion) {
      horaPrevRef.current = formData.hora;
      return;
    }
    const tieneHora = !!formData.hora;
    const teniaHora = !!horaPrevRef.current;
    if (!tieneHora && mantenerHorario) {
      setMantenerHorario(false);
    } else if (tieneHora && !teniaHora) {
      setMantenerHorario(true);
    }
    horaPrevRef.current = formData.hora;
  }, [formData.hora, mostrarRepeticion]);

  // ============= CHEQUEO DE CONFLICTO DE SLOT =============
  // Regla de Pilates: cada clase dura 1 hora, los slots arrancan en :00 o :30,
  // y NO pueden haber dos clases simultáneas (sin importar especialista ni
  // pacientes). Por lo tanto un slot `H` está en conflicto si existe alguna
  // clase de Pilates en `H`, `H-30` o `H+30` (las que se superpondrían).
  const evaluarSlot = (fecha: Date, hora: string) => {
    const fechaStr = dayjs(fecha).format("YYYY-MM-DD");
    const aqui = (turnosPorSlot?.get(`${fechaStr}:${hora}`) || 0) > 0;
    const antes = (() => {
      const h = shiftHora(hora, -30);
      return h ? (turnosPorSlot?.get(`${fechaStr}:${h}`) || 0) > 0 : false;
    })();
    const despues = (() => {
      const h = shiftHora(hora, 30);
      return h ? (turnosPorSlot?.get(`${fechaStr}:${h}`) || 0) > 0 : false;
    })();
    return { aqui, antes, despues, libre: !aqui && !antes && !despues };
  };

  // ============= AUTO-LIMPIAR HORA SI EL SLOT YA NO ESTÁ DISPONIBLE =============
  useEffect(() => {
    if (!isOpen || isSubmitting || justCreatedRef.current) return;
    if (!formData.fecha || !formData.hora) return;

    // Saltear el primer pase tras abrir el modal: `formData` todavía
    // contiene valores stale de la sesión anterior. Se limpia en cuanto el
    // init effect aplica los valores frescos y vuelve a disparar este effect.
    if (skipNextAutoClearRef.current) {
      skipNextAutoClearRef.current = false;
      return;
    }

    const eval_ = evaluarSlot(formData.fecha, formData.hora);
    if (eval_.libre) return;

    const descripcion = eval_.aqui
      ? "Ya existe una clase de Pilates en este horario."
      : eval_.antes
        ? `Hay otra clase de Pilates a las ${shiftHora(formData.hora, -30)} que se superpone con este horario.`
        : `Hay otra clase de Pilates a las ${shiftHora(formData.hora, 30)} que se superpone con este horario.`;

    setFormData(prev => ({ ...prev, hora: null }));
    addToast({
      variant: "warning",
      message: "Horario no disponible",
      description: descripcion,
    });
  }, [formData.fecha, formData.hora, turnosPorSlot, addToast, isOpen, isSubmitting]);

  // ============= FUNCIONES PARA MANEJAR PACIENTES =============
  const agregarPaciente = (paciente: any) => {
    if (formData.pacientesSeleccionados.length >= espaciosDisponibles) {
      addToast({
        variant: "error",
        message: "Límite alcanzado",
        description: `No se pueden agregar más de ${espaciosDisponibles} participantes`,
      });
      return;
    }

    if (!formData.pacientesSeleccionados.includes(paciente.id_paciente)) {
      setFormData(prev => ({
        ...prev,
        pacientesSeleccionados: [...prev.pacientesSeleccionados, paciente.id_paciente],
      }));
      setBusquedaPaciente("");
      setFieldErrors(p => ({ ...p, pacientes: undefined }));
    }
  };

  const eliminarPaciente = (pacienteId: number) => {
    setFormData(prev => ({
      ...prev,
      pacientesSeleccionados: prev.pacientesSeleccionados.filter(id => id !== pacienteId),
    }));
  };

  // ============= FUNCIONES PARA PAQUETE =============
  const toggleDia = (diaId: number) => {
    setDiasSeleccionados(prev =>
      prev.includes(diaId) ? prev.filter(d => d !== diaId) : [...prev, diaId]
    );
    if (fieldErrors.dias) setFieldErrors(p => ({ ...p, dias: undefined }));
  };

  // ============= VALIDACIÓN EN TIEMPO REAL DE DISPONIBILIDAD PAQUETE PILATES =============
  // Comportamiento:
  //  - Si las condiciones para validar no se cumplen (modo, días, fecha, etc.),
  //    se limpia el estado y NO se marca como "validando".
  //  - Si sí se cumplen, se marca `validandoDisponibilidad=true` SINCRONICAMENTE
  //    apenas cambian los inputs, para ocultar el ✓ stale de una validación
  //    anterior y bloquear el botón "Crear" durante el debounce.
  //  - Tras 500ms sin más cambios, dispara la query al server.
  useEffect(() => {
    const puedeValidar =
      mostrarRepeticion &&
      diasSeleccionados.length > 0 &&
      numeroSesiones > 0 &&
      !!formData.fecha &&
      !!formData.especialistaId &&
      (mantenerHorario
        ? !!formData.hora
        : diasSeleccionados.every((d) => horariosPorDia[d]));

    if (!puedeValidar) {
      setValidandoDisponibilidad(false);
      setHorariosOcupados([]);
      setHayConflictos(false);
      return;
    }

    // Marcar "pendiente" inmediato: oculta el ✓ y deshabilita el botón Crear
    // mientras se procesa el cambio.
    setValidandoDisponibilidad(true);

    const timeoutId = setTimeout(async () => {
      try {
        const resultado = await verificarDisponibilidadPaquetePilates({
          fechaBase: toYmd(formData.fecha!),
          horaBase: formData.hora,
          diasSeleccionados,
          numeroSesiones,
          mantenerHorario,
          horariosPorDia,
        });

        if (!resultado.success) {
          throw new Error(resultado.error || "No se pudo validar disponibilidad");
        }

        const ocupados = resultado.data?.ocupados ?? [];
        setHorariosOcupados(ocupados);
        setHayConflictos(ocupados.length > 0);
      } catch (error) {
        console.error("Error validando disponibilidad:", error);
      } finally {
        setValidandoDisponibilidad(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mostrarRepeticion, diasSeleccionados, numeroSesiones, formData.fecha, formData.hora, formData.especialistaId, mantenerHorario, horariosPorDia]);

  const tieneCambios = useMemo(() => Boolean(
    formData.fecha || formData.hora || formData.especialistaId ||
    formData.pacientesSeleccionados.length > 0 || formData.observaciones ||
    mostrarRepeticion || diasSeleccionados.length > 0,
  ), [formData, mostrarRepeticion, diasSeleccionados]);

  const requestClose = useCallback(() => {
    if (isSubmitting) return;
    if (tieneCambios) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isSubmitting, tieneCambios, onClose]);

  // ============= HANDLE SUBMIT =============
  const handleSubmit = async () => {
    // Preservar errores inline ya calculados (fecha pasada / > 90 días, hora pasada).
    const errs: typeof fieldErrors = {
      fecha: fieldErrors.fecha,
      hora: fieldErrors.hora,
    };
    const esPaquete = mostrarRepeticion && diasSeleccionados.length > 0;
    if (!formData.fecha) errs.fecha = "Requerido";
    // En paquete con horarios por día, la hora base es opcional.
    if (!formData.hora && (!esPaquete || mantenerHorario)) errs.hora = "Requerido";
    if (!formData.especialistaId) errs.especialistaId = "Requerido";
    if (formData.pacientesSeleccionados.length === 0) errs.pacientes = "Agregá al menos un participante";
    if (mostrarRepeticion && diasSeleccionados.length === 0) errs.dias = "Seleccioná al menos un día";
    // Si es paquete con horario por día, exigir que TODOS los días tengan horario.
    if (esPaquete && !mantenerHorario) {
      const diasSinHorario = diasSeleccionados.filter((d) => !horariosPorDia[d]);
      if (diasSinHorario.length > 0) errs.dias = "Asigná un horario a cada día seleccionado.";
    }

    const errsLimpios: typeof fieldErrors = {};
    for (const [k, v] of Object.entries(errs)) {
      if (v) errsLimpios[k as keyof typeof fieldErrors] = v;
    }
    setFieldErrors(errsLimpios);
    if (Object.keys(errsLimpios).length > 0) {
      scrollToFirstError(Object.keys(errsLimpios));
      return;
    }

    if (mostrarRepeticion && hayConflictos) {
      addToast({
        variant: "error",
        message: "Horarios ocupados",
        description: "Hay conflictos con los horarios seleccionados. Por favor ajusta los días o la cantidad de sesiones.",
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const fecha = toYmd(formData.fecha);
      const hora = formData.hora ?? "";

      const recordatoriosParaEnviar = notifRecordatorios ? recordatoriosSeleccionados : [];

      // ============= SIN PAQUETE: UNA SOLA CLASE CON N PARTICIPANTES =============
      // Usamos crearPaquetePilates con un único slot — la RPC inserta atómicamente
      // los N turnos en el mismo horario y maneja la capacidad real (4/slot).
      // El loop por crearTurno fallaba a partir del 2º paciente porque la
      // validación pilates bloquea cualquier turno existente en H/H-30/H+30.
      if (!mostrarRepeticion || diasSeleccionados.length === 0) {
        const resultado = await crearPaquetePilates({
          id_pacientes: formData.pacientesSeleccionados,
          id_especialista: formData.especialistaId,
          dificultad: formData.dificultad,
          turnos: [{ fecha, hora }],
          enviarNotificacion: notifParticipantes || notifRecordatorios,
          tiposRecordatorio: recordatoriosParaEnviar,
        });

        if (!resultado.success) {
          addToast({
            variant: "error",
            message: "No se creó la clase",
            description: resultado.error || "No se pudo crear ningún turno",
            duration: 6000,
          });
          setIsSubmitting(false);
          return;
        }

        const totalCreados = resultado.data?.turnosCreados ?? 0;
        addToast({
          variant: "success",
          message: "Clase creada",
          description: `Se creó la clase con ${totalCreados} participante(s)`,
        });

        justCreatedRef.current = true;
        if (onTurnoCreated) {
          await Promise.resolve(onTurnoCreated());
        }

        setTimeout(() => {
          onClose();
        }, 500);
        return;
      }

      // ============= CON PAQUETE: GENERAR SLOTS Y CREAR VIA RPC ATÓMICA =============
      // Replicamos la lógica de generación de slots de `verificarDisponibilidadPaquete`
      // (la misma RPC que validó arriba) para que los slots enviados a creación
      // coincidan exactamente con los que se verificaron.
      const [year, month, day] = fecha.split("-").map(Number);
      const fechaBaseParsed = new Date(year, month - 1, day);
      const diaBaseNumeroJS = fechaBaseParsed.getDay();
      const diaBaseNumero = diaBaseNumeroJS === 0 ? 7 : diaBaseNumeroJS;

      // Generar TODOS los candidatos posibles, ordenarlos cronológicamente
      // y tomar los primeros N. Si en cambio contáramos en orden semana × día,
      // cuando `fechaBase` cae sobre el último día seleccionado, el último día
      // de "semana N" cae calendariamente ANTES que los primeros días de esa
      // semana y la cuenta se completa antes de visitar el último día final.
      const candidatos: Array<{ fecha: string; hora: string }> = [];
      const horizonteSemanas =
        Math.ceil((numeroSesiones + diasSeleccionados.length) / diasSeleccionados.length) + 2;
      for (let semana = 0; semana < horizonteSemanas; semana++) {
        for (const diaSeleccionado of diasSeleccionados) {
          let diferenciaDias = diaSeleccionado - diaBaseNumero;
          if (diferenciaDias < 0) diferenciaDias += 7;

          const fechaTurno = new Date(fechaBaseParsed);
          fechaTurno.setDate(fechaTurno.getDate() + (semana * 7) + diferenciaDias);
          const fechaFormateada = `${fechaTurno.getFullYear()}-${String(fechaTurno.getMonth() + 1).padStart(2, "0")}-${String(fechaTurno.getDate()).padStart(2, "0")}`;

          const horaSlot = mantenerHorario ? hora : horariosPorDia[diaSeleccionado];
          if (!horaSlot) continue;
          if (esFechaHoraPasada(fechaFormateada, horaSlot)) continue;

          candidatos.push({ fecha: fechaFormateada, hora: horaSlot });
        }
      }

      candidatos.sort((a, b) =>
        `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`)
      );

      const slots: Array<{ fecha: string; hora: string }> = candidatos.slice(0, numeroSesiones);

      if (slots.length === 0) {
        addToast({
          variant: "warning",
          message: "Sin turnos para crear",
          description: "Todos los horarios seleccionados ya pasaron",
        });
        setIsSubmitting(false);
        return;
      }

      // 🚀 Una sola llamada RPC atómica para todo el paquete
      const resultado = await crearPaquetePilates({
        id_pacientes: formData.pacientesSeleccionados,
        id_especialista: formData.especialistaId,
        dificultad: formData.dificultad,
        turnos: slots,
        enviarNotificacion: notifParticipantes || notifRecordatorios,
        tiposRecordatorio: recordatoriosParaEnviar,
      });

      if (resultado.success) {
        const creados = resultado.data?.turnosCreados ?? 0;
        addToast({
          variant: "success",
          message: "Paquete de sesiones creado",
          description: `✅ ${creados} turnos creados exitosamente`,
        });

        justCreatedRef.current = true;
        if (onTurnoCreated) {
          await Promise.resolve(onTurnoCreated());
        }

        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        addToast({
          variant: "error",
          message: "Error",
          description: resultado.error || "Error al crear los turnos",
        });
      }
    } catch (error) {
      console.error("💥 Error creando turnos:", error);
      addToast({
        variant: "error",
        message: "Error al crear turnos",
        description: "No se pudieron crear los turnos de Pilates",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============= RENDERIZAR INFORMACIÓN DEL SLOT =============
  const renderSlotInfo = () => {
    if (!slotInfo) return null;

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
        case "libre":
          return { icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />, color: "bg-green-50 border-green-200 text-green-800" };
        case "existente":
          return { icon: <Users className="w-3 h-3 md:w-4 md:h-4" />, color: "bg-blue-50 border-blue-200 text-blue-800" };
        case "completa":
          return { icon: <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />, color: "bg-red-50 border-red-200 text-red-800" };
        default:
          return { icon: <Info className="w-3 h-3 md:w-4 md:h-4" />, color: "bg-gray-50 border-gray-200 text-gray-800" };
      }
    };

    const { icon, color } = getIconAndColor();

    return (
      <div className={`p-2 md:p-3 rounded-lg border ${color} mb-4`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs md:text-sm font-medium">
            {slotInfo.tipo === "libre" && "Nuevo horario disponible"}
            {slotInfo.tipo === "existente" && "Agregar a clase existente"}
            {slotInfo.tipo === "completa" && "Horario completo"}
          </span>
        </div>
        <p className="text-xs md:text-sm">{slotInfo.razon}</p>
        {slotInfo.tipo === "existente" && (
          <p className="text-xs mt-1">
            Participantes actuales: {slotInfo.participantes}/4
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <BaseDialog
        type="custom"
        size="lg"
        title={
          "Crear Nueva Clase de Pilates"
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
        onClose={requestClose}
        showCloseButton
        closeButtonAlert={tieneCambios ? "Cambios sin guardar" : undefined}
        customColor="var(--brand)"
        message={
          <div className="space-y-3 md:space-y-4 text-left px-1">
            {renderSlotInfo()}

            {/* Especialista */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Especialista*
              </label>
              <select
                id="especialistaId"
                value={formData.especialistaId}
                onChange={(e) => { setFormData(prev => ({ ...prev, especialistaId: e.target.value })); if (fieldErrors.especialistaId) setFieldErrors(p => ({ ...p, especialistaId: undefined })); }}
                className={`w-full px-2 md:px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent ${fieldErrors.especialistaId ? "border-destructive" : "border-gray-300"} ${puedeGestionarTurnos ? "" : "cursor-not-allowed bg-gray-50"}`}
                disabled={!puedeGestionarTurnos}
                required
              >
                <option value="">Seleccionar especialista</option>
                {especialistas.map(esp => (
                  <option key={esp.id_usuario} value={esp.id_usuario}>
                    {esp.apellido}, {esp.nombre}
                  </option>
                ))}
              </select>
              {fieldErrors.especialistaId && <p className="text-destructive text-xs mt-1">{fieldErrors.especialistaId}</p>}
            </div>

            {/* Nivel de Dificultad */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Nivel de Dificultad*
              </label>
              <select
                value={formData.dificultad}
                onChange={(e) => setFormData(prev => ({ ...prev, dificultad: e.target.value as any }))}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                required
              >
                <option value="principiante">🟢 Principiante</option>
                <option value="intermedio">🟡 Intermedio</option>
                <option value="avanzado">🔴 Avanzado</option>
              </select>
            </div>

            {/* Participantes */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2" data-field="pacientes">
                Participantes ({formData.pacientesSeleccionados.length}/{espaciosDisponibles})*
              </label>
              {fieldErrors.pacientes && <p className="text-destructive text-xs mb-2">{fieldErrors.pacientes}</p>}

              {formData.pacientesSeleccionados.length > 0 && (
                <div className="mb-2 space-y-2">
                  {formData.pacientesSeleccionados.map(pacienteId => {
                    const paciente = pacientes.find(p => p.id_paciente === pacienteId);
                    if (!paciente) return null;

                    return (
                      <div key={pacienteId} className="flex items-center justify-between p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-xs md:text-sm font-medium text-green-800">
                          {paciente.apellido}, {paciente.nombre}
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
                <PacienteAutocomplete
                  value={busquedaPaciente}
                  onChange={setBusquedaPaciente}
                  onSelect={agregarPaciente}
                  excludePatientIds={formData.pacientesSeleccionados}
                  placeholder="Buscar por nombre, DNI o teléfono..."
                  containerClassName="relative"
                  inputClassName="w-full pl-8 pr-2 md:pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  dropdownClassName="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 md:max-h-60 overflow-y-auto"
                  showMinCharsHint
                />
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Fecha*
              </label>
              <DateInput
                id="fecha"
                value={formData.fecha ? dayjs(formData.fecha).format("YYYY-MM-DD") : ""}
                onChange={(v) => {
                  if (v) {
                    const [y, m, d] = v.split("-");
                    const nuevaFecha = new Date(Number(y), Number(m) - 1, Number(d));
                    setFormData(prev => ({ ...prev, fecha: nuevaFecha, hora: null }));
                  } else {
                    setFormData(prev => ({ ...prev, fecha: null, hora: null }));
                  }
                }}
                min={dayjs().format("YYYY-MM-DD")}
                max={dayjs().add(90, "days").format("YYYY-MM-DD")}
                className={`w-full px-2 md:px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent ${fieldErrors.fecha ? "border-destructive" : "border-gray-300"}`}
              />
              {fieldErrors.fecha ? (
                <p className="text-destructive text-xs mt-1">{fieldErrors.fecha}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Selecciona un día de lunes a viernes</p>
              )}
            </div>

            {/* Hora */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Hora*
              </label>
              <select
                id="hora"
                value={formData.hora || ""}
                onChange={(e) => { setFormData(prev => ({ ...prev, hora: e.target.value || null })); if (fieldErrors.hora) setFieldErrors(p => ({ ...p, hora: undefined })); }}
                className={`w-full px-2 md:px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent ${fieldErrors.hora ? "border-destructive" : "border-gray-300"}`}
                disabled={!formData.fecha}
              >
                <option value="">
                  {!formData.fecha ? "Primero selecciona una fecha" : "Seleccionar hora"}
                </option>
                {HORARIOS_PILATES_30MIN.map((hora) => {
                  const disponible = formData.fecha ? evaluarSlot(formData.fecha, hora).libre : true;
                  return (
                    <option key={hora} value={hora} disabled={!disponible}>
                      {hora} {disponible ? "" : "(Ocupado)"}
                    </option>
                  );
                })}
              </select>
              {fieldErrors.hora && <p className="text-destructive text-xs mt-1">{fieldErrors.hora}</p>}
            </div>

            {/* ============= PAQUETE DE SESIONES (mismo patrón que nuevo-turno) ============= */}
            {!esHoraPasada && (
              <div className="border-t pt-3 md:pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="repetir"
                    checked={mostrarRepeticion}
                    onChange={(e) => setMostrarRepeticion(e.target.checked)}
                    className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                  />
                  <label htmlFor="repetir" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Paquete de sesiones
                  </label>
                </div>

                {mostrarRepeticion && (
                  <div className="space-y-3 pl-6 border-l-2 border-brand/20">
                    {/* Días */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Días*</label>
                      <div className={`flex gap-2 flex-wrap ${fieldErrors.dias ? "p-1 rounded-lg border border-destructive" : ""}`}>
                        {DIAS_SEMANA.map((dia) => (
                          <button
                            key={dia.id}
                            type="button"
                            onClick={() => toggleDia(dia.id)}
                            className={`flex-1 min-w-[50px] h-10 rounded-lg text-sm font-medium transition-colors ${
                              diasSeleccionados.includes(dia.id)
                                ? "bg-brand text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {dia.nombreCorto}
                          </button>
                        ))}
                      </div>
                      {fieldErrors.dias && <p className="text-destructive text-xs mt-1">{fieldErrors.dias}</p>}
                    </div>

                    {/* Cantidad */}
                    <div>
                      <label htmlFor="sesionesPilatesNuevo" className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad
                      </label>
                      <select
                        id="sesionesPilatesNuevo"
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
                          id="mantenerHorarioPilates"
                          checked={mantenerHorario}
                          onChange={(e) => setMantenerHorario(e.target.checked)}
                          disabled={!formData.hora}
                          className="w-4 h-4 text-brand border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label
                          htmlFor="mantenerHorarioPilates"
                          className={`text-sm ${formData.hora ? "text-gray-600" : "text-gray-400 cursor-not-allowed"}`}
                        >
                          Mantener horario {formData.hora && `(${formData.hora})`}
                        </label>
                      </div>
                      {!formData.hora && (
                        <p className="text-xs text-gray-500 mb-2 ml-6">
                          Seleccioná una hora arriba para mantenerla, o configurá un horario por día.
                        </p>
                      )}

                      {!mantenerHorario && diasSeleccionados.length > 0 && (
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
                                  value={horariosPorDia[diaId] || ""}
                                  onChange={(e) => setHorariosPorDia((prev) => ({ ...prev, [diaId]: e.target.value }))}
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
                              <div>{diasSeleccionados.length} día{diasSeleccionados.length > 1 ? "s" : ""}/semana</div>
                              {formData.hora && <div>Todos los días a las {formData.hora}</div>}
                              {formData.pacientesSeleccionados.length > 0 && (
                                <div>{formData.pacientesSeleccionados.length} participante(s) × {numeroSesiones} = {numeroSesiones * formData.pacientesSeleccionados.length} turnos</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ✅ ADVERTENCIAS DE VALIDACIÓN EN TIEMPO REAL */}
            {mostrarRepeticion && diasSeleccionados.length > 0 && (
              <div className="space-y-2">
                {validandoDisponibilidad && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm md:text-base">
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-700">Validando disponibilidad de horarios...</span>
                  </div>
                )}

                {!validandoDisponibilidad && hayConflictos && (
                  <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-lg md:text-xl">⚠️</span>
                      <div className="flex-1">
                        <p className="font-medium text-red-800 text-sm md:text-base mb-2">
                          Horarios ocupados ({horariosOcupados.length})
                        </p>
                        <div className="max-h-32 md:max-h-40 overflow-y-auto">
                          <ul className="space-y-1 text-xs md:text-sm text-red-700">
                            {horariosOcupados.map((horario, index) => (
                              <li key={index} className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-red-500 rounded-full shrink-0"></span>
                                {horario}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <p className="text-xs md:text-sm text-red-600 mt-2">
                          Por favor, selecciona otros días/horarios o reduce el número de sesiones
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!validandoDisponibilidad && !hayConflictos && diasSeleccionados.length > 0 && numeroSesiones > 0 && formData.especialistaId && formData.fecha && formData.hora && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm md:text-base">
                    <span className="text-lg md:text-xl">✓</span>
                    <span className="text-green-700">
                      Todos los horarios están disponibles
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ============= NOTIFICACIONES WHATSAPP (idéntico al modal de nuevo turno) ============= */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Notificaciones WhatsApp
              </label>

              <div className="space-y-2 rounded-lg border border-gray-200 p-3 bg-gray-50">
                {/* Toggle: Confirmación */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700">Confirmación al crear turno</span>
                    <p className="text-xs text-gray-500">Mensaje inmediato a los participantes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifParticipantes(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      notifParticipantes ? "bg-brand" : "bg-gray-300"
                    }`}
                    role="switch"
                    aria-checked={notifParticipantes}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        notifParticipantes ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle: Recordatorios */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700">Recordatorios automáticos</span>
                    <p className="text-xs text-gray-500">Avisos previos al turno</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifRecordatorios(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      notifRecordatorios ? "bg-brand" : "bg-gray-300"
                    }`}
                    role="switch"
                    aria-checked={notifRecordatorios}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        notifRecordatorios ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Selector de tipos de recordatorio */}
                {notifRecordatorios && (
                  <div className="pt-1">
                    <SelectorRecordatorios
                      recordatoriosSeleccionados={recordatoriosSeleccionados}
                      onRecordatoriosChange={(rec) => setRecordatoriosSeleccionados(rec)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                rows={3}
                placeholder="Información adicional sobre la clase o paquete de sesiones..."
              />
            </div>
          </div>
        }
        primaryButton={{
          text: isSubmitting
            ? "Procesando..."
            : validandoDisponibilidad
              ? "Validando..."
              : hayConflictos && mostrarRepeticion
                ? "⚠️ Horarios ocupados"
                : mostrarRepeticion && diasSeleccionados.length > 0
                  ? `Crear ${numeroSesiones} sesiones`
                  : "Crear Clase",
          onClick: handleSubmit,
          disabled:
            isSubmitting ||
            (mostrarRepeticion && hayConflictos) ||
            validandoDisponibilidad ||
            !formData.fecha ||
            // Hora base no es requerida si es paquete con horario por día.
            (!formData.hora && (!(mostrarRepeticion && diasSeleccionados.length > 0) || mantenerHorario)) ||
            Boolean(fieldErrors.fecha) ||
            Boolean(fieldErrors.hora),
        }}
        secondaryButton={{
          text: "Cancelar",
          onClick: requestClose,
        }}
      />
      <DiscardChangesDialog
        isOpen={showDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => { setShowDiscardConfirm(false); onClose(); }}
      />
    </>
  );
}
