"use client";

import { useState, useEffect, useRef } from "react"; 
import BaseDialog from "@/componentes/dialog/base-dialog";
import { crearTurno } from "@/lib/actions/turno.action";
import { crearTurnosEnLote } from "@/lib/actions/turno.action";
import { format, addWeeks, addDays, getDay, isPast, isToday, parse } from "date-fns";
import { es } from "date-fns/locale";
import { useToastStore } from '@/stores/toast-store';
import { AlertTriangle, Users, Clock, Info, Plus, Trash2, CalendarDays } from "lucide-react"; 
import Image from "next/image";

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
    // Parsear la fecha y hora en formato local
    const [year, month, day] = fecha.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);
    
    const fechaHoraTurno = new Date(year, month - 1, day, hours, minutes);
    const ahora = new Date();
    
    return fechaHoraTurno < ahora;
  } catch {
    return false;
  }
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
  userRole = 2
}: NuevoTurnoPilatesModalProps) {
  const { addToast } = useToastStore();
  
  const [formData, setFormData] = useState({
    especialistaId: '',
    pacientesSeleccionados: [] as number[],
    observaciones: '',
    dificultad: 'principiante' as 'principiante' | 'intermedio' | 'avanzado',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============= ESTADOS PARA BÚSQUEDA DE PACIENTES =============
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacientesFiltrados, setPacientesFiltrados] = useState<any[]>([]);
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const inputPacienteRef = useRef<HTMLInputElement>(null);
  const listaPacientesRef = useRef<HTMLDivElement>(null);

  // ============= NUEVOS ESTADOS PARA REPETICIÓN =============
  const [mostrarRepeticion, setMostrarRepeticion] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [semanas, setSemanas] = useState<number>(4);
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [hayConflictos, setHayConflictos] = useState(false);

  // ✅ VALIDAR SI LA FECHA Y HORA SELECCIONADAS ESTÁN EN EL PASADO
  const esHoraPasada = fechaSeleccionada && horaSeleccionada 
    ? esFechaHoraPasada(
        format(fechaSeleccionada, "yyyy-MM-dd"),
        horaSeleccionada
      )
    : false;

  // ============= FILTRAR PACIENTES SEGÚN BÚSQUEDA =============
  useEffect(() => {
    if (!busquedaPaciente.trim()) {
      setPacientesFiltrados([]);
      return;
    }

    const filtrados = pacientes.filter(paciente => {
      const nombreCompleto = `${paciente.nombre} ${paciente.apellido}`.toLowerCase();
      const busqueda = busquedaPaciente.toLowerCase();
      
      return nombreCompleto.includes(busqueda) ||
             paciente.nombre.toLowerCase().includes(busqueda) ||
             paciente.apellido.toLowerCase().includes(busqueda) ||
             paciente.dni?.toString().includes(busqueda);
    }).slice(0, 10);

    setPacientesFiltrados(filtrados);
  }, [busquedaPaciente, pacientes]);

  // ============= MANEJAR CLICKS FUERA DEL AUTOCOMPLETE =============
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputPacienteRef.current && 
        !inputPacienteRef.current.contains(event.target as Node) &&
        listaPacientesRef.current && 
        !listaPacientesRef.current.contains(event.target as Node)
      ) {
        setMostrarListaPacientes(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============= INICIALIZAR FORMULARIO =============
  useEffect(() => {
    if (isOpen) {
      if (slotInfo?.tipo === 'existente' && slotInfo.especialistaAsignado) {
        setFormData({
          especialistaId: slotInfo.especialistaAsignado,
          pacientesSeleccionados: [],
          observaciones: '',
          dificultad: 'principiante'
        });
      } else {
        setFormData({
          especialistaId: '',
          pacientesSeleccionados: [],
          observaciones: '',
          dificultad: 'principiante'
        });
      }
      
      setBusquedaPaciente('');
      setMostrarListaPacientes(false);
      setMostrarRepeticion(false);
      setDiasSeleccionados([]);
      setSemanas(4);
    }
  }, [isOpen, slotInfo]);

  // ============= FUNCIONES PARA MANEJAR PACIENTES =============
  const espaciosDisponibles = slotInfo?.tipo === 'existente' 
    ? 4 - (slotInfo.participantes || 0)
    : 4;

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
      setMostrarListaPacientes(false);
    }
  };

  const eliminarPaciente = (pacienteId: number) => {
    setFormData(prev => ({
      ...prev,
      pacientesSeleccionados: prev.pacientesSeleccionados.filter(id => id !== pacienteId)
    }));
  };

  const handleBusquedaPacienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusquedaPaciente(valor);
    
    if (!valor.trim()) {
      setMostrarListaPacientes(false);
    } else {
      setMostrarListaPacientes(true);
    }
  };

  // ============= FUNCIONES PARA REPETICIÓN =============
  const toggleDia = (diaId: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(diaId) 
        ? prev.filter(d => d !== diaId)
        : [...prev, diaId]
    );
  };

  // ============= VALIDACIÓN EN TIEMPO REAL DE DISPONIBILIDAD =============
  useEffect(() => {
    const validarDisponibilidad = async () => {
      // Solo validar si está activa la repetición y hay días seleccionados
      if (!mostrarRepeticion || diasSeleccionados.length === 0 || !fechaSeleccionada || !horaSeleccionada) {
        setHorariosOcupados([]);
        setHayConflictos(false);
        return;
      }

      setValidandoDisponibilidad(true);

      try {
        const { verificarDisponibilidadPilates } = await import("@/lib/actions/turno.action");
        const diaBaseNumero = getDay(fechaSeleccionada);
        const ahora = new Date();
        const ocupados: string[] = [];

        // Verificar cada combinación de fecha/hora
        for (let semana = 0; semana < semanas; semana++) {
          for (const diaSeleccionado of diasSeleccionados) {
            const diasDiferencia = (diaSeleccionado - diaBaseNumero + 7) % 7;
            const fechaTurno = addDays(fechaSeleccionada, diasDiferencia + (semana * 7));
            
            if (fechaTurno < ahora) continue;
            
            const fechaStr = format(fechaTurno, "yyyy-MM-dd");
            const horaStr = horaSeleccionada + ':00';
            
            const disponibilidad = await verificarDisponibilidadPilates(fechaStr, horaStr);
            
            if (!disponibilidad.success || !disponibilidad.disponible) {
              const diaSpanish = DIAS_SEMANA.find(d => d.id === diaSeleccionado)?.nombreCorto || '';
              ocupados.push(`${diaSpanish} ${format(fechaTurno, "dd/MM")}`);
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

    // Debounce para evitar múltiples llamadas
    const timeoutId = setTimeout(() => {
      validarDisponibilidad();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mostrarRepeticion, diasSeleccionados, semanas, fechaSeleccionada, horaSeleccionada]);

  const handleSubmit = async () => {
    // ✅ VALIDACIÓN: Bloquear si la fecha/hora ya pasaron
    if (esHoraPasada) {
      addToast({
        variant: 'error',
        message: 'Horario no disponible',
        description: 'No se pueden crear turnos en horarios que ya pasaron',
      });
      return;
    }

    if (!fechaSeleccionada || !horaSeleccionada || !formData.especialistaId || formData.pacientesSeleccionados.length === 0) {
      addToast({
        variant: 'error',
        message: 'Campos requeridos',
        description: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    // ✅ BLOQUEAR si hay conflictos detectados
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
    if (slotInfo?.tipo === 'existente' && userRole !== 1 && formData.especialistaId !== slotInfo.especialistaAsignado) {
      addToast({
        variant: 'error',
        message: 'Sin permisos',
        description: 'Solo los administradores pueden cambiar el especialista de una clase existente.',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const fecha = format(fechaSeleccionada, "yyyy-MM-dd");
      const hora = horaSeleccionada;

      // ============= SIN REPETICIÓN: CREAR TURNOS SIMPLES =============
      if (!mostrarRepeticion || diasSeleccionados.length === 0) {

        const resultados = [];
        for (const pacienteId of formData.pacientesSeleccionados) {
          const resultado = await crearTurno({
            fecha,
            hora: hora + ':00',
            id_especialista: formData.especialistaId,
            id_paciente: pacienteId,
            estado: "programado",
            observaciones: formData.observaciones || null,
            tipo_plan: "particular",
            dificultad: formData.dificultad,                
            es_pilates: true  
          });
          resultados.push(resultado);
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
          await Promise.resolve(onTurnoCreated());
        }
        
        setTimeout(() => {
          onClose();
        }, 500);
        return;
      }

      // ============= CON REPETICIÓN: CREAR TURNOS EN LOTE =============
      
      const turnosParaCrear = [];
      const diaBaseNumero = getDay(fechaSeleccionada);
      const ahora = new Date();

      // Por cada paciente seleccionado
      for (const pacienteId of formData.pacientesSeleccionados) {
        // ✅ SIEMPRE empezar desde la semana 0 (actual) cuando creamos nuevo turno
        const semanaInicial = 0;

        // Por cada semana
        for (let semana = semanaInicial; semana < semanas + semanaInicial; semana++) {
          // Por cada día seleccionado
          for (const diaSeleccionado of diasSeleccionados) {
            // Calcular la diferencia de días
            let diferenciaDias = diaSeleccionado - diaBaseNumero;
            if (diferenciaDias < 0) diferenciaDias += 7;

            const fechaTurno = addWeeks(fechaSeleccionada, semana);
            fechaTurno.setDate(fechaTurno.getDate() + diferenciaDias);
            
            const fechaFormateada = format(fechaTurno, "yyyy-MM-dd");
            
            // ✅ VALIDACIÓN: Solo verificar si ya pasó, NO excluir la fecha actual
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
            } else {
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


      const resultado = await crearTurnosEnLote(turnosParaCrear);

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

          {/* Información básica del turno */}
          <div className="p-2 md:p-3 bg-gray-50 rounded-lg">
            <p className="text-xs md:text-sm">
              <span className="font-medium text-gray-700">Día:</span> {fechaSeleccionada ? format(fechaSeleccionada, "EEEE dd/MM", { locale: es }) : ""}
              <br />
              <span className="font-medium text-gray-700">Horario:</span> {horaSeleccionada}
              {esHoraPasada && (
                <span className="ml-2 text-xs text-red-600 font-medium">(ya pasó)</span>
              )}
            </p>
          </div>

          {/* Selección de especialista */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Especialista*
              {slotInfo?.tipo === 'existente' && userRole !== 1 && (
                <span className="block md:inline text-xs text-gray-500 md:ml-2">(Preseleccionado)</span>
              )}
            </label>
            <select
              value={formData.especialistaId}
              onChange={(e) => setFormData(prev => ({ ...prev, especialistaId: e.target.value }))}
              className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              disabled={slotInfo?.tipo === 'existente' && userRole !== 1}
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
                
                <input
                  ref={inputPacienteRef}
                  type="text"
                  value={busquedaPaciente}
                  onChange={handleBusquedaPacienteChange}
                  onFocus={() => busquedaPaciente.trim() && setMostrarListaPacientes(true)}
                  className="w-full mt-2 px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                  placeholder="Buscar por nombre, DNI..."
                  autoComplete="off"
                />
                
                {mostrarListaPacientes && pacientesFiltrados.length > 0 && (
                  <div 
                    ref={listaPacientesRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 md:max-h-60 overflow-y-auto"
                  >
                    {pacientesFiltrados
                      .filter(paciente => !formData.pacientesSeleccionados.includes(paciente.id_paciente))
                      .map((paciente) => (
                      <div
                        key={paciente.id_paciente}
                        onClick={() => agregarPaciente(paciente)}
                        className="px-2 md:px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium">
                          {paciente.nombre} {paciente.apellido}
                        </div>
                        <div className="text-xs text-gray-500">
                          DNI: {paciente.dni} • Tel: {paciente.telefono || 'No disponible'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {mostrarListaPacientes && busquedaPaciente.trim() && pacientesFiltrados.length === 0 && (
                  <div 
                    ref={listaPacientesRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-xs md:text-sm"
                  >
                    No se encontraron pacientes
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============= SECCIÓN DE REPETICIÓN ============= */}
          {!esHoraPasada && (
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
                                • {horario} a las {horaSeleccionada}hs
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
        disabled: isSubmitting || esHoraPasada || (mostrarRepeticion && hayConflictos) || validandoDisponibilidad,
      }}
      secondaryButton={{
        text: "Cancelar",
        onClick: onClose,
      }}
    />
  );
}