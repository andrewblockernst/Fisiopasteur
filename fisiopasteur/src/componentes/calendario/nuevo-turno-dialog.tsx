"use client";

import { useState, useEffect, useRef } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { obtenerEspecialistas, obtenerPacientes, obtenerEspecialidades, obtenerBoxes, crearTurno, obtenerAgendaEspecialista, obtenerTurnos } from "@/lib/actions/turno.action";
import { NuevoPacienteDialog } from "@/componentes/paciente/nuevo-paciente-dialog";
import SelectorRecordatorios from "@/componentes/turnos/selector-recordatorios";
import Image from "next/image";
import Loading from "../loading";
import { useToastStore } from '@/stores/toast-store';
import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";
import { useAuth } from '@/hooks/usePerfil';
import { UserPlus2, CalendarDays, Info } from "lucide-react";
import type { TipoRecordatorio } from "@/lib/utils/whatsapp.utils";
import { format } from "date-fns";

interface NuevoTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnoCreated?: () => void;
  fechaSeleccionada?: Date | null;
  horaSeleccionada?: string | null;
  especialistas?: any[];
  pacientes?: any[];
}

// ✅ Días de la semana (SIN Sábado ni Domingo)
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
    const [year, month, day] = fecha.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);
    
    const fechaHoraTurno = new Date(year, month - 1, day, hours, minutes);
    const ahora = new Date();
    
    return fechaHoraTurno < ahora;
  } catch {
    return false;
  }
}

