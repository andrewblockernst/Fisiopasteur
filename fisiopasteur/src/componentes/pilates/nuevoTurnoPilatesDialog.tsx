"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { crearTurno } from "@/lib/actions/turno.action";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToastStore } from '@/stores/toast-store';
import { AlertTriangle, Users, Clock, Info } from "lucide-react";
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
  slotInfo?: SlotInfo | null;  // ← Nueva prop
  userRole?: number;           // ← Nueva prop (1 = admin, otros = usuario normal)
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============= INICIALIZAR FORMULARIO SEGÚN EL TIPO DE SLOT =============
  useEffect(() => {
    if (isOpen) {
      // Si es una clase existente, preseleccionar el especialista
      if (slotInfo?.tipo === 'existente' && slotInfo.especialistaAsignado) {
        setFormData({
          especialistaId: slotInfo.especialistaAsignado,
          pacientesSeleccionados: [],
          observaciones: '',
        });
      } else {
        // Slot libre, limpiar formulario
        setFormData({
          especialistaId: '',
          pacientesSeleccionados: [],
          observaciones: '',
        });
      }
    }
  }, [isOpen, slotInfo]);

  const handlePacienteClick = (pacienteId: number) => {
    setFormData(prev => ({
      ...prev,
      pacientesSeleccionados: prev.pacientesSeleccionados.includes(pacienteId)
        ? prev.pacientesSeleccionados.filter(id => id !== pacienteId)
        : prev.pacientesSeleccionados.length < 4
        ? [...prev.pacientesSeleccionados, pacienteId]
        : prev.pacientesSeleccionados
    }));
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
      
      // ============= AQUÍ ESTÁ EL PROBLEMA: CREAR UN TURNO POR CADA PACIENTE =============
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
          tipo_plan: "particular"
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

  // ============= CALCULAR ESPACIOS DISPONIBLES =============
  const espaciosDisponibles = slotInfo?.tipo === 'existente' 
    ? 4 - (slotInfo.participantes || 0)
    : 4;

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

          {/* Selección de pacientes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pacientes (máximo {espaciosDisponibles} disponibles)*
            </label>
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
              {pacientes.map(paciente => (
                <label
                  key={paciente.id_paciente}
                  className="flex items-center gap-2 cursor-pointer px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={formData.pacientesSeleccionados.includes(paciente.id_paciente)}
                    onChange={() => handlePacienteClick(paciente.id_paciente)}
                    disabled={
                      !formData.pacientesSeleccionados.includes(paciente.id_paciente) &&
                      formData.pacientesSeleccionados.length >= espaciosDisponibles
                    }
                    className="w-4 h-4 text-[#9C1838] focus:ring-[#9C1838] border-gray-300 rounded"
                  />
                  <span className="text-sm">
                    {paciente.nombre} {paciente.apellido}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Seleccionados: {formData.pacientesSeleccionados.length}/{espaciosDisponibles}
            </p>
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