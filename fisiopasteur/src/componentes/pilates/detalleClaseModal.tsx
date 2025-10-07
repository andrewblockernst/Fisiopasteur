"use client";

import { useState, useEffect, useRef } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { eliminarTurno, crearTurno, actualizarTurno, crearTurnosEnLote } from "@/lib/actions/turno.action";
import { format } from "date-fns";
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

  // ============= NUEVOS ESTADOS PARA REPETIR CLASE =============
  const [mostrarModalRepetir, setMostrarModalRepetir] = useState(false);
  const [configuracionRepetir, setConfiguracionRepetir] = useState({
    tipoRepeticion: 'semanal' as 'semanal' | 'personalizado',
    diasSemana: [] as string[], // ['lunes', 'miercoles', 'viernes']
    fechaHasta: '',
    mantieneParticipantes: true,
    mantieneDificultad: true,
    mantieneEspecialista: true
  });

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
    }).slice(0, 10); // Limitar a 10 resultados

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
      
      // Importar la función para obtener turnos
      const { obtenerTurnosConFiltros } = await import("@/lib/actions/turno.action");
      
      const resultado = await obtenerTurnosConFiltros({
        fecha_desde: fechaClase,
        fecha_hasta: fechaClase,
        especialidad_id: 4, // Pilates
        hora_desde: horaClase,
        hora_hasta: horaClase
      });
      
      if (resultado.success && resultado.data) {
        // Filtrar solo los turnos de esta clase específica
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
    
    return turnos; // Fallback a los datos actuales
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
      // Inicializar dificultad con el valor de la clase
      setDificultadSeleccionada(primeraClase?.dificultad || 'principiante');
      setCambiosPendientes(false);
      
      // Limpiar búsqueda de pacientes
      setBusquedaPaciente('');
      setMostrarListaPacientes(false);
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

    if (!pacientesSeleccionados.includes(paciente.id_paciente)) {
      setPacientesSeleccionados(prev => [...prev, paciente.id_paciente]);
      setBusquedaPaciente('');
      setMostrarListaPacientes(false);
    }
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
      console.log('📝 Especialista seleccionado:', especialistaSeleccionado);
      console.log('📋 Turnos a actualizar:', turnos.length);

      // Actualizar todos los turnos al especialista seleccionado y dificultad
      for (const turno of turnos) {
        if (turno.id_especialista !== especialistaSeleccionado) {
          console.log(`🔄 Actualizando turno ${turno.id_turno} de ${turno.id_especialista} a ${especialistaSeleccionado}`);
          
          const resultado = await actualizarTurno(turno.id_turno, {
            id_especialista: especialistaSeleccionado,
            dificultad: dificultadSeleccionada
          });
          
          console.log(`✅ Turno ${turno.id_turno} actualizado:`, resultado);
        } else {
          console.log(`⏭️ Turno ${turno.id_turno} ya tiene el especialista correcto`);
        }
      }

      console.log('✅ Todos los turnos actualizados');

      addToast({
        variant: 'success',
        message: 'Conflicto resuelto',
        description: `Todos los turnos ahora pertenecen al mismo especialista.`,
      });

      setModoResolucionConflicto(false);
      
      // ============= RECARGAR DATOS =============
      console.log('🔄 Recargando datos después de resolver conflicto...');
      
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
      
      console.log('💾 Guardando cambios en la clase...');
      console.log('📋 Estado actual:', {
        fecha,
        hora,
        especialistaSeleccionado,
        pacientesSeleccionados,
        dificultadSeleccionada,
        pacientesActuales: turnos.map(t => t.id_paciente)
      });
      
      const pacientesActuales = turnos.map(t => t.id_paciente);
      const pacientesAEliminar = pacientesActuales.filter(id => !pacientesSeleccionados.includes(id));
      const pacientesNuevos = pacientesSeleccionados.filter(id => !pacientesActuales.includes(id));
      
      console.log('🗑️ Pacientes a eliminar:', pacientesAEliminar);
      console.log('➕ Pacientes nuevos a crear:', pacientesNuevos);
      
      // 1. Eliminar turnos
      for (const pacienteId of pacientesAEliminar) {
        const turnoAEliminar = turnos.find(t => t.id_paciente === pacienteId);
        if (turnoAEliminar) {
          console.log(`🗑️ Eliminando turno ${turnoAEliminar.id_turno}`);
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
          
          // Solo actualizar especialista si es admin
          if (userRole === 1 && turnoExistente.id_especialista !== especialistaSeleccionado) {
            actualizaciones.id_especialista = especialistaSeleccionado;
          }
          
          // Siempre actualizar dificultad si cambió
          if (turnoExistente.dificultad !== dificultadSeleccionada) {
            actualizaciones.dificultad = dificultadSeleccionada;
          }
          
          // Solo actualizar si hay cambios
          if (Object.keys(actualizaciones).length > 0) {
            console.log(`🔄 Actualizando turno ${turnoExistente.id_turno}`, actualizaciones);
            const resultado = await actualizarTurno(turnoExistente.id_turno, actualizaciones);
            if (!resultado.success) {
              throw new Error(`Error actualizando turno: ${resultado.error}`);
            }
          }
        }
      }

      // 3. Crear nuevos turnos
      for (const pacienteId of pacientesNuevos) {
        console.log(`➕ Creando nuevo turno para paciente ${pacienteId}`);
        const resultado = await crearTurno({
          fecha,
          hora,
          id_especialista: especialistaSeleccionado,
          id_especialidad: 4, // Pilates
          id_paciente: pacienteId,
          estado: "programado",
          tipo_plan: "particular",
          dificultad: dificultadSeleccionada
        });
        
        if (!resultado.success) {
          throw new Error(`Error creando turno para paciente ${pacienteId}: ${resultado.error}`);
        }
      }

      console.log('✅ Todos los cambios aplicados exitosamente');

      addToast({
        variant: 'success',
        message: 'Clase actualizada',
        description: `Se aplicaron todos los cambios correctamente`,
      });

      setCambiosPendientes(false);
      
      // ============= RECARGAR DATOS DEL MODAL =============
      console.log('🔄 Recargando datos después de guardar cambios...');
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Recargar datos internos del modal
      await recargarDatosModal();
      
      // Luego recargar los datos de la página principal
      if (onTurnosActualizados) {
        await Promise.resolve(onTurnosActualizados());
      }
      
      // Esperar más tiempo antes de cerrar
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      console.log('✅ Cerrando modal después de recargar datos');
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
      console.log('🗑️ Eliminando clase completa...');
      
      for (const turno of turnos) {
        console.log(`🗑️ Eliminando turno ${turno.id_turno}`);
        await eliminarTurno(turno.id_turno);
      }

      addToast({
        variant: 'success',
        message: 'Clase eliminada',
        description: 'La clase se eliminó correctamente',
      });

      // Esperar a que se recarguen los datos
      console.log('🔄 Recargando datos después de eliminar...');
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
    // ============= NUEVA FUNCIÓN PARA REPETIR CLASE =============
  const handleRepetirClase = async () => {
    if (!configuracionRepetir.fechaHasta) {
      addToast({
        variant: 'error',
        message: 'Fecha requerida',
        description: 'Debes seleccionar hasta qué fecha repetir la clase',
      });
      return;
    }

    if (configuracionRepetir.tipoRepeticion === 'personalizado' && configuracionRepetir.diasSemana.length === 0) {
      addToast({
        variant: 'error',
        message: 'Días requeridos',
        description: 'Debes seleccionar al menos un día de la semana',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const fechaActual = new Date(fechaClase!);
      const fechaLimite = new Date(configuracionRepetir.fechaHasta);
      
      console.log('🔄 Iniciando repetición de clase...');
      console.log('📅 Desde:', fechaActual, 'Hasta:', fechaLimite);
      
      // Determinar días de la semana a repetir
      let diasARepeir: string[] = [];
      
      if (configuracionRepetir.tipoRepeticion === 'semanal') {
        // Repetir el mismo día de la semana
        const diaSemanaActual = fechaActual.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
        const nombresDias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        diasARepeir = [nombresDias[diaSemanaActual]];
      } else {
        diasARepeir = configuracionRepetir.diasSemana;
      }

      console.log('📋 Días a repetir:', diasARepeir);

      const fechasACrear: Date[] = [];
      const fechaIteracion = new Date(fechaActual);
      fechaIteracion.setDate(fechaIteracion.getDate() + 7); // Empezar la próxima semana

      // Generar todas las fechas donde crear las clases
      while (fechaIteracion <= fechaLimite) {
        const diaSemanaIteracion = fechaIteracion.getDay();
        const nombreDiaIteracion = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][diaSemanaIteracion];
        
        if (diasARepeir.includes(nombreDiaIteracion)) {
          fechasACrear.push(new Date(fechaIteracion));
        }
        
        fechaIteracion.setDate(fechaIteracion.getDate() + 1);
      }

      console.log('📅 Fechas a crear:', fechasACrear.map(f => format(f, 'yyyy-MM-dd')));

      let clasesCreadas = 0;
      let errores = 0;

      // Crear clases para cada fecha
      for (const fecha of fechasACrear) {
        try {
          const fechaString = format(fecha, 'yyyy-MM-dd');
          
          console.log(`➕ Creando clase para ${fechaString}...`);
          
          // Verificar si ya existe una clase en esa fecha/hora/especialista
          const { obtenerTurnosConFiltros } = await import("@/lib/actions/turno.action");
          const turnosExistentes = await obtenerTurnosConFiltros({
            fecha_desde: fechaString,
            fecha_hasta: fechaString,
            especialidad_id: 4, // Pilates
            hora_desde: horaClase,
            hora_hasta: horaClase,
            especialista_id: configuracionRepetir.mantieneEspecialista ? especialistaSeleccionado : undefined
          });

          if (turnosExistentes.success && turnosExistentes.data && turnosExistentes.data.length > 0) {
            console.log(`⚠️ Ya existe clase en ${fechaString} a las ${horaClase}, saltando...`);
            continue;
          }

          // Determinar qué datos usar para la nueva clase
          const especialistaAUsar = configuracionRepetir.mantieneEspecialista ? especialistaSeleccionado : '';
          const dificultadAUsar = configuracionRepetir.mantieneDificultad ? dificultadSeleccionada : 'principiante';
          const participantesAUsar = configuracionRepetir.mantieneParticipantes ? pacientesSeleccionados : [];

          // Si no mantiene especialista, usar el primero disponible (esto se puede mejorar)
          const especialistaFinal = especialistaAUsar || especialistas[0]?.id_usuario;

          if (!especialistaFinal) {
            console.error(`❌ No hay especialista disponible para ${fechaString}`);
            errores++;
            continue;
          }

          // Preparar turnos para crear en lote (optimizado para notificaciones)
          const turnosParaLote = participantesAUsar.map(pacienteId => ({
            id_paciente: pacienteId.toString(),
            id_especialista: especialistaFinal,
            fecha: fechaString,
            hora_inicio: horaClase + ':00',
            hora_fin: (parseInt(horaClase.split(':')[0]) + 1).toString().padStart(2, '0') + ':00',
            id_clase_pilates: undefined, // Se puede agregar después si se tiene la referencia
            descripcion: `Clase de Pilates - ${dificultadAUsar} (Repetición)`,
            tipo: 'pilates',
            estado: 'programado'
          }));

          // Usar función de lote para evitar spam de notificaciones
          const { crearTurnosEnLote } = await import("@/lib/actions/turno.action");
          const resultado = await crearTurnosEnLote(turnosParaLote);

          if (resultado.success && resultado.data) {
            console.log(`✅ Turnos creados en lote: ${resultado.data.exitosos}/${resultado.data.total}`);
            if (resultado.data.errores.length > 0) {
              console.warn(`⚠️ Algunos turnos tuvieron errores:`, resultado.data.errores);
              errores += resultado.data.errores.length;
            }
          } else {
            console.error(`❌ Error creando turnos en lote para ${fechaString}:`, resultado.error);
            errores += participantesAUsar.length;
          }

          clasesCreadas++;
          console.log(`✅ Clase creada para ${fechaString} con ${participantesAUsar.length} participantes`);

        } catch (error) {
          console.error(`❌ Error creando clase para ${format(fecha, 'yyyy-MM-dd')}:`, error);
          errores++;
        }
      }

      // Mostrar resultado
      if (clasesCreadas > 0) {
        addToast({
          variant: 'success',
          message: 'Clases repetidas exitosamente',
          description: `Se crearon ${clasesCreadas} clases nuevas${errores > 0 ? ` (${errores} errores)` : ''}`,
        });
      } else {
        addToast({
          variant: 'warning',
          message: 'No se crearon clases',
          description: 'Puede que ya existan clases en las fechas seleccionadas',
        });
      }

      console.log(`✅ Proceso completado: ${clasesCreadas} clases creadas, ${errores} errores`);

      // Recargar datos
      if (onTurnosActualizados) {
        await Promise.resolve(onTurnosActualizados());
      }

      setMostrarModalRepetir(false);

    } catch (error) {
      console.error('❌ Error repitiendo clase:', error);
      addToast({
        variant: 'error',
        message: 'Error al repetir clase',
        description: 'No se pudo completar el proceso de repetición',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============= FUNCIÓN PARA MANEJAR DÍAS DE LA SEMANA =============
  const toggleDiaSemana = (dia: string) => {
    setConfiguracionRepetir(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter(d => d !== dia)
        : [...prev.diasSemana, dia]
    }));
  };

  // ============= RENDERIZAR MODAL DE REPETIR CLASE =============
  const renderModalRepetir = () => {
    if (!mostrarModalRepetir) return null;

    const diasSemanaOpciones = [
      { key: 'lunes', label: 'Lunes' },
      { key: 'martes', label: 'Martes' },
      { key: 'miércoles', label: 'Miércoles' },
      { key: 'jueves', label: 'Jueves' },
      { key: 'viernes', label: 'Viernes' },
      { key: 'sábado', label: 'Sábado' },
      { key: 'domingo', label: 'Domingo' }
    ];

    // Calcular fecha mínima (próxima semana)
    const fechaMinima = new Date();
    fechaMinima.setDate(fechaMinima.getDate() + 7);
    const fechaMinimaString = format(fechaMinima, 'yyyy-MM-dd');

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🔄 Repetir Clase de Pilates
          </h3>
          <p className="text-gray-600 text-sm">
            Crear clases automáticamente manteniendo la configuración actual
          </p>
        </div>

        {/* Información de la clase actual */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Clase actual:</strong> {fechaClase ? format(new Date(fechaClase), "EEEE dd/MM", { locale: es }) : ''} a las {horaClase}
            <br />
            <strong>Participantes:</strong> {pacientesSeleccionados.length}
            <br />
            <strong>Dificultad:</strong> {dificultadSeleccionada}
          </p>
        </div>

        {/* Tipo de repetición */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de repetición
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="tipoRepeticion"
                value="semanal"
                checked={configuracionRepetir.tipoRepeticion === 'semanal'}
                onChange={(e) => setConfiguracionRepetir(prev => ({ ...prev, tipoRepeticion: e.target.value as any }))}
                className="mr-2"
              />
              <span className="text-sm">Repetir el mismo día de la semana</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="tipoRepeticion"
                value="personalizado"
                checked={configuracionRepetir.tipoRepeticion === 'personalizado'}
                onChange={(e) => setConfiguracionRepetir(prev => ({ ...prev, tipoRepeticion: e.target.value as any }))}
                className="mr-2"
              />
              <span className="text-sm">Elegir días específicos</span>
            </label>
          </div>
        </div>

        {/* Selección de días (solo si es personalizado) */}
        {configuracionRepetir.tipoRepeticion === 'personalizado' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de la semana
            </label>
            <div className="grid grid-cols-3 gap-2">
              {diasSemanaOpciones.map(dia => (
                <label key={dia.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={configuracionRepetir.diasSemana.includes(dia.key)}
                    onChange={() => toggleDiaSemana(dia.key)}
                    className="mr-2"
                  />
                  <span className="text-sm">{dia.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Fecha hasta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repetir hasta la fecha*
          </label>
          <input
            type="date"
            value={configuracionRepetir.fechaHasta}
            onChange={(e) => setConfiguracionRepetir(prev => ({ ...prev, fechaHasta: e.target.value }))}
            min={fechaMinimaString}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Las clases se crearán desde la próxima semana hasta esta fecha
          </p>
        </div>

        {/* Opciones avanzadas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Configuración de las nuevas clases
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuracionRepetir.mantieneParticipantes}
                onChange={(e) => setConfiguracionRepetir(prev => ({ ...prev, mantieneParticipantes: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Mantener los mismos participantes</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuracionRepetir.mantieneEspecialista}
                onChange={(e) => setConfiguracionRepetir(prev => ({ ...prev, mantieneEspecialista: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Mantener el mismo especialista</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuracionRepetir.mantieneDificultad}
                onChange={(e) => setConfiguracionRepetir(prev => ({ ...prev, mantieneDificultad: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Mantener el mismo nivel de dificultad</span>
            </label>
          </div>
        </div>

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
            disabled={isSubmitting}
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
                  {fechaClase ? format(new Date(fechaClase), "EEEE dd/MM", { locale: es }) : ''} - {horaClase}
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
                {fechaClase ? format(new Date(fechaClase), "EEEE dd/MM", { locale: es }) : ''} - {horaClase}
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

          {/* Input para agregar participantes */}
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
          
          {/* BOTÓN DE REPETIR CON DEBUG */}
          <button
            onClick={() => {
              console.log('🔄 Click en botón repetir clase');
              setMostrarModalRepetir(true);
              console.log('✅ Estado mostrarModalRepetir cambiado a true');
            }}
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