export function NuevoTurnoModal({
  isOpen,
  onClose,
  onTurnoCreated,
  fechaSeleccionada = null,
  horaSeleccionada = '',
  especialistas: especialistasProp = [],
  pacientes: pacientesProp = []
}: NuevoTurnoModalProps) {
  // 🔍 LOG DE DEBUGGING - Ver qué datos recibe el modal
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 ===== MODAL NUEVO TURNO ABIERTO =====');
      console.log('📅 Fecha seleccionada:', fechaSeleccionada);
      console.log('⏰ Hora seleccionada:', horaSeleccionada);
      console.log('👨‍⚕️ Especialistas recibidos (props):', especialistasProp);
      console.log('👥 Pacientes recibidos (props):', pacientesProp);
      console.log('📊 Cantidad de especialistas:', especialistasProp?.length || 0);
      console.log('📊 Cantidad de pacientes:', pacientesProp?.length || 0);
      console.log('=======================================');
    }
  }, [isOpen, fechaSeleccionada, horaSeleccionada, especialistasProp, pacientesProp]);

  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    id_especialista: '',
    id_especialidad: '',
    tipo_plan: 'particular' as 'particular' | 'obra_social',
    id_paciente: '',
    id_box: '',
    observaciones: '',
    precio: '',
    recordatorios: ['1d', '2h'] as TipoRecordatorio[]
  });

  // Estados para datos cargados automáticamente
  const [especialistas, setEspecialistas] = useState<any[]>(especialistasProp);
  const [pacientes, setPacientes] = useState<any[]>(pacientesProp);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [boxesDisponibles, setBoxesDisponibles] = useState<any[]>([]);
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
  const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false);
  const [verificandoBoxes, setVerificandoBoxes] = useState(false);
  const [showNuevoPacienteDialog, setShowNuevoPacienteDialog] = useState(false);
  const { addToast } = useToastStore();

  // Estados para el autocomplete de pacientes
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacientesFiltrados, setPacientesFiltrados] = useState<any[]>([]);
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const inputPacienteRef = useRef<HTMLInputElement>(null);
  const listaPacientesRef = useRef<HTMLDivElement>(null);

  // ============= NUEVOS ESTADOS PARA REPETICIÓN DE SESIONES =============
  const [mostrarRepeticion, setMostrarRepeticion] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [numeroSesiones, setNumeroSesiones] = useState<number>(10);
  const [mantenerHorario, setMantenerHorario] = useState<boolean>(true);
  // ✅ Horarios específicos por día
  const [horariosPorDia, setHorariosPorDia] = useState<Record<number, string>>({
    1: '09:00', 2: '09:00', 3: '09:00', 4: '09:00', 5: '09:00',
  });
  const [horariosDisponiblesPorDia, setHorariosDisponiblesPorDia] = useState<Record<number, string[]>>({});
  const [cargandoHorarios, setCargandoHorarios] = useState(false);

  // Dialog para mensajes
  const [dialog, setDialog] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ 
    open: false, 
    type: 'success', 
    message: '' 
  });

  // ✅ VALIDAR SI LA FECHA Y HORA SELECCIONADAS ESTÁN EN EL PASADO
  const esHoraPasada = formData.fecha && formData.hora 
    ? esFechaHoraPasada(formData.fecha, formData.hora)
    : false;

  // Cargar datos si no vienen por props
  useEffect(() => {
    if (!isOpen) return;
    
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const promises = [];
        
        if (especialistasProp.length === 0) {
          promises.push(obtenerEspecialistas().then(res => {
            if (res.success) setEspecialistas(res.data || []);
          }));
        }
        
        if (pacientesProp.length === 0) {
          promises.push(obtenerPacientes().then(res => {
            if (res.success) setPacientes(res.data || []);
          }));
        }
        
        promises.push(
          obtenerEspecialidades().then(res => {
            if (res.success) setEspecialidades(res.data || []);
          }),
          obtenerBoxes().then(res => {
            if (res.success) setBoxes(res.data || []);
          })
        );
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [isOpen, especialistasProp.length, pacientesProp.length]);

  // Filtrar pacientes según búsqueda
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

  // Manejar clicks fuera del autocomplete
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

  // Establecer fecha y hora seleccionadas cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const updates: Partial<typeof formData> = {};
      
      if (fechaSeleccionada) {
        updates.fecha = fechaSeleccionada.toISOString().split('T')[0];
      }
      
      if (horaSeleccionada) {
        updates.hora = horaSeleccionada;
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [fechaSeleccionada, horaSeleccionada, isOpen]);

  // Precargar especialista si no es admin
  useEffect(() => {
    if (user && !user.esAdmin && user.id_usuario && isOpen) {
      setFormData(prev => ({
        ...prev,
        id_especialista: String(user.id_usuario)
      }));
    }
  }, [user, isOpen]);

  // Construir lista de especialidades del especialista seleccionado
  useEffect(() => {
    if (!formData.id_especialista) {
      setEspecialidadesDisponibles([]);
      setFormData(prev => ({ ...prev, id_especialidad: '' }));
      return;
    }
    
    const especialista = especialistas.find(e => String(e.id_usuario) === String(formData.id_especialista));
    if (!especialista) {
      setEspecialidadesDisponibles([]);
      setFormData(prev => ({ ...prev, id_especialidad: '' }));
      return;
    }
    
    const lista: any[] = [];
    if (especialista.especialidad) lista.push(especialista.especialidad);
    if (Array.isArray(especialista.usuario_especialidad)) {
      especialista.usuario_especialidad.forEach((ue: any) => {
        if (ue.especialidad) lista.push(ue.especialidad);
      });
    }
    
    const unicas = lista.filter((esp, i, arr) => i === arr.findIndex((e: any) => e.id_especialidad === esp.id_especialidad));
    setEspecialidadesDisponibles(unicas);
    
    if (formData.id_especialidad && !unicas.some((e: any) => String(e.id_especialidad) === String(formData.id_especialidad))) {
      setFormData(prev => ({ ...prev, id_especialidad: '' }));
    }
  }, [formData.id_especialista, especialistas, formData.id_especialidad]);

  // Verificar horarios ocupados
  useEffect(() => {
    const verificarHorariosOcupados = async () => {
      if (!formData.id_especialista || !formData.fecha) {
        setHorasOcupadas([]);
        return;
      }

      setVerificandoDisponibilidad(true);
      try {
        const res = await obtenerAgendaEspecialista(formData.id_especialista, formData.fecha);
        if (res.success && res.data) {
          const ocupadas: string[] = [];
          
          res.data.forEach((turno: any) => {
            if (turno.estado !== 'cancelado') {
              const [horas, minutos] = turno.hora.split(':').map(Number);
              const inicioTurno = new Date();
              inicioTurno.setHours(horas, minutos, 0, 0);
              
              const duracionTurno = 60;
              const finTurno = new Date(inicioTurno.getTime() + (duracionTurno * 60000));
              
              const inicioSlot = new Date(inicioTurno);
              while (inicioSlot < finTurno) {
                const horaStr = inicioSlot.toTimeString().slice(0, 5);
                ocupadas.push(horaStr);
                inicioSlot.setMinutes(inicioSlot.getMinutes() + 15);
              }
            }
          });
          
          setHorasOcupadas(ocupadas);
        }
      } catch (error) {
        console.error('Error verificando horarios:', error);
      } finally {
        setVerificandoDisponibilidad(false);
      }
    };

    verificarHorariosOcupados();
  }, [formData.id_especialista, formData.fecha]);

  // ✅ Cargar horarios disponibles por día
  useEffect(() => {
    const cargarHorariosDisponibles = async () => {
      if (!mantenerHorario && diasSeleccionados.length > 0 && formData.id_especialista && formData.fecha) {
        setCargandoHorarios(true);
        
        try {
          const nuevosHorarios: Record<number, string[]> = {};
          
          for (const diaId of diasSeleccionados) {
            const [year, month, day] = formData.fecha.split('-').map(Number);
            const fechaBase = new Date(year, month - 1, day);
            const diaBaseNumero = fechaBase.getDay() === 0 ? 7 : fechaBase.getDay();
            
            let diferenciaDias = diaId - diaBaseNumero;
            if (diferenciaDias < 0) diferenciaDias += 7;
            
            const fechaDia = new Date(fechaBase);
            fechaDia.setDate(fechaDia.getDate() + diferenciaDias);
            const fechaFormateada = format(fechaDia, 'yyyy-MM-dd');

            const res = await obtenerAgendaEspecialista(formData.id_especialista, fechaFormateada);
            
            const horasOcupadasDia: string[] = [];
            
            if (res.success && res.data) {
              res.data.forEach((turno: any) => {
                if (turno.estado !== 'cancelado') {
                  const [horas, minutos] = turno.hora.split(':').map(Number);
                  const inicioTurno = new Date();
                  inicioTurno.setHours(horas, minutos, 0, 0);
                  
                  const duracionTurno = 60;
                  const finTurno = new Date(inicioTurno.getTime() + (duracionTurno * 60000));
                  
                  const inicioSlot = new Date(inicioTurno);
                  while (inicioSlot < finTurno) {
                    const horaStr = inicioSlot.toTimeString().slice(0, 5);
                    horasOcupadasDia.push(horaStr);
                    inicioSlot.setMinutes(inicioSlot.getMinutes() + 30);
                  }
                }
              });
            }

            // ✅ Generar horarios disponibles (7am - 21pm, cada 30min)
            const horariosDisponibles: string[] = [];
            for (let h = 7; h <= 21; h++) {
              for (let m = 0; m < 60; m += 30) {
                const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                if (!horasOcupadasDia.includes(hora)) {
                  horariosDisponibles.push(hora);
                }
              }
            }

            nuevosHorarios[diaId] = horariosDisponibles;
          }

          setHorariosDisponiblesPorDia(nuevosHorarios);
        } catch (error) {
          console.error('Error cargando horarios disponibles:', error);
        } finally {
          setCargandoHorarios(false);
        }
      }
    };

    cargarHorariosDisponibles();
  }, [mantenerHorario, diasSeleccionados, formData.id_especialista, formData.fecha]);

  // Verificar boxes disponibles
  useEffect(() => {
    const verificarBoxesDisponibles = async () => {
      if (!formData.fecha || !formData.hora) {
        setBoxesDisponibles(boxes);
        return;
      }

      setVerificandoBoxes(true);
      try {
        const res = await obtenerTurnos({
          fecha: formData.fecha
        });
        
        if (res.success && res.data) {
          const [horaInicio, minutoInicio] = formData.hora.split(':').map(Number);
          const inicioTurno = new Date();
          inicioTurno.setHours(horaInicio, minutoInicio, 0, 0);
          const finTurno = new Date(inicioTurno.getTime() + (60 * 60000));

          const turnosConflicto = res.data.filter((turno: any) => {
            if (turno.estado === 'cancelado' || !turno.id_box) return false;
            
            const [horaTurno, minutoTurno] = turno.hora.split(':').map(Number);
            const inicioTurnoExistente = new Date();
            inicioTurnoExistente.setHours(horaTurno, minutoTurno, 0, 0);
            const finTurnoExistente = new Date(inicioTurnoExistente.getTime() + (60 * 60000));

            return (inicioTurno < finTurnoExistente && finTurno > inicioTurnoExistente);
          });

          const boxesOcupados = turnosConflicto.map((turno: any) => turno.id_box);
          const disponibles = boxes.filter(box => !boxesOcupados.includes(box.id_box));
          setBoxesDisponibles(disponibles);
        } else {
          setBoxesDisponibles(boxes);
        }
      } catch (error) {
        console.error('Error verificando boxes:', error);
        setBoxesDisponibles(boxes);
      } finally {
        setVerificandoBoxes(false);
      }
    };

    verificarBoxesDisponibles();
  }, [formData.fecha, formData.hora, boxes]);

  // Limpiar campos al cerrar
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setFormData({
          fecha: '',
          hora: '',
          id_especialista: '',
          id_especialidad: '',
          tipo_plan: 'particular',
          id_paciente: '',
          id_box: '',
          observaciones: '',
          precio: '',
          recordatorios: ['1d', '2h'] as TipoRecordatorio[]
        });
        setEspecialidadesDisponibles([]);
        setBoxesDisponibles([]);
        setBusquedaPaciente('');
        setPacienteSeleccionado(null);
        setMostrarListaPacientes(false);
        setMostrarRepeticion(false);
        setDiasSeleccionados([]);
        setNumeroSesiones(10);
        setMantenerHorario(true);
        setHorariosPorDia({ 1: '09:00', 2: '09:00', 3: '09:00', 4: '09:00', 5: '09:00' });
        setHorariosDisponiblesPorDia({});
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ============= FUNCIONES PARA REPETICIÓN =============
  const toggleDia = (diaId: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(diaId) 
        ? prev.filter(d => d !== diaId)
        : [...prev, diaId]
    );
  };

  // Verificar si una hora específica está disponible
  const esHoraDisponible = (hora: string): boolean => {
    if (!hora || horasOcupadas.length === 0) return true;
    
    if (horasOcupadas.includes(hora)) return false;
    
    const [horas, minutos] = hora.split(':').map(Number);
    const inicioNuevoTurno = new Date();
    inicioNuevoTurno.setHours(horas, minutos, 0, 0);
    
    for (let i = 0; i < 4; i++) {
      const slotTiempo = new Date(inicioNuevoTurno.getTime() + (i * 15 * 60000));
      const slotStr = slotTiempo.toTimeString().slice(0, 5);
      if (horasOcupadas.includes(slotStr)) {
        return false;
      }
    }
    
    return true;
  };

  // ✅ Generar opciones de hora disponibles (7am - 21pm, cada 15min)
  const generarOpcionesHora = (): { value: string; label: string; disponible: boolean }[] => {
    const opciones = [];
    
    for (let h = 7; h <= 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const disponible = esHoraDisponible(hora);
        
        if (formData.fecha === new Date().toISOString().split('T')[0]) {
          const ahora = new Date();
          const [horaNum, minNum] = hora.split(':').map(Number);
          const horaTurno = new Date();
          horaTurno.setHours(horaNum, minNum, 0, 0);
          
          if (horaTurno <= ahora) {
            continue;
          }
        }
        
        opciones.push({
          value: hora,
          label: hora,
          disponible
        });
      }
    }
    
    return opciones;
  };

  // Manejar selección de paciente
  const seleccionarPaciente = (paciente: any) => {
    setPacienteSeleccionado(paciente);
    setBusquedaPaciente(`${paciente.nombre} ${paciente.apellido}`);
    setFormData(prev => ({ ...prev, id_paciente: String(paciente.id_paciente) }));
    setMostrarListaPacientes(false);
  };

  // Manejar cambio en input de búsqueda
  const handleBusquedaPacienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusquedaPaciente(valor);
    
    if (!valor.trim()) {
      setPacienteSeleccionado(null);
      setFormData(prev => ({ ...prev, id_paciente: '' }));
      setMostrarListaPacientes(false);
    } else {
      setMostrarListaPacientes(true);
      if (pacienteSeleccionado && !`${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`.toLowerCase().includes(valor.toLowerCase())) {
        setPacienteSeleccionado(null);
        setFormData(prev => ({ ...prev, id_paciente: '' }));
      }
    }
  };

  const handleNuevoPacienteClose = () => {
    setShowNuevoPacienteDialog(false);
  };

  const handlePatientCreated = () => {
    if (pacientesProp.length === 0) {
      obtenerPacientes().then(res => {
        if (res.success) setPacientes(res.data || []);
      });
    }
  };

  const handleSubmit = async () => {
    if (esHoraPasada) {
      addToast({
        variant: 'error',
        message: 'Horario no disponible',
        description: 'No se pueden crear turnos en horarios que ya pasaron',
      });
      return;
    }

    if (!formData.fecha || !formData.hora || !formData.id_especialista || !formData.id_especialidad || !formData.id_paciente) {
      addToast({
        variant: 'error',
        message: 'Campos requeridos',
        description: 'Por favor completa fecha, hora, especialista, especialidad y paciente',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // ============= SIN REPETICIÓN: CREAR TURNO SIMPLE =============
      if (!mostrarRepeticion || diasSeleccionados.length === 0) {
        const turnoData = {
          fecha: formData.fecha,
          hora: formData.hora + ':00',
          id_especialista: formData.id_especialista,
          id_paciente: parseInt(formData.id_paciente),
          id_especialidad: formData.id_especialidad ? parseInt(formData.id_especialidad) : null,
          id_box: formData.id_box ? parseInt(formData.id_box) : null,
          observaciones: formData.observaciones || null,
          estado: "programado" as const,
          tipo_plan: formData.tipo_plan,
        };

        const resultado = await crearTurno(turnoData, formData.recordatorios);

        if (resultado.success && resultado.data) {
          addToast({
            variant: 'success',
            message: 'Turno creado',
            description: 'El turno se creó exitosamente',
          });

          onTurnoCreated?.();
          onClose();
        } else {
          addToast({
            variant: 'error',
            message: 'Error al crear turno',
            description: resultado.error || 'No se pudo crear el turno',
          });
        }
        setIsSubmitting(false);
        return;
      }

      // ============= CON REPETICIÓN: CREAR MÚLTIPLES SESIONES =============
      console.log('🔄 Creando paquete de sesiones...');
      
      const [year, month, day] = formData.fecha.split('-').map(Number);
      const fechaBaseParsed = new Date(year, month - 1, day);
      
      const diaBaseNumeroJS = fechaBaseParsed.getDay();
      const diaBaseNumero = diaBaseNumeroJS === 0 ? 7 : diaBaseNumeroJS;

      const turnosParaCrear = [];
      let sesionesCreadas = 0;
      let semanaActual = 0;

      while (sesionesCreadas < numeroSesiones && semanaActual < 52) {
        for (const diaSeleccionado of diasSeleccionados) {
          if (sesionesCreadas >= numeroSesiones) break;

          // ✅ CORRECCIÓN: Calcular diferencia de días correctamente
          let diferenciaDias = diaSeleccionado - diaBaseNumero;
          
          // Si el día ya pasó en esta semana, ir a la próxima semana
          if (diferenciaDias < 0) {
            diferenciaDias += 7;
          }

          const fechaTurno = new Date(fechaBaseParsed);
          
          // ✅ Determinar si es el primer turno (mismo día y semana que la fecha base)
          const esPrimerTurno = diferenciaDias === 0 && semanaActual === 0;
          
          if (esPrimerTurno) {
            // Es HOY, mantener fechaBaseParsed
          } else {
            fechaTurno.setDate(fechaTurno.getDate() + (semanaActual * 7) + diferenciaDias);
          }

          const fechaFormateada = format(fechaTurno, "yyyy-MM-dd");
          
          // ✅ CORRECCIÓN: Determinar horario según configuración Y si es el primer turno
          let horarioTurno = formData.hora;
          
          if (mantenerHorario) {
            // Si mantiene horario, TODOS usan el mismo horario (incluso el primero)
            horarioTurno = formData.hora;
          } else {
            // Si NO mantiene horario, usar horarios personalizados
            if (esPrimerTurno) {
              // El primer turno SIEMPRE usa el horario seleccionado originalmente
              horarioTurno = formData.hora;
            } else {
              // Los demás usan el horario configurado para ese día
              horarioTurno = horariosPorDia[diaSeleccionado] || '09:00';
            }
          }

          const esPasado = esFechaHoraPasada(fechaFormateada, horarioTurno);

          if (!esPasado) {
            turnosParaCrear.push({
              id_paciente: formData.id_paciente,
              id_especialista: formData.id_especialista,
              fecha: fechaFormateada,
              hora_inicio: horarioTurno,
              hora_fin: (parseInt(horarioTurno.split(':')[0]) + 1).toString().padStart(2, '0') + ':00',
              estado: 'programado',
              id_especialidad: formData.id_especialidad ? parseInt(formData.id_especialidad) : undefined,
              id_box: formData.id_box ? parseInt(formData.id_box) : undefined,
              observaciones: formData.observaciones
            });
            sesionesCreadas++;
          }
        }
        semanaActual++;
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

      console.log('📊 Creando', turnosParaCrear.length, 'sesiones...');

      let exitosos = 0;
      let fallidos = 0;
      const turnosCreados: any[] = [];

      // ✅ CREAR TURNOS SIN NOTIFICACIONES INDIVIDUALES
      for (const turnoData of turnosParaCrear) {
        try {
          const datosBaseTurno = {
            fecha: turnoData.fecha,
            hora: turnoData.hora_inicio + ':00',
            id_especialista: turnoData.id_especialista,
            id_paciente: parseInt(turnoData.id_paciente),
            id_especialidad: turnoData.id_especialidad || null,
            id_box: turnoData.id_box || null,
            observaciones: turnoData.observaciones || null,
            estado: "programado" as const,
            tipo_plan: formData.tipo_plan,
          };

          // ✅ PASAR false PARA NO ENVIAR NOTIFICACIONES INDIVIDUALES
          const resultado = await crearTurno(datosBaseTurno, [], false);

          if (resultado.success && resultado.data) {
            exitosos++;
            turnosCreados.push(resultado.data);
          } else {
            fallidos++;
            console.error('Error creando turno:', resultado.error);
          }
        } catch (error) {
          fallidos++;
          console.error('Error en creación de turno:', error);
        }
      }

      // ✅ ENVIAR UNA SOLA NOTIFICACIÓN AGRUPADA CON TODOS LOS TURNOS
      if (turnosCreados.length > 0) {
        try {
          console.log('📱 Enviando notificación agrupada para', turnosCreados.length, 'turnos');
          
          // Importar el servicio de WhatsApp
          const { enviarNotificacionGrupalTurnos } = await import('@/lib/services/whatsapp-bot.service');
          
          // Obtener datos del paciente
          const paciente = pacientes.find(p => p.id_paciente === parseInt(formData.id_paciente));
          const especialista = especialistas.find(e => String(e.id_usuario) === String(formData.id_especialista));
          
          if (paciente && especialista && paciente.telefono) {
            await enviarNotificacionGrupalTurnos(
              paciente.telefono,
              paciente.nombre,
              turnosCreados,
              especialista.nombre
            );
          }
        } catch (error) {
          console.error('Error enviando notificación agrupada:', error);
          // No fallar todo el proceso por error de notificación
        }
      }

      if (fallidos > 0) {
        addToast({
          variant: 'warning',
          message: 'Sesiones creadas parcialmente',
          description: `Se crearon ${exitosos} de ${numeroSesiones} sesiones. ${fallidos} fallaron.`,
        });
      } else {
        addToast({
          variant: 'success',
          message: 'Paquete de sesiones creado',
          description: `✅ ${exitosos} sesiones creadas exitosamente`,
        });
      }

      onTurnoCreated?.();
      
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Error al crear turno:', error);
      addToast({
        variant: 'error',
        message: 'Error inesperado',
        description: 'Ocurrió un problema al crear el turno',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading
  if (loading || authLoading) {
    return (
      <BaseDialog
        type="custom"
        size="md"
        title="Nuevo Turno"
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
        customColor="#9C1838"
        message={<Loading size={48} text="Cargando datos..." />}
      />
    );
  }

  return (
    <>
      <BaseDialog
        type="custom"
        size="lg"
        title="Nuevo Turno"
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
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="space-y-3 md:space-y-4 text-left max-h-[60vh] md:max-h-[70vh] overflow-y-auto px-1"
          >
            {/* Especialista */}
            {user?.esAdmin && (
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Especialista*
                </label>
                <select
                  value={formData.id_especialista}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_especialista: e.target.value, hora: '', id_box: '' }))}
                  className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar especialista</option>
                  {especialistas.map((especialista) => (
                    <option key={especialista.id_usuario} value={especialista.id_usuario}>
                      {especialista.nombre} {especialista.apellido}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!user?.esAdmin && user?.nombre && (
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Especialista
                </label>
                <div className="w-full px-2 md:px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm">
                  {user.nombre} {user.apellido}
                  {user.rol && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {user.rol.nombre}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Especialidad */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Especialidad*
              </label>
              <select
                value={formData.id_especialidad}
                onChange={(e) => setFormData(prev => ({ ...prev, id_especialidad: e.target.value }))}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                disabled={!formData.id_especialista}
              >
                <option value="">Seleccionar especialidad</option>
                {especialidadesDisponibles.map((esp: any) => (
                  <option key={esp.id_especialidad} value={esp.id_especialidad}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
              {formData.id_especialista && especialidadesDisponibles.length === 0 && (
                <p className="text-red-500 text-xs mt-1">
                  Este especialista no tiene especialidades asignadas
                </p>
              )}
            </div>

            {/* Paciente */}
            <div className="relative">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Paciente*
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputPacienteRef}
                  type="text"
                  value={busquedaPaciente}
                  onChange={handleBusquedaPacienteChange}
                  onFocus={() => busquedaPaciente.trim() && setMostrarListaPacientes(true)}
                  className="flex-1 px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                  placeholder="Buscar por nombre, DNI o teléfono..."
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowNuevoPacienteDialog(true)}
                  className="px-3 py-2 bg-[#9C1838] text-white rounded-full hover:bg-[#7D1329] transition-colors flex items-center gap-1"
                  title="Agregar nuevo paciente"
                >
                  <UserPlus2 className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
              
              {mostrarListaPacientes && pacientesFiltrados.length > 0 && (
                <div 
                  ref={listaPacientesRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 md:max-h-60 overflow-y-auto"
                >
                  {pacientesFiltrados.map((paciente) => (
                    <div
                      key={paciente.id_paciente}
                      onClick={() => seleccionarPaciente(paciente)}
                      className="px-2 md:px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium">
                        {paciente.nombre} {paciente.apellido}
                      </div>
                      <div className="text-xs text-gray-500">
                        DNI: {formatoDNI(paciente.dni)} • Tel: {formatoNumeroTelefono(paciente.telefono || 'No disponible')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {mostrarListaPacientes && busquedaPaciente.trim() && pacientesFiltrados.length === 0 && (
                <div 
                  ref={listaPacientesRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 md:p-3 text-center text-gray-500 text-xs md:text-sm"
                >
                  No se encontraron pacientes
                </div>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Fecha*
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value, hora: '', id_box: '' }))}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Hora */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Hora* {verificandoDisponibilidad && <span className="text-xs text-gray-500">(Verificando...)</span>}
              </label>
              <select
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value, id_box: '' }))}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                disabled={!formData.id_especialista || !formData.fecha || verificandoDisponibilidad}
              >
                <option value="">
                  {!formData.id_especialista ? "Primero selecciona un especialista" : 
                   !formData.fecha ? "Primero selecciona una fecha" : 
                   "Seleccionar hora"}
                </option>
                {generarOpcionesHora().map(({ value, label, disponible }) => (
                  <option 
                    key={value} 
                    value={value}
                    disabled={!disponible}
                    style={{ 
                      color: disponible ? 'black' : '#ccc',
                      backgroundColor: disponible ? 'white' : '#f5f5f5'
                    }}
                  >
                    {label} {!disponible && '(Ocupado)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Box */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Box/Consultorio {verificandoBoxes && <span className="text-xs text-gray-500">(Verificando...)</span>}
              </label>
              <select
                value={formData.id_box}
                onChange={(e) => setFormData(prev => ({ ...prev, id_box: e.target.value }))}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                disabled={!formData.fecha || !formData.hora || verificandoBoxes}
              >
                <option value="">
                  {!formData.fecha || !formData.hora ? "Selecciona fecha y hora primero" : "Seleccionar box (opcional)"}
                </option>
                {boxesDisponibles.map((box) => (
                  <option key={box.id_box} value={box.id_box}>
                    Box {box.numero}
                  </option>
                ))}
              </select>
              {formData.fecha && formData.hora && (
                <p className="text-xs text-gray-500 mt-1">
                  {boxesDisponibles.length} de {boxes.length} boxes disponibles
                </p>
              )}
            </div>

            {/* Plan */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Plan
              </label>
              <select
                value={formData.tipo_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo_plan: e.target.value as 'particular' | 'obra_social' }))}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              >
                <option value="particular">Particular</option>
                <option value="obra_social">Obra Social</option>
              </select>
            </div>

            {/* ============= SECCIÓN DE REPETICIÓN ============= */}
            {!esHoraPasada && (
              <div className="border-t pt-3 md:pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="repetir"
                    checked={mostrarRepeticion}
                    onChange={(e) => setMostrarRepeticion(e.target.checked)}
                    className="w-4 h-4 text-[#9C1838] border-gray-300 rounded focus:ring-[#9C1838]"
                  />
                  <label htmlFor="repetir" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Paquete de sesiones
                  </label>
                </div>

                {mostrarRepeticion && (
                  <div className="space-y-3 pl-6 border-l-2 border-[#9C1838]/20">
                    {/* Días */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Días
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {DIAS_SEMANA.map((dia) => (
                          <button
                            key={dia.id}
                            type="button"
                            onClick={() => toggleDia(dia.id)}
                            className={`flex-1 min-w-[50px] h-10 rounded-lg text-sm font-medium transition-colors ${
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

                    {/* Cantidad */}
                    <div>
                      <label htmlFor="sesiones" className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad
                      </label>
                      <select
                        id="sesiones"
                        value={numeroSesiones}
                        onChange={(e) => setNumeroSesiones(parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                      >
                        {[5, 8, 10, 12, 15, 20].map(num => (
                          <option key={num} value={num}>{num} sesiones</option>
                        ))}
                      </select>
                    </div>

                    {/* Horario */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horario
                      </label>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="mantenerHorario"
                          checked={mantenerHorario}
                          onChange={(e) => setMantenerHorario(e.target.checked)}
                          className="w-4 h-4 text-[#9C1838] border-gray-300 rounded"
                        />
                        <label htmlFor="mantenerHorario" className="text-sm text-gray-600">
                          Mantener horario {formData.hora && `(${formData.hora})`}
                        </label>
                      </div>

                      {!mantenerHorario && diasSeleccionados.length > 0 && (
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {cargandoHorarios && (
                            <div className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                              <div className="animate-spin h-3 w-3 border-2 border-[#9C1838] border-t-transparent rounded-full"></div>
                              Cargando horarios disponibles...
                            </div>
                          )}
                          
                          {!cargandoHorarios && (
                            <>
                              <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Configura el horario para cada día
                              </div>
                              
                              {diasSeleccionados.map((diaId) => {
                                const dia = DIAS_SEMANA.find(d => d.id === diaId);
                                const horariosDisponibles = horariosDisponiblesPorDia[diaId] || [];
                                
                                if (!dia) return null;

                                return (
                                  <div key={diaId} className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                                      {dia.nombre}
                                    </span>
                                    <select
                                      value={horariosPorDia[diaId] || '09:00'}
                                      onChange={(e) => setHorariosPorDia(prev => ({
                                        ...prev,
                                        [diaId]: e.target.value
                                      }))}
                                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                                      disabled={horariosDisponibles.length === 0}
                                    >
                                      {horariosDisponibles.length === 0 ? (
                                        <option value="">Sin horarios disponibles</option>
                                      ) : (
                                        horariosDisponibles.map(hora => (
                                          <option key={hora} value={hora}>{hora}</option>
                                        ))
                                      )}
                                    </select>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                      {horariosDisponibles.length} disp.
                                    </span>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    {diasSeleccionados.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start gap-2 text-green-800">
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="text-sm flex-1">
                            <strong>{numeroSesiones} sesiones</strong>
                            <div className="text-xs text-green-600 mt-1 space-y-0.5">
                              <div>{diasSeleccionados.length} día{diasSeleccionados.length > 1 ? 's' : ''}/semana</div>
                              {!mantenerHorario && diasSeleccionados.length > 0 && (
                                <div className="mt-1 pt-1 border-t border-green-300">
                                  {diasSeleccionados.map(diaId => {
                                    const dia = DIAS_SEMANA.find(d => d.id === diaId);
                                    return dia ? (
                                      <div key={diaId} className="flex justify-between">
                                        <span>{dia.nombreCorto}:</span>
                                        <span className="font-medium">{horariosPorDia[diaId] || '09:00'}</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              )}
                              {mantenerHorario && formData.hora && (
                                <div>Todos los días a las {formData.hora}</div>
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

            {/* Recordatorios WhatsApp */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Recordatorios automáticos por WhatsApp
              </label>
              <SelectorRecordatorios
                recordatoriosSeleccionados={formData.recordatorios}
                onRecordatoriosChange={(recordatorios) => setFormData(prev => ({ ...prev, recordatorios }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Los recordatorios se enviarán automáticamente antes de cada sesión
              </p>
            </div>

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
                placeholder="Información adicional sobre el turno o paquete de sesiones..."
              />
            </div>
          </form>
        }
        primaryButton={{
          text: isSubmitting 
            ? "Creando..." 
            : mostrarRepeticion && diasSeleccionados.length > 0
              ? `Crear ${numeroSesiones} Sesiones`
              : "Crear Turno",
          onClick: handleSubmit,
          disabled: isSubmitting || !esHoraDisponible(formData.hora) || esHoraPasada,
        }}
        secondaryButton={{
          text: "Cancelar",
          onClick: onClose,
        }}
      />

      <BaseDialog
        type={dialog.type}
        size="sm"
        title={dialog.type === 'success' ? "Éxito" : "Error"}
        message={dialog.message}
        isOpen={dialog.open}
        onClose={() => setDialog({ ...dialog, open: false })}
        showCloseButton
        primaryButton={{
          text: "Aceptar",
          onClick: () => setDialog({ ...dialog, open: false }),
        }}
      />

      <NuevoPacienteDialog
        isOpen={showNuevoPacienteDialog}
        onClose={handleNuevoPacienteClose}
        handleToast={addToast}
        onPatientCreated={handlePatientCreated}
      />
    </>
  );
}

export default NuevoTurnoModal;