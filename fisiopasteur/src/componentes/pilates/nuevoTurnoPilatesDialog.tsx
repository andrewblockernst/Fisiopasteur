"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { crearTurno } from "@/lib/actions/turno.action";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToastStore } from '@/stores/toast-store';
import Image from "next/image";

interface NuevoTurnoPilatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnoCreated?: () => void;
  fechaSeleccionada?: Date | null;
  horaSeleccionada?: string | null;
  especialistas: any[];
  pacientes: any[];
}

export function NuevoTurnoPilatesModal({
  isOpen,
  onClose,
  onTurnoCreated,
  fechaSeleccionada,
  horaSeleccionada,
  especialistas,
  pacientes
}: NuevoTurnoPilatesModalProps) {
  const { addToast } = useToastStore();
  
  const [formData, setFormData] = useState({
    especialistaId: '',
    pacientesSeleccionados: [] as number[],
    observaciones: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpiar formulario al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setFormData({
        especialistaId: '',
        pacientesSeleccionados: [],
        observaciones: '',
      });
    }
  }, [isOpen]);

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

    setIsSubmitting(true);
    
    try {
      const fecha = format(fechaSeleccionada, "yyyy-MM-dd");
      const hora = horaSeleccionada;
      
      // Crear un turno por cada paciente seleccionado
      for (const pacienteId of formData.pacientesSeleccionados) {
        await crearTurno({
          fecha,
          hora: hora + ':00',
          id_especialista: formData.especialistaId,
          id_especialidad: 4, // Pilates
          id_paciente: pacienteId,
          estado: "programado",
          observaciones: formData.observaciones || null,
          tipo_plan: "particular"
          // Removido recordatorios - se manejan por separado
        });
      }

      addToast({
        variant: 'success',
        message: 'Turnos creados',
        description: `Se crearon ${formData.pacientesSeleccionados.length} turno(s) de Pilates exitosamente`,
      });

      onTurnoCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creando turnos de Pilates:', error);
      addToast({
        variant: 'error',
        message: 'Error al crear turnos',
        description: 'No se pudieron crear los turnos de Pilates',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseDialog
      type="custom"
      size="md"
      title="Agregar Turno de Pilates"
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
          {/* Información del turno */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm">
              <strong>Día:</strong> {fechaSeleccionada ? format(fechaSeleccionada, "EEEE dd/MM", { locale: es }) : ""}
              <br />
              <strong>Horario:</strong> {horaSeleccionada}
            </p>
          </div>

          {/* Selección de especialista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialista*
            </label>
            <select
              value={formData.especialistaId}
              onChange={(e) => setFormData(prev => ({ ...prev, especialistaId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
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

          {/* Selección de pacientes (máximo 4) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pacientes (máximo 4)*
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
                      formData.pacientesSeleccionados.length >= 4
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
              Seleccionados: {formData.pacientesSeleccionados.length}/4
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
        text: isSubmitting ? "Creando..." : "Crear Turnos",
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