"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToastStore } from '@/stores/toast-store';
import { 
  crearTurno, 
  obtenerEspecialistas, 
  obtenerPacientes, 
  obtenerEspecialidades, 
  obtenerBoxes,
  obtenerPrecioEspecialidad,
  obtenerAgendaEspecialista
} from '@/lib/actions/turno.action';

import type { TipoRecordatorio } from '@/lib/utils/whatsapp.utils';

export interface TurnoFormData {
  fecha: string;
  hora: string;
  id_especialista: string;
  id_especialidad: string;
  tipo_plan: 'particular' | 'obra_social';
  id_paciente: string;
  id_box: string;
  observaciones: string;
  precio: string;
  recordatorios: TipoRecordatorio[];
}

export const useTurnoForm = (initialData?: Partial<TurnoFormData>) => {
  const { addToast } = useToastStore();

  // Estados del formulario
  const [formData, setFormData] = useState<TurnoFormData>({
    fecha: initialData?.fecha || '',
    hora: initialData?.hora || '',
    id_especialista: initialData?.id_especialista || '',
    id_especialidad: initialData?.id_especialidad || '',
    tipo_plan: initialData?.tipo_plan || 'particular',
    id_paciente: initialData?.id_paciente || '',
    id_box: initialData?.id_box || '',
    observaciones: initialData?.observaciones || '',
    precio: initialData?.precio || '',
    recordatorios: initialData?.recordatorios || ['1d', '2h']
  });

  // Estados para datos externos
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<any[]>([]);
  const [boxesDisponibles, setBoxesDisponibles] = useState<any[]>([]);
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);

  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false);
  const [verificandoBoxes, setVerificandoBoxes] = useState(false);

  // Función para actualizar un campo del formulario
  const updateFormData = useCallback((field: keyof TurnoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Función para resetear el formulario
  const resetForm = useCallback(() => {
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
      recordatorios: ['1d', '2h']
    });
    setHorasOcupadas([]);
    setEspecialidadesDisponibles([]);
    setBoxesDisponibles([]);
  }, []);

  // Cargar datos iniciales
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [
        especialistasRes,
        pacientesRes,
        especialidadesRes,
        boxesRes
      ] = await Promise.all([
        obtenerEspecialistas(),
        obtenerPacientes(),
        obtenerEspecialidades(),
        obtenerBoxes()
      ]);

      if (especialistasRes.success) setEspecialistas(especialistasRes.data || []);
      if (pacientesRes.success) setPacientes(pacientesRes.data || []);
      if (especialidadesRes.success) setEspecialidades(especialidadesRes.data || []);
      if (boxesRes.success) setBoxes(boxesRes.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      addToast({
        variant: 'error',
        message: 'Error al cargar los datos del formulario'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Verificar especialidades disponibles cuando cambia el especialista
  const verificarEspecialidades = useCallback(async (especialistaId: string) => {
    if (!especialistaId) {
      setEspecialidadesDisponibles([]);
      return;
    }

    const especialistaSeleccionado = especialistas.find(e => e.id_usuario === especialistaId);
    
    if (especialistaSeleccionado) {
      // Especialidades del especialista seleccionado
      const especialidadesEspecialista = [
        ...(especialistaSeleccionado.especialidad ? [especialistaSeleccionado.especialidad] : []),
        ...(especialistaSeleccionado.usuario_especialidad?.map((ue: any) => ue.especialidad) || [])
      ];
      
      // Eliminar duplicados
      const especialidadesUnicas = especialidadesEspecialista.filter((esp, index, self) => 
        index === self.findIndex(e => e.id_especialidad === esp.id_especialidad)
      );
      
      setEspecialidadesDisponibles(especialidadesUnicas);
      
      // Si solo hay una especialidad, seleccionarla automáticamente
      if (especialidadesUnicas.length === 1) {
        updateFormData('id_especialidad', especialidadesUnicas[0].id_especialidad.toString());
      }
    }
  }, [especialistas, updateFormData]);

  // Verificar disponibilidad de horarios
  const verificarDisponibilidad = useCallback(async (fecha: string, especialistaId: string) => {
    if (!fecha || !especialistaId) return;
    
    setVerificandoDisponibilidad(true);
    try {
      const result = await obtenerAgendaEspecialista(especialistaId, fecha);
      if (result.success) {
        const horasOcupadas = result.data?.map((turno: any) => turno.hora) || [];
        setHorasOcupadas(horasOcupadas);
      }
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
    } finally {
      setVerificandoDisponibilidad(false);
    }
  }, []);

  // Verificar boxes disponibles
  const verificarBoxesDisponibles = useCallback(async (fecha: string, hora: string) => {
    if (!fecha || !hora) {
      setBoxesDisponibles(boxes);
      return;
    }
    
    setVerificandoBoxes(true);
    try {
      // Lógica para verificar qué boxes están disponibles en esa fecha/hora
      // Por ahora simplemente devolvemos todos los boxes
      setBoxesDisponibles(boxes);
    } catch (error) {
      console.error('Error verificando boxes:', error);
    } finally {
      setVerificandoBoxes(false);
    }
  }, [boxes]);

  // Obtener precio de especialidad
  const obtenerPrecio = useCallback(async (especialistaId: string, especialidadId: string, tipoPlan: 'particular' | 'obra_social') => {
    if (!especialistaId || !especialidadId) return;
    
    try {
      const result = await obtenerPrecioEspecialidad(especialistaId, parseInt(especialidadId), tipoPlan);
      if (result.success && result.precio) {
        updateFormData('precio', result.precio.toString());
      }
    } catch (error) {
      console.error('Error obteniendo precio:', error);
    }
  }, [updateFormData]);

  // Validar formulario
  const validarFormulario = useCallback(() => {
    const camposObligatorios = ['fecha', 'hora', 'id_paciente', 'id_especialista'];
    const camposFaltantes = camposObligatorios.filter(campo => !formData[campo as keyof TurnoFormData]);
    
    if (camposFaltantes.length > 0) {
      addToast({
        variant: 'error',
        message: 'Por favor completa todos los campos obligatorios'
      });
      return false;
    }
    
    return true;
  }, [formData, addToast]);

  // Crear turno
  const crearNuevoTurno = useCallback(async () => {
    if (!validarFormulario()) return { success: false };
    
    setIsSubmitting(true);
    try {
      const turnoData = {
        fecha: formData.fecha,
        hora: formData.hora,
        id_paciente: parseInt(formData.id_paciente),
        id_especialista: formData.id_especialista,
        id_especialidad: formData.id_especialidad ? parseInt(formData.id_especialidad) : null,
        id_box: formData.id_box ? parseInt(formData.id_box) : null,
        observaciones: formData.observaciones || null,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        tipo_plan: formData.tipo_plan,
        estado: "programado" as const
      };

      // Crear objeto con recordatorios para pasarlo a la función
      const turnoConRecordatorios = {
        ...turnoData,
        recordatorios: formData.recordatorios
      };

      const result = await crearTurno(turnoConRecordatorios);
      
      if (result.success) {
        addToast({
          variant: 'success',
          message: 'Turno creado exitosamente'
        });
        resetForm();
        return { success: true, data: result.data };
      } else {
        addToast({
          variant: 'error',
          message: result.error || 'No se pudo crear el turno'
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Error inesperado al crear el turno';
      addToast({
        variant: 'error',
        message: errorMessage
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validarFormulario, addToast, resetForm]);

  // Efectos para cargar datos automáticamente
  useEffect(() => {
    if (formData.id_especialista) {
      verificarEspecialidades(formData.id_especialista);
    }
  }, [formData.id_especialista, verificarEspecialidades]);

  useEffect(() => {
    if (formData.fecha && formData.id_especialista) {
      verificarDisponibilidad(formData.fecha, formData.id_especialista);
    }
  }, [formData.fecha, formData.id_especialista, verificarDisponibilidad]);

  useEffect(() => {
    if (formData.fecha && formData.hora) {
      verificarBoxesDisponibles(formData.fecha, formData.hora);
    }
  }, [formData.fecha, formData.hora, verificarBoxesDisponibles]);

  useEffect(() => {
    if (formData.id_especialista && formData.id_especialidad && formData.tipo_plan) {
      obtenerPrecio(formData.id_especialista, formData.id_especialidad, formData.tipo_plan);
    }
  }, [formData.id_especialista, formData.id_especialidad, formData.tipo_plan, obtenerPrecio]);

  return {
    // Estado del formulario
    formData,
    updateFormData,
    resetForm,
    
    // Datos externos
    especialistas,
    pacientes,
    especialidades,
    boxes,
    especialidadesDisponibles,
    boxesDisponibles,
    horasOcupadas,
    
    // Estados de carga
    loading,
    isSubmitting,
    verificandoDisponibilidad,
    verificandoBoxes,
    
    // Funciones
    cargarDatos,
    crearNuevoTurno,
    validarFormulario,
    
    // Helpers
    isHoraDisponible: (hora: string) => !horasOcupadas.includes(hora),
    getEspecialidadNombre: (id: string) => especialidadesDisponibles.find(e => e.id_especialidad.toString() === id)?.nombre || '',
    getPacienteNombre: (id: string) => pacientes.find(p => p.id_paciente.toString() === id)?.nombre || '',
    getEspecialistaNombre: (id: string) => especialistas.find(e => e.id_usuario === id)?.nombre || '',
    getBoxNumero: (id: string) => boxes.find(b => b.id_box.toString() === id)?.numero || ''
  };
};