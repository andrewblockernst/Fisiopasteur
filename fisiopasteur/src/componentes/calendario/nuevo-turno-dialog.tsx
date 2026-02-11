"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { obtenerEspecialistas, obtenerPacientes, obtenerEspecialidades, obtenerBoxes, crearTurno, obtenerAgendaEspecialista, obtenerTurnos, verificarDisponibilidad, crearPaqueteSesiones } from "@/lib/actions/turno.action";
import { NuevoPacienteDialog } from "@/componentes/paciente/nuevo-paciente-dialog";
import SelectorRecordatorios from "@/componentes/turnos/selector-recordatorios";
import Image from "next/image";
import Loading from "../loading";
import { useToastStore } from '@/stores/toast-store';
import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";
import { useAuth } from '@/hooks/usePerfil';
import { UserPlus2, CalendarDays, Info } from "lucide-react";
import type { TipoRecordatorio } from "@/lib/utils/whatsapp.utils";
import { format, set } from "date-fns";

// ✅ Cache simple para evitar llamadas repetidas
const dataCache = {
  especialidades: null as any[] | null,
  boxes: null as any[] | null,
  lastFetch: 0,
  TTL: 5 * 60 * 1000, // 5 minutos
};

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
    recordatorios: ['1d', '2h'] as TipoRecordatorio[],
    titulo_tratamiento: '',
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
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
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
  // ✅ NUEVOS ESTADOS PARA VALIDACIÓN EN TIEMPO REAL
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [hayConflictos, setHayConflictos] = useState(false);

  const [dialog, setDialog] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ 
    open: false, 
    type: 'success', 
    message: '' 
  });

  // ✅ LIMPIAR ESTADO AL CERRAR EL MODAL
  useEffect(() => {
    if (!isOpen && !showNuevoPacienteDialog) {
      // Solo resetear si NO estamos en el diálogo de nuevo paciente
      // Reset de estados críticos para evitar loading infinito
      setIsSubmitting(false);
      setVerificandoDisponibilidad(false);
      setVerificandoBoxes(false);
      setValidandoDisponibilidad(false);
      setCargandoHorarios(false);
      setLoading(false);
      
      // Reset del formulario después de un pequeño delay para evitar flash visual
      setTimeout(() => {
        setFormData({
          fecha: '',
          hora: '',
          id_especialista: '',
          id_especialidad: '',
          tipo_plan: 'particular' as 'particular' | 'obra_social',
          id_paciente: '',
          id_box: '',
          observaciones: '',
          precio: '',
          recordatorios: ['1d', '2h'] as TipoRecordatorio[],
          titulo_tratamiento: '',
        });
        setHorasOcupadas([]);
        setHorariosOcupados([]);
        setHayConflictos(false);
        setMostrarRepeticion(false);
        setDiasSeleccionados([]);
        setNumeroSesiones(10);
        setBusquedaPaciente('');
        setPacienteSeleccionado(null);
      }, 300);
    }
  }, [isOpen, showNuevoPacienteDialog]);

  // ✅ VALIDAR SI LA FECHA Y HORA SELECCIONADAS ESTÁN EN EL PASADO
  const esHoraPasada = React.useMemo(() => {
    return formData.fecha && formData.hora 
      ? esFechaHoraPasada(formData.fecha, formData.hora)
      : false;
  }, [formData.fecha, formData.hora]);

  // Cargar datos si no vienen por props
  useEffect(() => {
    if (!isOpen) return;
    
    const cargarDatos = async () => {
      const ahora = Date.now();
      const cacheValido = ahora - dataCache.lastFetch < dataCache.TTL;
      
      // ✅ Solo cargar si NO tenemos los datos básicos todavía
      // ⚡ OPTIMIZACIÓN: Ya NO cargamos pacientes aquí (se cargan bajo demanda al buscar)
      const necesitaCargar = 
        (!cacheValido && especialidades.length === 0) || 
        (!cacheValido && boxes.length === 0) ||
        (especialistasProp.length === 0 && especialistas.length === 0);
    
      if (!necesitaCargar) {
        console.log('✅ Datos ya disponibles o cache válido');
        return;
      }
      
      // ✅ Solo mostrar loading si realmente no hay NINGÚN dato crítico
      const noHayDatosCriticos = 
        especialidades.length === 0 || 
        boxes.length === 0 ||
        (especialistasProp.length === 0 && especialistas.length === 0);
      
      if (noHayDatosCriticos) {
        setLoading(true);
      }
      
      try {
        const promises = [];
        
        // Solo cargar especialistas si no vienen por props Y no los tenemos
        if (especialistasProp.length === 0 && especialistas.length === 0) {
          promises.push(obtenerEspecialistas().then(res => {
            if (res.success) setEspecialistas(res.data || []);
          }));
        }
        
        // Solo cargar pacientes si no vienen por props Y no los tenemos
        if (pacientesProp.length === 0 && pacientes.length === 0) {
          promises.push(obtenerPacientes().then(res => {
            if (res.success) setPacientes(res.data || []);
          }));
        }
        
        // Solo cargar especialidades si no las tenemos o cache expirado
        if (!cacheValido || especialidades.length === 0) {
          promises.push(
            obtenerEspecialidades().then(res => {
              if (res.success) {
                const data = res.data || [];
                setEspecialidades(data);
                dataCache.especialidades = data;
              }
            })
          );
        } else if (dataCache.especialidades) {
          setEspecialidades(dataCache.especialidades);
        }
        
        // Solo cargar boxes si no los tenemos o cache expirado
        if (!cacheValido || boxes.length === 0) {
          promises.push(
            obtenerBoxes().then(res => {
              if (res.success) {
                const data = res.data || [];
                setBoxes(data);
                dataCache.boxes = data;
              }
            })
          );
        } else if (dataCache.boxes) {
          setBoxes(dataCache.boxes);
        }
        
        if (promises.length > 0) {
          await Promise.all(promises);
          dataCache.lastFetch = ahora;
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [isOpen]);

  // ⚡ BÚSQUEDA OPTIMIZADA: Fetch bajo demanda con debounce
  useEffect(() => {
    // Solo buscar si hay al menos 2 caracteres
    if (!busquedaPaciente.trim() || busquedaPaciente.trim().length < 2) {
      setPacientes([]);
      return;
    }

    console.log('🔍 Buscando pacientes para:', busquedaPaciente);
    console.log('Paciente seleccionado actual:', pacienteSeleccionado);

    if (busquedaPaciente.trim().toLocaleLowerCase() === (pacienteSeleccionado?.nombre + ' ' + pacienteSeleccionado?.apellido || '').toLocaleLowerCase()) {
      return; // No buscar si es el mismo que ya seleccionamos
    }

    const timeoutId = setTimeout(async () => {
      setBuscandoPacientes(true);
      try {
        const resultado = await obtenerPacientes(busquedaPaciente.trim(), 10); // Limitar a 10 para UI
        if (resultado.success && resultado.data) {
          setPacientes(resultado.data);
          setMostrarListaPacientes(true);
        }
      } catch (error) {
        console.error('Error buscando pacientes:', error);
      } finally {
        setBuscandoPacientes(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [busquedaPaciente]);

  // Pacientes filtrados (el servidor ya limita a 10, no necesitamos slice)
  const pacientesFiltrados = useMemo(() => {
    return pacientes; // Ya vienen limitados del servidor
  }, [pacientes]);

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
    console.log('🔍 Modal abierto - Datos iniciales:', {
      user: user,
      puedeGestionarTurnos: user?.puedeGestionarTurnos,
      id: user?.id, // ✅ Ahora revisamos también 'id'
      id_usuario: user?.id_usuario,
      especialistas: especialistas,
      especialistasLength: especialistas.length
    });

    const updates: Partial<typeof formData> = {};
    
    if (fechaSeleccionada) {
      updates.fecha = fechaSeleccionada.toISOString().split('T')[0];
    }
    
    if (horaSeleccionada) {
      updates.hora = horaSeleccionada;
    }
    
    // ✅ Usar user.id en lugar de user.id_usuario
    const userId = user?.id_usuario || user?.id;
    
    if (user && !user.puedeGestionarTurnos && userId) {
      console.log('👤 Usuario sin permisos - Asignando especialista:', userId);
      updates.id_especialista = String(userId);
      
      // ✅ Obtener especialidad desde especialistas ya cargados
      const especialistaActual = especialistas.find(e => 
        String(e.id_usuario) === String(userId)
      );
      
      console.log('🔍 Especialista encontrado:', especialistaActual);
      
      if (especialistaActual) {
        // Prioridad: especialidad principal -> primera especialidad adicional
        if (especialistaActual.id_especialidad) {
          console.log('✅ Especialidad principal:', especialistaActual.id_especialidad);
          updates.id_especialidad = String(especialistaActual.id_especialidad);
        } else if (Array.isArray(especialistaActual.usuario_especialidad) && 
          especialistaActual.usuario_especialidad.length > 0) {
          const primeraEspecialidad = especialistaActual.usuario_especialidad[0];
          console.log('✅ Primera especialidad adicional:', primeraEspecialidad);
          if (primeraEspecialidad?.especialidad?.id_especialidad) {
            updates.id_especialidad = String(primeraEspecialidad.especialidad.id_especialidad);
          }
        } else {
          console.warn('⚠️ Especialista sin especialidad asignada');
        }
      } else {
        console.warn('⚠️ No se encontró el especialista en la lista');
      }
    }
    
    console.log('📝 Updates a aplicar:', updates);
    
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }
}, [fechaSeleccionada, horaSeleccionada, isOpen, user, especialistas]);


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

  // Verificar horarios ocupados con debounce
  useEffect(() => {
    // ✅ Debounce para evitar llamadas excesivas
    const timeoutId = setTimeout(async () => {
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
    }, 300); // Esperar 300ms antes de ejecutar

    return () => clearTimeout(timeoutId);
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

  // ✅ VALIDACIÓN EN TIEMPO REAL - Verificar disponibilidad de todos los turnos
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const validarDisponibilidadTurnos = async () => {
      // Solo validar si hay repetición activa y días seleccionados
      if (!mostrarRepeticion || diasSeleccionados.length === 0 || numeroSesiones <= 0 || !formData.id_especialista || !formData.fecha) {
        setHorariosOcupados([]);
        setHayConflictos(false);
        return;
      }

      setValidandoDisponibilidad(true);
      setHorariosOcupados([]);
      setHayConflictos(false);

      try {
        const ocupados: string[] = [];
        const [year, month, day] = formData.fecha.split('-').map(Number);
        const fechaBase = new Date(year, month - 1, day);

        // Iterar sobre cada semana
        for (let semana = 0; semana < numeroSesiones; semana++) {
          // Iterar sobre cada día seleccionado
          for (const diaId of diasSeleccionados) {
            const diaBaseNumero = fechaBase.getDay() === 0 ? 7 : fechaBase.getDay();
            let diferenciaDias = diaId - diaBaseNumero;
            if (diferenciaDias < 0) diferenciaDias += 7;

            const fechaTurno = new Date(fechaBase);
            fechaTurno.setDate(fechaTurno.getDate() + diferenciaDias + (semana * 7));

            const fechaFormateada = format(fechaTurno, 'yyyy-MM-dd');
            const horaSeleccionada = mantenerHorario ? formData.hora : (horariosPorDia[diaId] || '09:00');

            // ✅ Verificar disponibilidad para este especialista en esta fecha/hora
            const resultado = await verificarDisponibilidad(
              fechaFormateada,
              horaSeleccionada,
              formData.id_especialista
            );

            if (!resultado.disponible) {
              const diaNombre = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][diaId - 1];
              ocupados.push(`${diaNombre} ${format(fechaTurno, 'dd/MM')} a las ${horaSeleccionada}`);
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

    // Debounce de 500ms para evitar llamadas excesivas
    timeoutId = setTimeout(() => {
      validarDisponibilidadTurnos();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [diasSeleccionados, numeroSesiones, mantenerHorario, horariosPorDia, formData.id_especialista, formData.fecha, formData.hora, mostrarRepeticion]);

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
          recordatorios: ['1d', '2h'] as TipoRecordatorio[],
          titulo_tratamiento: '',
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
    
    // Comparar fechas de forma robusta
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    
    // Convertir fecha seleccionada a objeto Date (sin hora)
    const fechaSeleccionadaObj = formData.fecha 
      ? new Date(formData.fecha + 'T00:00:00')
      : null;
    
    const esHoy = fechaSeleccionadaObj 
      ? fechaSeleccionadaObj.getTime() === hoy.getTime()
      : false;
    
    for (let h = 7; h <= 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const disponible = esHoraDisponible(hora);
        
        // ✅ SOLO filtrar horas pasadas si la fecha seleccionada es HOY
        if (esHoy) {
          const [horaNum, minNum] = hora.split(':').map(Number);
          
          // Crear fecha completa con la hora del turno
          const horaTurno = new Date();
          horaTurno.setHours(horaNum, minNum, 0, 0);
          
          if (horaTurno <= ahora) {
            continue; // Saltar horas que ya pasaron (solo para HOY)
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
  const seleccionarPaciente = useCallback((paciente: any) => {
    setPacienteSeleccionado(paciente);
    setBusquedaPaciente(`${paciente.nombre} ${paciente.apellido}`);
    setFormData(prev => ({ ...prev, id_paciente: String(paciente.id_paciente) }));
    setMostrarListaPacientes(false);
  }, []);

  // Manejar cambio en input de búsqueda
  const handleBusquedaPacienteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusquedaPaciente(valor);
    
    if (!valor.trim()) {
      setPacienteSeleccionado(null);
      setFormData(prev => ({ ...prev, id_paciente: '' }));
      setMostrarListaPacientes(false);
      setPacientes([]); // Limpiar resultados
    }
  }, []);

  const handleNuevoPacienteClose = useCallback(() => {
    setShowNuevoPacienteDialog(false);
  }, []);

  const handlePatientCreated = useCallback(async (pacienteNuevo?: any) => {
    // ⚡ Si recibimos el paciente nuevo, simplemente seleccionarlo
    // Ya no necesitamos recargar toda la lista
    if (pacienteNuevo) {
      seleccionarPaciente(pacienteNuevo);
    }
  }, [seleccionarPaciente]);

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
        titulo_tratamiento: formData.titulo_tratamiento || null,
      } as any; // ✅ Cast temporal hasta que se actualicen los tipos

      const resultado = await crearTurno(turnoData, formData.recordatorios);

      if (resultado.success && resultado.data) {
        addToast({
          variant: 'success',
          message: 'Turno creado',
          description: 'El turno se creó exitosamente',
        });

        // ✅ Limpiar estado y refrescar
        setIsSubmitting(false);
        onTurnoCreated?.(); // es un router.refresh()
        onClose();
        
      } else {
        addToast({
          variant: 'error',
          message: 'Error al crear turno',
          description: resultado.error || 'No se pudo crear el turno',
        });
        setIsSubmitting(false);
      }
      return;
    }

    // ============= CON REPETICIÓN: CREAR PAQUETE DE SESIONES =============
    // ✅ Ahora toda la lógica está en el servidor
    const resultado = await crearPaqueteSesiones({
      fechaBase: formData.fecha,
      horaBase: formData.hora,
      diasSeleccionados,
      numeroSesiones,
      mantenerHorario,
      horariosPorDia,
      id_especialista: formData.id_especialista,
      id_paciente: parseInt(formData.id_paciente),
      id_especialidad: parseInt(formData.id_especialidad),
      id_box: formData.id_box ? parseInt(formData.id_box) : undefined,
      observaciones: formData.observaciones || undefined,
      tipo_plan: formData.tipo_plan,
      titulo_tratamiento: formData.titulo_tratamiento || undefined,
      recordatorios: formData.recordatorios,
    });

    if (resultado.success && resultado.data) {
      addToast({
        variant: 'success',
        message: 'Paquete de sesiones creado',
        description: resultado.message || `${resultado.data.turnosCreados} sesiones creadas exitosamente`,
      });

      setIsSubmitting(false);
      onTurnoCreated?.();
      
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      addToast({
        variant: 'error',
        message: 'Error al crear sesiones',
        description: resultado.error || 'No se pudieron crear las sesiones',
      });
      setIsSubmitting(false);
    }

  } catch (error) {
    console.error('Error al crear turno:', error);
    addToast({
      variant: 'error',
      message: 'Error inesperado',
      description: 'Ocurrió un problema al crear el turno',
    });
    setIsSubmitting(false);
  }
};

  // ✅ CERRAR FORZADO - Resetea todo el estado inmediatamente
  const handleForceClose = useCallback(() => {
    // Cancelar todos los estados de carga
    setIsSubmitting(false);
    setLoading(false);
    setVerificandoDisponibilidad(false);
    setVerificandoBoxes(false);
    setValidandoDisponibilidad(false);
    setCargandoHorarios(false);
    
    // Reset del formulario
    setFormData({
      fecha: '',
      hora: '',
      id_especialista: '',
      id_especialidad: '',
      tipo_plan: 'particular' as 'particular' | 'obra_social',
      id_paciente: '',
      id_box: '',
      observaciones: '',
      precio: '',
      recordatorios: ['1d', '2h'] as TipoRecordatorio[],
      titulo_tratamiento: '',
    });
    setHorasOcupadas([]);
    setHorariosOcupados([]);
    setHayConflictos(false);
    setMostrarRepeticion(false);
    setDiasSeleccionados([]);
    setNumeroSesiones(10);
    setBusquedaPaciente('');
    setPacienteSeleccionado(null);
    
    // Cerrar el modal
    onClose();
  }, [onClose]);

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
        onClose={handleForceClose}
        showCloseButton
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
        onClose={handleForceClose}
        showCloseButton
        customColor="#9C1838"
        message={
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="space-y-3 md:space-y-4 text-left max-h-[60vh] md:max-h-[70vh] overflow-y-auto px-1"
          >
            {/* Especialista - SIEMPRE VISIBLE */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Especialista*
              </label>
              
              {user?.puedeGestionarTurnos ? (
                // ✅ Usuario con permisos: selector habilitado
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
              ) : (
                // ✅ Usuario sin permisos: campo deshabilitado con su nombre desde la lista de especialistas
                <select
                  value={formData.id_especialista}
                  disabled
                  className="w-full px-2 md:px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed opacity-75"
                  required
                >
                  {(() => {
                    const userId = user?.id_usuario || user?.id; // ✅ Usar user.id como fallback
                    const especialistaActual = especialistas.find(e => 
                      String(e.id_usuario) === String(userId)
                    );
                    
                    return (
                      <option value={userId || ''}>
                        {especialistaActual 
                          ? `${especialistaActual.nombre} ${especialistaActual.apellido}`
                          : `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Especialista actual'
                        }
                      </option>
                    );
                  })()}
                </select>
              )}
            </div>

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

            {/* Título del tratamiento */}
            {formData.id_especialidad && (
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Título del tratamiento
                </label>
                <input
                  type="text"
                  value={formData.titulo_tratamiento}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo_tratamiento: e.target.value }))}
                  placeholder="Ej: Lesión hombro, Rehabilitación rodilla..."
                  className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este título se mostrará en el historial clínico del paciente
                </p>
              </div>
            )}

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
              
              {buscandoPacientes && (
                <div 
                  ref={listaPacientesRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 md:p-3 text-center text-gray-500 text-xs md:text-sm"
                >
                  Buscando pacientes...
                </div>
              )}
              
              {!buscandoPacientes && mostrarListaPacientes && pacientesFiltrados.length > 0 && (
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
              
              {!buscandoPacientes && mostrarListaPacientes && busquedaPaciente.trim().length >= 2 && pacientesFiltrados.length === 0 && (
                <div 
                  ref={listaPacientesRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 md:p-3 text-center text-gray-500 text-xs md:text-sm"
                >
                  No se encontraron pacientes
                </div>
              )}
              
              {busquedaPaciente.trim().length > 0 && busquedaPaciente.trim().length < 2 && (
                <div className="text-xs text-gray-500 mt-1">
                  Escribe al menos 2 caracteres para buscar
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
                          <Info className="w-4 h-4 shrink-0 mt-0.5" />
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

            {/* ✅ ADVERTENCIAS DE VALIDACIÓN EN TIEMPO REAL */}
            {mostrarRepeticion && diasSeleccionados.length > 0 && (
              <div className="space-y-2">
                {/* Spinner de validación */}
                {validandoDisponibilidad && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm md:text-base">
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-700">Validando disponibilidad de horarios...</span>
                  </div>
                )}

                {/* Conflictos detectados */}
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

                {/* Confirmación: todos los horarios disponibles */}
                {!validandoDisponibilidad && !hayConflictos && diasSeleccionados.length > 0 && numeroSesiones > 0 && formData.id_especialista && formData.fecha && (mantenerHorario ? formData.hora : Object.keys(horariosPorDia).length > 0) && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm md:text-base">
                    <span className="text-lg md:text-xl">✓</span>
                    <span className="text-green-700">
                      Todos los horarios están disponibles ({diasSeleccionados.length} días × {numeroSesiones} semanas = {diasSeleccionados.length * numeroSesiones} turnos)
                    </span>
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
            : validandoDisponibilidad
              ? "Validando..."
              : hayConflictos
                ? "⚠️ Horarios ocupados"
                : mostrarRepeticion && diasSeleccionados.length > 0
                  ? `Crear ${numeroSesiones} Sesiones`
                  : "Crear Turno",
          onClick: handleSubmit,
          disabled: isSubmitting || !esHoraDisponible(formData.hora) || esHoraPasada || validandoDisponibilidad || hayConflictos,
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