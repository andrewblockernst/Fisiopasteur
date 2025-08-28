"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { useToastStore } from "@/stores/toast-store";
import { useTurnoStore } from "@/stores/turno-store";
import { obtenerEspecialidades, obtenerBoxes } from "@/lib/actions/turno.action";

interface NuevoTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaSeleccionada: Date | null;
  especialistas: any[];
  pacientes: any[];
}

export function NuevoTurnoModal({
  isOpen,
  onClose,
  fechaSeleccionada,
  especialistas,
  pacientes
}: NuevoTurnoModalProps) {
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    id_especialista: '',
    id_especialidad: '',
    id_box: '',
    id_paciente: '',
    observaciones: '',
    precio: ''
  });

  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);

  const { addTurno } = useTurnoStore();
  const { addToast } = useToastStore();

  // Establecer fecha seleccionada cuando se abre el modal
  useEffect(() => {
    if (fechaSeleccionada && isOpen) {
      setFormData(prev => ({
        ...prev,
        fecha: fechaSeleccionada.toISOString().split('T')[0]
      }));
    }
  }, [fechaSeleccionada, isOpen]);

  // Cargar especialidades y boxes al abrir
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [esp, b] = await Promise.all([
        obtenerEspecialidades(),
        obtenerBoxes(),
      ]);
      if (esp.success) {
        setEspecialidades(esp.data || []);
        setEspecialidadesDisponibles(esp.data || []);
      }
      if (b.success) setBoxes(b.data || []);
    })();
  }, [isOpen]);

  // Filtrar especialidades según especialista seleccionado
  useEffect(() => {
    if (!formData.id_especialista) {
      setEspecialidadesDisponibles(especialidades);
      return;
    }
    const especialistaSeleccionado = especialistas.find(e => e.id_usuario === formData.id_especialista);
    if (especialistaSeleccionado) {
      const lista: any[] = [];
      if (especialistaSeleccionado.especialidad) lista.push(especialistaSeleccionado.especialidad);
      if (especialistaSeleccionado.usuario_especialidad) {
        especialistaSeleccionado.usuario_especialidad.forEach((ue: any) => {
          if (ue.especialidad) lista.push(ue.especialidad);
        });
      }
      const unicas = lista.filter((esp, i, arr) => i === arr.findIndex((e: any) => e.id_especialidad === esp.id_especialidad));
      setEspecialidadesDisponibles(unicas);
      if (formData.id_especialidad && !unicas.some(e => String(e.id_especialidad) === String(formData.id_especialidad))) {
        setFormData(prev => ({ ...prev, id_especialidad: '' }));
      }
    } else {
      setEspecialidadesDisponibles([]);
    }
  }, [formData.id_especialista, especialistas, especialidades, formData.id_especialidad]);

  const handleSubmit = async () => {
    if (!formData.fecha || !formData.hora || !formData.id_especialista || !formData.id_paciente || !formData.id_especialidad) {
      addToast({
        variant: 'error',
        message: 'Por favor completa fecha, hora, especialista, especialidad y paciente'
      });
      return;
    }

    try {
      // Preparar datos para el servidor
      const turnoData = {
        fecha: formData.fecha,
        hora: formData.hora + ':00', // Agregar segundos
        precio: formData.precio ? parseInt(formData.precio) : null,
        id_especialista: formData.id_especialista,
        id_paciente: parseInt(formData.id_paciente),
        id_especialidad: formData.id_especialidad ? parseInt(formData.id_especialidad) : null,
        id_box: formData.id_box ? parseInt(formData.id_box) : null,
        observaciones: formData.observaciones || null,
        estado: "pendiente" as const,
      };

      // Llamar a la Server Action para crear el turno
      const { crearTurno } = await import('@/lib/actions/turno.action');
      const resultado = await crearTurno(turnoData);

      if (resultado.success && resultado.data) {
        // Agregar al store local (usar el resultado tal como viene del servidor)
        addTurno(resultado.data as any);
        
        addToast({
          variant: 'success',
          message: 'Turno creado exitosamente'
        });

        // Resetear formulario
        setFormData({
          fecha: '',
          hora: '',
          id_especialista: '',
          id_especialidad: '',
          id_box: '',
          id_paciente: '',
          observaciones: '',
          precio: ''
        });

        onClose();
      } else {
        addToast({
          variant: 'error',
          message: resultado.error || 'Error al crear el turno'
        });
      }
    } catch (error) {
      console.error('Error al crear turno:', error);
      addToast({
        variant: 'error',
        message: 'Error inesperado al crear el turno'
      });
    }
  };

  return (
    <BaseDialog
      type="custom"
      size="md"
      title="Nuevo Turno"
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton
      customColor="#9C1838"
      message={
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="space-y-4 text-left"
        >
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              required
            />
          </div>

          {/* Hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora *
            </label>
            <input
              type="time"
              value={formData.hora}
              onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              required
            />
          </div>

          {/* Especialista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialista *
            </label>
            <select
              value={formData.id_especialista}
              onChange={(e) => setFormData(prev => ({ ...prev, id_especialista: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              required
            >
              <option value="">Seleccionar especialista</option>
              {especialistas.map((especialista) => (
                <option key={especialista.id_usuario} value={especialista.id_usuario}>
                  Dr. {especialista.nombre} {especialista.apellido}
                </option>
              ))}
            </select>
          </div>

          {/* Especialidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialidad *
            </label>
            <select
              value={formData.id_especialidad}
              onChange={(e) => setFormData(prev => ({ ...prev, id_especialidad: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              required
            >
              <option value="">Seleccionar especialidad</option>
              {especialidadesDisponibles.map((esp: any) => (
                <option key={esp.id_especialidad} value={esp.id_especialidad}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente *
            </label>
            <select
              value={formData.id_paciente}
              onChange={(e) => setFormData(prev => ({ ...prev, id_paciente: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              required
            >
              <option value="">Seleccionar paciente</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id_paciente} value={paciente.id_paciente}>
                  {paciente.nombre} {paciente.apellido} - DNI: {paciente.dni}
                </option>
              ))}
            </select>
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio (ARS)
            </label>
            <input
              type="number"
              value={formData.precio}
              onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              placeholder="15000"
            />
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
              placeholder="Información adicional sobre el turno..."
            />
          </div>

          {/* Box (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Box (opcional)
            </label>
            <select
              value={formData.id_box}
              onChange={(e) => setFormData(prev => ({ ...prev, id_box: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
            >
              <option value="">Sin asignar</option>
              {boxes.map((b: any) => (
                <option key={b.id_box} value={b.id_box}>
                  Box {b.numero}
                </option>
              ))}
            </select>
          </div>

        </form>
      }
      primaryButton={{
        text: "Crear Turno",
        onClick: handleSubmit,
      }}
      secondaryButton={{
        text: "Cancelar",
        onClick: onClose,
      }}
    />
  );
}

export default NuevoTurnoModal;
