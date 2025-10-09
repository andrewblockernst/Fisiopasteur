"use client";

import { useState, useEffect, useRef } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { eliminarTurno, crearTurno, actualizarTurno, crearTurnosEnLote } from "@/lib/actions/turno.action";
import { format, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { useToastStore } from '@/stores/toast-store';
import { Users, Clock, Calendar, User, AlertTriangle, Trash2, UserPlus, Settings, Plus, Repeat } from "lucide-react";
import Image from "next/image";

interface DetalleClaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnosActualizados?: () => Promise<void> | void;
  turnos: any[];
  especialistas: any[];
  pacientes: any[];
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

export function DetalleClaseModal({
  isOpen,
  onClose,
  onTurnosActualizados,
  turnos: turnosIniciales,
  especialistas,
  pacientes,
  userRole = 2
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

  // ============= NUEVOS ESTADOS PARA BÚSQUEDA DE PACIENTES =============
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacientesFiltrados, setPacientesFiltrados] = useState<any[]>([]);
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const inputPacienteRef = useRef<HTMLInputElement>(null);
  const listaPacientesRef = useRef<HTMLDivElement>(null);

  // ============= NUEVOS ESTADOS PARA REPETIR CLASE (SIMPLIFICADO) =============
  const [mostrarModalRepetir, setMostrarModalRepetir] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [semanas, setSemanas] = useState<number>(4);

  // ============= SINCRONIZAR CON PROPS CUANDO CAMBIAN =============
  useEffect(() => {
    setTurnos(turnosIniciales);
  }, [turnosIniciales]);

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

  // Obtener información de la clase (usar estado interno)
  const primeraClase = turnos[0];
  const fechaClase = primeraClase?.fecha;
  const horaClase = primeraClase?.hora?.substring(0, 5);
  
  // ✅ Parsear correctamente para mostrar
  const fechaClaseDate = fechaClase ? (() => {
    const [year, month, day] = fechaClase.split('-').map(Number);
    return new Date(year, month - 1, day);
  })() : null;

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
      
      console.log('🔄 Recargando datos del modal para:', { fechaClase, horaClase });
      
      const { obtenerTurnosConFiltros } = await import("@/lib/actions/turno.action");
      
      const resultado = await obtenerTurnosConFiltros({
        fecha_desde: fechaClase,
        fecha_hasta: fechaClase,
        especialidad_id: 4,
        hora_desde: horaClase,
        hora_hasta: horaClase
      });
      
      if (resultado.success && resultado.data) {
        const turnosClase = resultado.data.filter(turno => 
          turno.fecha === fechaClase && 
          turno.hora?.slice(0, 5) === horaClase &&
          turno.id_especialista === primeraClase.id_especialista
        );
        
        console.log('✅ Datos recargados del modal:', turnosClase.length, 'participantes');
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
      setMostrarListaPacientes(false);
      
      // Resetear estado de repetición
      setDiasSeleccionados([]);
      setSemanas(4);
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
    
    setCambiosPendientes(hayCambiosParticipantes || hayCambioEspecialista || hayCambioDificultad);
  }, [pacientesSeleccionados, especialistaSeleccionado, dificultadSeleccionada, turnos, isOpen, hayConflicto]);

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
      setMostrarListaPacientes(false);
      return;
    }

    setPacientesSeleccionados(prev => [...prev, paciente.id_paciente]);
    setBusquedaPaciente('');
    setMostrarListaPacientes(false);
  };

  const eliminarPaciente = (pacienteId: number) => {
    setPacientesSeleccionados(prev => prev.filter(id => id !== pacienteId));
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

  // ============= FUNCIÓN PARA MANEJAR DÍAS DE LA SEMANA =============
  const toggleDia = (diaId: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(diaId) 
        ? prev.filter(d => d !== diaId)
        : [...prev, diaId]
    );
  };

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
      console.log('🔄 Iniciando resolución de conflicto...');
      
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
    setIsSubmitting(true);
    
    try {
      const fecha = fechaClase;
      const hora = horaClase + ':00';
      
      const pacientesActuales = turnos.map(t => t.id_paciente);
      const pacientesAEliminar = pacientesActuales.filter(id => !pacientesSeleccionados.includes(id));
      const pacientesNuevos = pacientesSeleccionados.filter(id => !pacientesActuales.includes(id));
      
      // 1. Eliminar turnos
      for (const pacienteId of pacientesAEliminar) {
        const turnoAEliminar = turnos.find(t => t.id_paciente === pacienteId);
        if (turnoAEliminar) {
          const resultado = await eliminarTurno(turnoAEliminar.id_turno);
          if (!resultado.success) {
            throw new Error(`Error eliminando turno: ${resultado.error}`);
          }
        }
      }

      // 2. Actualizar especialista y dificultad en turnos existentes  
      const pacientesExistentes = pacientesSeleccionados.filter(id => pacientesActuales.includes(id));
      
      for (const pacienteId of pacientesExistentes) {
        const turnoExistente = turnos.find(t => t.id_paciente === pacienteId);
        if (turnoExistente) {
          const actualizaciones: any = {};
          
          if (userRole === 1 && turnoExistente.id_especialista !== especialistaSeleccionado) {
            actualizaciones.id_especialista = especialistaSeleccionado;
          }
          
          if (turnoExistente.dificultad !== dificultadSeleccionada) {
            actualizaciones.dificultad = dificultadSeleccionada;
          }
          
          if (Object.keys(actualizaciones).length > 0) {
            const resultado = await actualizarTurno(turnoExistente.id_turno, actualizaciones);
            if (!resultado.success) {
              throw new Error(`Error actualizando turno: ${resultado.error}`);
            }
          }
        }
      }

      // 3. Crear nuevos turnos
      for (const pacienteId of pacientesNuevos) {
        const resultado = await crearTurno({
          fecha,
          hora,
          id_especialista: especialistaSeleccionado,
          id_especialidad: 4,
          id_paciente: pacienteId,
          estado: "programado",
          tipo_plan: "particular",
          dificultad: dificultadSeleccionada
        });
        
        if (!resultado.success) {
          throw new Error(`Error creando turno para paciente ${pacienteId}: ${resultado.error}`);
        }
      }

      addToast({
        variant: 'success',
        message: 'Clase actualizada',
        description: `Se aplicaron todos los cambios correctamente`,
      });

      setCambiosPendientes(false);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      await recargarDatosModal();
      
      if (onTurnosActualizados) {
        await Promise.resolve(onTurnosActualizados());
      }
      
      await new Promise(resolve => setTimeout(resolve, 1200));
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
    setIsSubmitting(true);
    
    try {
      for (const turno of turnos) {
        await eliminarTurno(turno.id_turno);
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

  // ============= FUNCIÓN PARA REPETIR CLASE (CORREGIDA) =============
  const handleRepetirClase = async () => {
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

    setIsSubmitting(true);

    try {
      // ✅ CORRECCIÓN: Parsear correctamente la fecha desde string (formato: "2025-10-19")
      const [year, month, day] = fechaClase!.split('-').map(Number);
      const fechaBase = new Date(year, month - 1, day); // month es 0-indexed
      
      // ✅ CORRECCIÓN: Usar getDay() nativo de JavaScript
      const diaBaseNumeroJS = fechaBase.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
      const diaBaseNumero = diaBaseNumeroJS === 0 ? 7 : diaBaseNumeroJS; // Convertir: 1=Lunes, ..., 7=Domingo
      
      const ahora = new Date();
      
      console.log('🔄 Repitiendo clase con configuración actual...');
      console.log('📅 Fecha original (string):', fechaClase);
      console.log('📅 Fecha parseada:', fechaBase.toISOString());
      console.log('📅 Día de la semana (nombre):', fechaBase.toLocaleDateString('es', { weekday: 'long' }));
      console.log('📅 Día JS (0-6):', diaBaseNumeroJS);
      console.log('📅 Día normalizado (1-7):', diaBaseNumero);
      console.log('📋 Días seleccionados:', diasSeleccionados);
      console.log('📆 Semanas:', semanas);
      console.log('👥 Participantes:', pacientesSeleccionados);
      console.log('👨‍⚕️ Especialista:', especialistaSeleccionado);
      console.log('📊 Dificultad:', dificultadSeleccionada);

      const turnosParaLote = [];

      // ✅ Iterar sobre suficientes semanas para cubrir todos los días
      for (let semana = 0; semana < semanas + 1; semana++) {
        for (const diaSeleccionado of diasSeleccionados) {
          // Calcular la diferencia de días desde la fecha base
          let diferenciaDias = diaSeleccionado - diaBaseNumero;
          
          // Si el día es anterior en la semana, sumar 7 días (próxima semana)
          if (diferenciaDias < 0) {
            diferenciaDias += 7;
          }

          // ✅ IMPORTANTE: Crear nueva fecha para no mutar la original
          const fechaTurno = new Date(fechaBase);
          fechaTurno.setDate(fechaTurno.getDate() + (semana * 7) + diferenciaDias);

          const fechaFormateada = format(fechaTurno, "yyyy-MM-dd");

          // ✅ Validar que no sea la misma fecha de la clase original
          const esMismaFecha = fechaFormateada === fechaClase;
          
          // ✅ Validar que no haya pasado
          const [hours, minutes] = horaClase!.split(':').map(Number);
          const fechaHoraTurno = new Date(fechaTurno);
          fechaHoraTurno.setHours(hours, minutes, 0, 0);
          const esPasado = fechaHoraTurno < ahora;

          // ✅ Calcular cuántas semanas reales hay desde la fecha base
          const diasDiferencia = Math.floor((fechaTurno.getTime() - fechaBase.getTime()) / (24 * 60 * 60 * 1000));
          const weeksDiff = Math.floor(diasDiferencia / 7);
          
          if (!esMismaFecha && !esPasado && weeksDiff < semanas) {
            console.log(`✅ Creando turno para: ${fechaFormateada} (${fechaTurno.toLocaleDateString('es', { weekday: 'long' })}) - semana ${semana}, día ${diaSeleccionado}, weeksDiff: ${weeksDiff}, diasDiferencia: ${diasDiferencia}`);
            
            // Crear turnos para cada participante
            for (const pacienteId of pacientesSeleccionados) {
              turnosParaLote.push({
                id_paciente: pacienteId.toString(),
                id_especialista: especialistaSeleccionado,
                fecha: fechaFormateada,
                hora_inicio: horaClase!,
                hora_fin: (parseInt(horaClase!.split(':')[0]) + 1).toString().padStart(2, '0') + ':00',
                estado: 'programado',
                dificultad: dificultadSeleccionada
              });
            }
          } else {
            if (esMismaFecha) {
              console.log(`⏭️ Saltando clase original: ${fechaFormateada}`);
            } else if (esPasado) {
              console.log(`⏭️ Saltando clase pasada: ${fechaFormateada} ${horaClase}`);
            } else if (weeksDiff >= semanas) {
              console.log(`⏭️ Saltando turno fuera de rango: ${fechaFormateada} (weeksDiff: ${weeksDiff} >= ${semanas})`);
            }
          }
        }
      }

      console.log('🔄 Total de turnos a crear:', turnosParaLote.length);

      // ✅ Validar que haya turnos para crear
      if (turnosParaLote.length === 0) {
        addToast({
          variant: 'warning',
          message: 'Sin turnos nuevos',
          description: 'Todos los horarios seleccionados ya pasaron o están fuera del rango',
        });
        setIsSubmitting(false);
        return;
      }

      const resultado = await crearTurnosEnLote(turnosParaLote);

      if (resultado.success) {
        const exitosos = resultado.data?.exitosos ?? 0;
        const fallidos = resultado.data?.fallidos ?? 0;
        
        if (fallidos > 0) {
          addToast({
            variant: 'warning',
            message: 'Turnos creados parcialmente',
            description: `Se crearon ${exitosos} turnos. ${fallidos} fallaron.`,
          });
        } else {
          addToast({
            variant: 'success',
            message: 'Clases repetidas exitosamente',
            description: `✅ ${exitosos} turnos creados`,
          });
        }
        
        // Cerrar modal de repetición
        setMostrarModalRepetir(false);
        
        // Recargar datos
        if (onTurnosActualizados) {
          await Promise.resolve(onTurnosActualizados());
        }
        
        // Cerrar modal principal después de un delay
        setTimeout(() => {
          onClose();
        }, 1500);
        
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
      setIsSubmitting(false);
    }
  };

  // ============= RENDERIZAR MODAL DE REPETIR CLASE (SIMPLIFICADO) =============
  const renderModalRepetir = () => {
    if (!mostrarModalRepetir) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🔄 Repetir Clase de Pilates
          </h3>
          <p className="text-gray-600 text-sm">
            Esta clase se repetirá con la misma configuración actual
          </p>
        </div>

        {/* Información de la clase que se repetirá */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
          <p className="text-sm text-blue-800">
            <strong>📅 Clase base:</strong> {fechaClaseDate ? format(fechaClaseDate, "EEEE dd/MM/yyyy", { locale: es }) : ''} a las {horaClase}
          </p>
          <p className="text-sm text-blue-800">
            <strong>👥 Participantes:</strong> {pacientesSeleccionados.length}
            <span className="text-xs text-blue-600 ml-2">
              ({pacientesSeleccionados.map(id => {
                const p = pacientes.find(pac => pac.id_paciente === id);
                return p ? `${p.nombre} ${p.apellido}` : '';
              }).filter(Boolean).join(', ')})
            </span>
          </p>
          <p className="text-sm text-blue-800">
            <strong>👨‍⚕️ Especialista:</strong> {especialistas.find(e => e.id_usuario === especialistaSeleccionado)?.nombre} {especialistas.find(e => e.id_usuario === especialistaSeleccionado)?.apellido}
          </p>
          <p className="text-sm text-blue-800">
            <strong>📊 Nivel:</strong> {dificultadSeleccionada === 'principiante' ? '🟢 Principiante' : dificultadSeleccionada === 'intermedio' ? '🟡 Intermedio' : '🔴 Avanzado'}
          </p>
        </div>

        {/* Selección de días (Lunes a Viernes) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar días (Lunes a Viernes)
          </label>
          <div className="flex gap-2 flex-wrap">
            {DIAS_SEMANA.map((dia) => (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
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
        <div>
          <label htmlFor="semanas" className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad de semanas
          </label>
          <input
            id="semanas"
            type="number"
            min="1"
            max="12"
            value={semanas}
            onChange={(e) => setSemanas(parseInt(e.target.value) || 1)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
          />
        </div>

        {/* Preview */}
        {diasSeleccionados.length > 0 && pacientesSeleccionados.length > 0 && (
          <div className="text-sm bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
            <strong>✅ Se crearán hasta {diasSeleccionados.length * semanas * pacientesSeleccionados.length} turnos</strong>
            <div className="text-xs mt-2 text-green-600">
              {pacientesSeleccionados.length} participante(s) × {diasSeleccionados.length} día(s) × {semanas} semana(s)
            </div>
            <div className="text-xs mt-1 text-green-700">
              📌 Las clases mantendrán: mismos participantes, mismo especialista y mismo nivel de dificultad
            </div>
            <div className="text-xs mt-1 text-green-700">
              ⏰ Solo se crearán turnos en horarios futuros
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => setMostrarModalRepetir(false)}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleRepetirClase}
            disabled={isSubmitting || diasSeleccionados.length === 0}
            className="flex-1 px-4 py-2 bg-[#9C1838] text-white rounded-md hover:bg-[#7d1329] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creando clases...' : 'Repetir clase'}
          </button>
        </div>
      </div>
    );
  };

  const renderContenido = () => {
    // Modal de repetir clase
    if (mostrarModalRepetir) {
      return renderModalRepetir();
    }

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
                  {fechaClaseDate ? format(fechaClaseDate, "EEEE dd/MM", { locale: es }) : ''} - {horaClase}
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
      <div className="space-y-6">
        {/* Información de la clase */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Información de la clase</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>
                {fechaClaseDate ? format(fechaClaseDate, "EEEE dd/MM", { locale: es }) : ''} - {horaClase}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span>{pacientesSeleccionados.length}/4 participantes</span>
            </div>
          </div>
        </div>

        {/* Especialista - EDITABLE PARA ADMIN */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">Especialista</span>
            </div>
            {userRole === 1 && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                Admin
              </span>
            )}
          </div>

          {userRole === 1 ? (
            <select
              value={especialistaSeleccionado}
              onChange={(e) => setEspecialistaSeleccionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
            >
              {especialistas.map(esp => (
                <option key={esp.id_usuario} value={esp.id_usuario}>
                  {esp.nombre} {esp.apellido}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: especialistaActual?.color || '#e0e7ff' }}
              />
              <span className="font-medium">
                {especialistaActual?.nombre} {especialistaActual?.apellido}
              </span>
            </div>
          )}
        </div>

        {/* Nivel de Dificultad - SIEMPRE EDITABLE */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">Nivel de Dificultad</span>
          </div>

          <select
            value={dificultadSeleccionada}
            onChange={(e) => setDificultadSeleccionada(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
          >
            <option value="principiante">🟢 Principiante</option>
            <option value="intermedio">🟡 Intermedio</option>
            <option value="avanzado">🔴 Avanzado</option>
          </select>
          
          <p className="text-xs text-gray-500 mt-2">
            {dificultadSeleccionada === 'principiante' && 'Ideal para personas que recién comienzan con Pilates'}
            {dificultadSeleccionada === 'intermedio' && 'Para personas con experiencia básica en Pilates'}
            {dificultadSeleccionada === 'avanzado' && 'Para personas con experiencia avanzada en Pilates'}
          </p>
        </div>

        {/* Participantes - CON BÚSQUEDA COMO EN NUEVO TURNO */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">
              Participantes ({pacientesSeleccionados.length}/4)
            </span>
          </div>

          {/* Lista de participantes actuales */}
          {pacientesSeleccionados.length > 0 && (
            <div className="mb-3 space-y-2">
              {pacientesSeleccionados.map(pacienteId => {
                const paciente = pacientes.find(p => p.id_paciente === pacienteId);
                if (!paciente) return null;
                
                return (
                  <div key={pacienteId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm font-medium text-green-800">
                      {paciente.nombre} {paciente.apellido}
                    </span>
                    <button
                      onClick={() => eliminarPaciente(pacienteId)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Eliminar participante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pacientesSeleccionados.length < 4 && (
            <div className="relative">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Agregar participante</span>
              </div>
              
              <input
                ref={inputPacienteRef}
                type="text"
                value={busquedaPaciente}
                onChange={handleBusquedaPacienteChange}
                onFocus={() => busquedaPaciente.trim() && setMostrarListaPacientes(true)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                placeholder="Buscar por nombre, DNI..."
                autoComplete="off"
              />
              
              {/* Lista de resultados de búsqueda */}
              {mostrarListaPacientes && pacientesFiltrados.length > 0 && (
                <div 
                  ref={listaPacientesRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {pacientesFiltrados
                    .filter(paciente => !pacientesSeleccionados.includes(paciente.id_paciente))
                    .map((paciente) => (
                    <div
                      key={paciente.id_paciente}
                      onClick={() => agregarPaciente(paciente)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">
                        {paciente.nombre} {paciente.apellido}
                      </div>
                      <div className="text-sm text-gray-500">
                        DNI: {paciente.dni} • Tel: {paciente.telefono || 'No disponible'}
                      </div>
                    </div>
                  ))}
                  
                  {/* Mostrar mensaje cuando todos los resultados ya están agregados */}
                  {pacientesFiltrados.every(p => pacientesSeleccionados.includes(p.id_paciente)) && (
                    <div className="px-3 py-2 text-center text-gray-500 text-sm">
                      Todos los pacientes encontrados ya están en la clase
                    </div>
                  )}
                </div>
              )}
              
              {/* Mensaje cuando no hay resultados */}
              {mostrarListaPacientes && busquedaPaciente.trim() && pacientesFiltrados.length === 0 && (
                <div 
                  ref={listaPacientesRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500"
                >
                  No se encontraron pacientes
                </div>
              )}
            </div>
          )}
          {pacientesSeleccionados.length === 4 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <span>⚠️</span>
              Clase completa (máximo 4 participantes)
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => setMostrarConfirmacionEliminar(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar clase
          </button>
          
          <button
            onClick={() => setMostrarModalRepetir(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors"
          >
            <Repeat className="w-4 h-4" />
            Repetir clase
          </button>
          
          <div className="flex-1"></div>
          
          {cambiosPendientes && (
            <button
              onClick={handleGuardarCambios}
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#9C1838] text-white rounded-md hover:bg-[#7d1329] disabled:opacity-50 transition-colors font-medium"
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