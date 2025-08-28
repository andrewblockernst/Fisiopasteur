"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { obtenerEspecialistas, obtenerPacientes, obtenerEspecialidades, obtenerBoxes, crearTurno, obtenerPrecioEspecialidad } from "@/lib/actions/turno.action";

interface NuevoTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnoCreated?: () => void; // <-- Callback opcional para recargar
  fechaSeleccionada?: Date | null; // <-- Opcional
  especialistas?: any[]; // <-- Opcional
  pacientes?: any[]; // <-- Opcional
}

export function NuevoTurnoModal({
  isOpen,
  onClose,
  onTurnoCreated,
  fechaSeleccionada = null,
  especialistas: especialistasProp = [],
  pacientes: pacientesProp = []
}: NuevoTurnoModalProps) {
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    id_especialista: '',
    id_especialidad: '',
    tipo_plan: 'particular' as 'particular' | 'obra_social',
    id_paciente: '',
    observaciones: '',
    precio: ''
  });

  // Estados para datos cargados automáticamente
  const [especialistas, setEspecialistas] = useState<any[]>(especialistasProp);
  const [pacientes, setPacientes] = useState<any[]>(pacientesProp);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Establecer fecha seleccionada cuando se abre el modal
  useEffect(() => {
    if (fechaSeleccionada && isOpen) {
      setFormData(prev => ({
        ...prev,
        fecha: fechaSeleccionada.toISOString().split('T')[0]
      }));
    }
  }, [fechaSeleccionada, isOpen]);

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
    // Si la seleccionada ya no existe, limpiar
    if (formData.id_especialidad && !unicas.some((e: any) => String(e.id_especialidad) === String(formData.id_especialidad))) {
      setFormData(prev => ({ ...prev, id_especialidad: '' }));
    }
  }, [formData.id_especialista, especialistas, formData.id_especialidad]);

  // Autocompletar precio según especialista + especialidad + plan
  useEffect(() => {
    (async () => {
      if (!formData.id_especialista || !formData.id_especialidad || !formData.tipo_plan) return;
      try {
        const res = await obtenerPrecioEspecialidad(
          String(formData.id_especialista),
          Number(formData.id_especialidad),
          formData.tipo_plan
        );
        if (res.success) setFormData(prev => ({ ...prev, precio: res.precio != null ? String(res.precio) : '' }));
      } catch {}
    })();
  }, [formData.id_especialista, formData.id_especialidad, formData.tipo_plan]);

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
        observaciones: '',
        precio: ''
      });
      setEspecialidadesDisponibles([]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.fecha || !formData.hora || !formData.id_especialista || !formData.id_especialidad || !formData.id_paciente) {
      setDialog({
        open: true,
        type: 'error',
        message: 'Por favor completa fecha, hora, especialista, especialidad y paciente'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Preparar datos para el servidor
      const turnoData = {
        fecha: formData.fecha,
        hora: formData.hora + ':00', // Agregar segundos
        precio: formData.precio ? parseInt(formData.precio) : null,
        id_especialista: formData.id_especialista,
        id_paciente: parseInt(formData.id_paciente),
        id_especialidad: formData.id_especialidad ? parseInt(formData.id_especialidad) : null,
        observaciones: formData.observaciones || null,
        estado: "programado" as const,
        tipo_plan: formData.tipo_plan,
      };

      const resultado = await crearTurno(turnoData);

      if (resultado.success && resultado.data) {
        setDialog({
          open: true,
          type: 'success',
          message: 'Turno creado exitosamente'
        });

        // Llamar callback si existe
        onTurnoCreated?.();

        onClose();
      } else {
        setDialog({
          open: true,
          type: 'error',
          message: resultado.error || 'Error al crear el turno'
        });
      }
    } catch (error) {
      console.error('Error al crear turno:', error);
      setDialog({
        open: true,
        type: 'error',
        message: 'Error inesperado al crear el turno'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading mientras carga datos
  if (loading) {
    return (
      <BaseDialog
        type="custom"
        size="md"
        title="Nuevo Turno"
        isOpen={isOpen}
        onClose={onClose}
        customColor="#9C1838"
        message={
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9C1838]"></div>
            <span className="ml-2">Cargando datos...</span>
          </div>
        }
      />
    );
  }

  return (
    <>
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg select-none">$</span>
                <input
                  type="text"
                  value={
                    formData.precio
                      ? Number(formData.precio).toLocaleString('es-AR')
                      : ''
                  }
                  onChange={(e) => {
                    // Remover todo excepto números
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    setFormData(prev => ({ ...prev, precio: raw }));
                  }}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                  placeholder="..."
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
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
          </form>
        }
        primaryButton={{
          text: isSubmitting ? "Creando..." : "Crear Turno",
          onClick: handleSubmit,
          disabled: isSubmitting,
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