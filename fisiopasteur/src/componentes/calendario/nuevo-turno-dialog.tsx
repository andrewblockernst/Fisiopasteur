"use client";

import { useState, useEffect, useRef } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { obtenerEspecialistas, obtenerPacientes, obtenerEspecialidades, obtenerBoxes, crearTurno, obtenerAgendaEspecialista, obtenerTurnos} from "@/lib/actions/turno.action";
import Image from "next/image";
import Loading from "../loading";
import { useToastStore } from '@/stores/toast-store';
import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";
import { useAuth } from '@/hooks/usePerfil';

interface NuevoTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnoCreated?: () => void;
  fechaSeleccionada?: Date | null;
  horaSeleccionada?: string | null;
  especialistas?: any[];
  pacientes?: any[];
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
  const { user, loading: authLoading } = useAuth(); // agarramos usuario autenticado
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    id_especialista: '',
    id_especialidad: '',
    tipo_plan: 'particular' as 'particular' | 'obra_social',
    id_paciente: '',
    id_box: '',
    observaciones: '',
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
  const { addToast } = useToastStore();

  // Estados para el autocomplete de pacientes
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacientesFiltrados, setPacientesFiltrados] = useState<any[]>([]);
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const inputPacienteRef = useRef<HTMLInputElement>(null);
  const listaPacientesRef = useRef<HTMLDivElement>(null);

  // Dialog para mensajes (reemplaza los toasts)
  const [dialog, setDialog] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ 
    open: false, 
    type: 'success', 
    message: '' 
  });

  // Cargar datos si no vienen por props
  useEffect(() => {
    if (!isOpen) return;
    
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const promises = [];
        
        // Cargar especialistas si no vienen por props
        if (especialistasProp.length === 0) {
          promises.push(obtenerEspecialistas().then(res => {
            if (res.success) setEspecialistas(res.data || []);
          }));
        }
        
        // Cargar pacientes si no vienen por props
        if (pacientesProp.length === 0) {
          promises.push(obtenerPacientes().then(res => {
            if (res.success) setPacientes(res.data || []);
          }));
        }
        
        // Siempre cargar especialidades y boxes
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
    }).slice(0, 10); // Limitar a 10 resultados

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
      if (fechaSeleccionada) {
        setFormData(prev => ({
          ...prev,
          fecha: fechaSeleccionada.toISOString().split('T')[0]
        }));
      }
      
      // Precargar la hora si viene especificada
      if (horaSeleccionada) {
        console.log('Precargando hora:', horaSeleccionada); // Debug
        setFormData(prev => ({
          ...prev,
          hora: horaSeleccionada
        }));
      }
    }
  }, [fechaSeleccionada, horaSeleccionada, isOpen]);

  // Precargar especialista si no es admin
  useEffect(() => {
    if (user && !user.esAdmin && user.id_usuario && isOpen && user.id_usuario) {
      setFormData(prev => ({
        ...prev,
        id_especialista: String(user.id_usuario)
      }));
    }
  }, [user, isOpen]);

  // Construir lista de especialidades del especialista seleccionado
  // ESTA LÓGICA SE MANTIENE IGUAL - funciona tanto para admin como especialista
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
    
    // Si la especialidad seleccionada ya no existe, limpiar
    if (formData.id_especialidad && !unicas.some((e: any) => String(e.id_especialidad) === String(formData.id_especialidad))) {
      setFormData(prev => ({ ...prev, id_especialidad: '' }));
    }
  }, [formData.id_especialista, especialistas, formData.id_especialidad]);


  // Verificar horarios ocupados cuando cambia especialista o fecha
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
          // Generar lista de horas ocupadas considerando duración de turnos (1 hora por defecto)
          const ocupadas: string[] = [];
          
          res.data.forEach((turno: any) => {
            if (turno.estado !== 'cancelado') {
              const [horas, minutos] = turno.hora.split(':').map(Number);
              const inicioTurno = new Date();
              inicioTurno.setHours(horas, minutos, 0, 0);
              
              // Duración del turno (1 hora por defecto, se puede personalizar)
              const duracionTurno = 60; // minutos
              const finTurno = new Date(inicioTurno.getTime() + (duracionTurno * 60000));
              
              // Marcar todos los slots de tiempo ocupados en intervalos de 15 minutos
              const inicioSlot = new Date(inicioTurno);
              while (inicioSlot < finTurno) {
                const horaStr = inicioSlot.toTimeString().slice(0, 5); // "HH:MM"
                ocupadas.push(horaStr);
                inicioSlot.setMinutes(inicioSlot.getMinutes() + 15); // Intervalos de 15 min
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

  // Verificar boxes disponibles cuando cambia fecha y hora
  useEffect(() => {
    const verificarBoxesDisponibles = async () => {
      if (!formData.fecha || !formData.hora) {
        setBoxesDisponibles(boxes);
        return;
      }

      setVerificandoBoxes(true);
      try {
        // Obtener todos los turnos en esa fecha y hora específica
        const res = await obtenerTurnos({
          fecha: formData.fecha
        });
        
        if (res.success && res.data) {
          // Calcular el rango de tiempo del turno (1 hora)
          const [horaInicio, minutoInicio] = formData.hora.split(':').map(Number);
          const inicioTurno = new Date();
          inicioTurno.setHours(horaInicio, minutoInicio, 0, 0);
          const finTurno = new Date(inicioTurno.getTime() + (60 * 60000)); // 1 hora después

          // Filtrar turnos que se solapan con nuestro horario
          const turnosConflicto = res.data.filter((turno: any) => {
            if (turno.estado === 'cancelado' || !turno.id_box) return false;
            
            const [horaTurno, minutoTurno] = turno.hora.split(':').map(Number);
            const inicioTurnoExistente = new Date();
            inicioTurnoExistente.setHours(horaTurno, minutoTurno, 0, 0);
            const finTurnoExistente = new Date(inicioTurnoExistente.getTime() + (60 * 60000));

            // Verificar solapamiento
            return (inicioTurno < finTurnoExistente && finTurno > inicioTurnoExistente);
          });

          // Obtener IDs de boxes ocupados
          const boxesOcupados = turnosConflicto.map((turno: any) => turno.id_box);

          // Filtrar boxes disponibles
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
      setFormData({
        fecha: '',
        hora: '',
        id_especialista: '',
        id_especialidad: '',
        tipo_plan: 'particular',
        id_paciente: '',
        id_box: '',
        observaciones: '',
      });
      setEspecialidadesDisponibles([]);
      setBoxesDisponibles([]);
      setBusquedaPaciente('');
      setPacienteSeleccionado(null);
      setMostrarListaPacientes(false);
    }
  }, [isOpen]);

  // Función para verificar si una hora específica está disponible
  const esHoraDisponible = (hora: string): boolean => {
    if (!hora || horasOcupadas.length === 0) return true;
    
    // Verificar si la hora exacta está ocupada
    if (horasOcupadas.includes(hora)) return false;
    
    // Verificar si hay conflicto con turnos existentes (duración de 1 hora)
    const [horas, minutos] = hora.split(':').map(Number);
    const inicioNuevoTurno = new Date();
    inicioNuevoTurno.setHours(horas, minutos, 0, 0);
    
    // Verificar conflictos con slots ocupados
    for (let i = 0; i < 4; i++) { // 4 slots de 15 min = 1 hora
      const slotTiempo = new Date(inicioNuevoTurno.getTime() + (i * 15 * 60000));
      const slotStr = slotTiempo.toTimeString().slice(0, 5);
      if (horasOcupadas.includes(slotStr)) {
        return false;
      }
    }
    
    return true;
  };

  // Generar opciones de hora disponibles
  const generarOpcionesHora = (): { value: string; label: string; disponible: boolean }[] => {
    const opciones = [];
    
    // Horarios de 6:00 a 22:00 en intervalos de 15 minutos
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const disponible = esHoraDisponible(hora);
        
        // Si es hora pasada (solo para fecha de hoy), no mostrar
        if (formData.fecha === new Date().toISOString().split('T')[0]) {
          const ahora = new Date();
          const [horaNum, minNum] = hora.split(':').map(Number);
          const horaTurno = new Date();
          horaTurno.setHours(horaNum, minNum, 0, 0);
          
          if (horaTurno <= ahora) {
            continue; // Saltar horas pasadas
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
      // Si lo que escribió no coincide con el paciente seleccionado, limpiar selección
      if (pacienteSeleccionado && !`${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`.toLowerCase().includes(valor.toLowerCase())) {
        setPacienteSeleccionado(null);
        setFormData(prev => ({ ...prev, id_paciente: '' }));
      }
    }
  };

  const handleSubmit = async () => {
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
        // REMOVER EL PRECIO - no se incluye aquí
      };

      const resultado = await crearTurno(turnoData);

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

  // Mostrar loading mientras carga datos o auth
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
            className="space-y-4 text-left"
          >
            {/* Especialista - Solo mostrar si es admin */}
            {user?.esAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialista*
                </label>
                <select
                  value={formData.id_especialista}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_especialista: e.target.value, hora: '', id_box: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
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

            {/* Mostrar información del especialista si no es admin */}
            {!user?.esAdmin && user?.nombre && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialista
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                  {user.nombre} {user.apellido}
                  {user.rol && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {user.rol.nombre}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Especialidad - LA LÓGICA SE MANTIENE IGUAL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidad*
              </label>
              <select
                value={formData.id_especialidad}
                onChange={(e) => setFormData(prev => ({ ...prev, id_especialidad: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
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
          
            {/* ...resto del formulario (paciente, fecha, hora, box, plan, observaciones)... */}
            {/* PERO SIN LA SECCIÓN DE PRECIO */}

            {/* Paciente con Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paciente*
              </label>
              <input
                ref={inputPacienteRef}
                type="text"
                value={busquedaPaciente}
                onChange={handleBusquedaPacienteChange}
                onFocus={() => busquedaPaciente.trim() && setMostrarListaPacientes(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                placeholder="Buscar paciente por nombre, apellido o DNI..."
                required
                autoComplete="off"
              />
              
              {/* Lista de resultados */}
              {mostrarListaPacientes && pacientesFiltrados.length > 0 && (
                <div 
                  ref={listaPacientesRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {pacientesFiltrados.map((paciente) => (
                    <div
                      key={paciente.id_paciente}
                      onClick={() => seleccionarPaciente(paciente)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">
                        {paciente.nombre} {paciente.apellido}
                      </div>
                      <div className="text-sm text-gray-500">
                        DNI: {formatoDNI(paciente.dni)} • Tel: {formatoNumeroTelefono(paciente.telefono || 'No disponible')}
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
                  No se encontraron pacientes, verificar datos ingresados.
                </div>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha*
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value, hora: '', id_box: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Hora */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora* {verificandoDisponibilidad && <span className="text-xs text-gray-500">(Verificando disponibilidad...)</span>}
              </label>
              <select
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value, id_box: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
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
              {formData.id_especialista && formData.fecha && horasOcupadas.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {generarOpcionesHora().filter(h => h.disponible).length} horarios disponibles
                </p>
              )}
            </div>

            {/* Box/Consultorio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Box/Consultorio {verificandoBoxes && <span className="text-xs text-gray-500">(Verificando disponibilidad...)</span>}
              </label>
              <select
                value={formData.id_box}
                onChange={(e) => setFormData(prev => ({ ...prev, id_box: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan
              </label>
              <select
                value={formData.tipo_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo_plan: e.target.value as 'particular' | 'obra_social' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              >
                <option value="particular">Particular</option>
                <option value="obra_social">Obra Social</option>
              </select>
            </div>

            {/* REMOVER COMPLETAMENTE LA SECCIÓN DE PRECIO */}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                rows={3}
                placeholder="Información adicional sobre el turno..."
              />
            </div>
          </form>
        }
        primaryButton={{
          text: isSubmitting ? "Creando..." : "Crear Turno",
          onClick: handleSubmit,
          disabled: isSubmitting || !esHoraDisponible(formData.hora),
        }}
        secondaryButton={{
          text: "Cancelar",
          onClick: onClose,
        }}
      />

      {/* Modal para mostrar mensajes */}
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
    </>
  );
}

export default NuevoTurnoModal;