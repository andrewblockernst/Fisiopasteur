"use client";

import { useState, useEffect, useRef } from "react"; // ← Agregué useRef
import BaseDialog from "@/componentes/dialog/base-dialog";
import { crearTurno } from "@/lib/actions/turno.action";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToastStore } from '@/stores/toast-store';
import { AlertTriangle, Users, Clock, Info, Plus, Trash2 } from "lucide-react"; // ← Agregué Plus y Trash2
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

  // ============= NUEVOS ESTADOS PARA BÚSQUEDA DE PACIENTES =============
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacientesFiltrados, setPacientesFiltrados] = useState<any[]>([]);
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
  const inputPacienteRef = useRef<HTMLInputElement>(null);
  const listaPacientesRef = useRef<HTMLDivElement>(null);

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

  // ============= INICIALIZAR FORMULARIO SEGÚN EL TIPO DE SLOT =============
  useEffect(() => {
    if (isOpen) {
      // Si es una clase existente, preseleccionar el especialista
      if (slotInfo?.tipo === 'existente' && slotInfo.especialistaAsignado) {
        setFormData({
          especialistaId: slotInfo.especialistaAsignado,
          pacientesSeleccionados: [],
          observaciones: '',
          dificultad: 'principiante'
        });
      } else {
        // Slot libre, limpiar formulario
        setFormData({
          especialistaId: '',
          pacientesSeleccionados: [],
          observaciones: '',
          dificultad: 'principiante'
        });
      }
      
      // Limpiar búsqueda de pacientes
      setBusquedaPaciente('');
      setMostrarListaPacientes(false);
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

  const handleSubmit = async () => {
    if (!fechaSeleccionada || !horaSeleccionada || !formData.especialistaId || formData.pacientesSeleccionados.length === 0) {
      addToast({
        variant: 'error',
        message: 'Campos requeridos',
        description: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    // ============= VALIDACIÓN DE PERMISOS =============
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
      
      console.log('🔄 Creando turnos para:', {
        fecha,
        hora,
        especialista: formData.especialistaId,
        pacientes: formData.pacientesSeleccionados
      });
      
      // ============= CREAR UN TURNO POR CADA PACIENTE =============
      const resultados = [];
      for (const pacienteId of formData.pacientesSeleccionados) {
        console.log(`➕ Creando turno para paciente ${pacienteId}`);
        
        const resultado = await crearTurno({
          fecha,
          hora: hora + ':00',
          id_especialista: formData.especialistaId,
          id_especialidad: 4, // Pilates
          id_paciente: pacienteId,
          estado: "programado",
          observaciones: formData.observaciones || null,
          tipo_plan: "particular",
          dificultad: formData.dificultad
        });
        
        console.log(`✅ Turno creado para paciente ${pacienteId}:`, resultado);
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

      console.log('✅ Todos los turnos creados exitosamente:', resultados);

      // ============= ESPERAR A QUE SE RECARGUEN LOS DATOS =============
      if (onTurnoCreated) {
        console.log('🔄 Recargando datos...');
        await Promise.resolve(onTurnoCreated());
      }
      
      // Delay antes de cerrar para asegurar que se actualice la UI
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (error) {
      console.error('💥 Error creando turnos de Pilates:', error);
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

    const getIconAndColor = () => {
      switch (slotInfo.tipo) {
        case 'libre':
          return { icon: <Clock className="w-4 h-4" />, color: 'bg-green-50 border-green-200 text-green-800' };
        case 'existente':
          return { icon: <Users className="w-4 h-4" />, color: 'bg-blue-50 border-blue-200 text-blue-800' };
        case 'completa':
          return { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-50 border-red-200 text-red-800' };
        default:
          return { icon: <Info className="w-4 h-4" />, color: 'bg-gray-50 border-gray-200 text-gray-800' };
      }
    };

    const { icon, color } = getIconAndColor();

    return (
      <div className={`p-3 rounded-lg border ${color} mb-4`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="font-medium">
            {slotInfo.tipo === 'libre' && 'Nuevo horario disponible'}
            {slotInfo.tipo === 'existente' && 'Agregar a clase existente'}
            {slotInfo.tipo === 'completa' && 'Horario completo'}
          </span>
        </div>
        <p className="text-sm">{slotInfo.razon}</p>
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
      size="md"
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
        <div className="space-y-4 text-left">
          {/* Información del slot */}
          {renderSlotInfo()}

          {/* Información básica del turno */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium text-gray-700">Día:</span> {fechaSeleccionada ? format(fechaSeleccionada, "EEEE dd/MM", { locale: es }) : ""}
              <br />
              <span className="font-medium text-gray-700">Horario:</span> {horaSeleccionada}
            </p>
          </div>

          {/* Selección de especialista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialista*
              {slotInfo?.tipo === 'existente' && userRole !== 1 && (
                <span className="text-xs text-gray-500 ml-2">(Preseleccionado por clase existente)</span>
              )}
            </label>
            <select
              value={formData.especialistaId}
              onChange={(e) => setFormData(prev => ({ ...prev, especialistaId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
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
            {slotInfo?.tipo === 'existente' && userRole !== 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Solo los administradores pueden cambiar el especialista de una clase existente.
              </p>
            )}
          </div>

          {/* Selección de dificultad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nivel de Dificultad*
            </label>
            <select
              value={formData.dificultad}
              onChange={(e) => setFormData(prev => ({ ...prev, dificultad: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              required
            >
              <option value="principiante">🟢 Principiante</option>
              <option value="intermedio">🟡 Intermedio</option>
              <option value="avanzado">🔴 Avanzado</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.dificultad === 'principiante' && 'Ideal para personas que recién comienzan con Pilates'}
              {formData.dificultad === 'intermedio' && 'Para personas con experiencia básica en Pilates'}
              {formData.dificultad === 'avanzado' && 'Para personas con experiencia avanzada en Pilates'}
            </p>
          </div>

          {/* Selección de pacientes - CON BÚSQUEDA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participantes ({formData.pacientesSeleccionados.length}/{espaciosDisponibles})*
            </label>

            {/* Lista de participantes seleccionados */}
            {formData.pacientesSeleccionados.length > 0 && (
              <div className="mb-3 space-y-2">
                {formData.pacientesSeleccionados.map(pacienteId => {
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
            {formData.pacientesSeleccionados.length < espaciosDisponibles && (
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
                      .filter(paciente => !formData.pacientesSeleccionados.includes(paciente.id_paciente))
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
            
            {formData.pacientesSeleccionados.length === espaciosDisponibles && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <span>⚠️</span>
                Límite alcanzado ({espaciosDisponibles} participantes máximo)
              </p>
            )}
          </div>

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
              placeholder="Información adicional sobre la clase..."
            />
          </div>
        </div>
      }
      primaryButton={{
        text: isSubmitting 
          ? "Procesando..." 
          : slotInfo?.tipo === 'existente' 
            ? "Agregar Participantes" 
            : "Crear Clase",
        onClick: handleSubmit,
        disabled: isSubmitting,
      }}
      secondaryButton={{
        text: "Cancelar",
        onClick: onClose,
      }}
    />
  );
}