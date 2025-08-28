"use client";

import { useState, useTransition, useEffect } from "react";
import { actualizarTurno, obtenerPacientes, obtenerEspecialistas, obtenerEspecialidades, obtenerBoxes, obtenerAgendaEspecialista } from "@/lib/actions/turno.action";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { Database } from "@/types/database.types";

// Tipos basados en tu estructura de BD
type Turno = Database['public']['Tables']['turno']['Row'];
type PacienteCompleto = Database['public']['Tables']['paciente']['Row'];
type Usuario = Database['public']['Tables']['usuario']['Row'];
type Especialidad = Database['public']['Tables']['especialidad']['Row'];
type Box = Database['public']['Tables']['box']['Row'];

// Tipos que realmente devuelve tu API (más simples)
type PacienteAPI = {
  id_paciente: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  email: string | null;
};

type EspecialistaAPI = {
  id_usuario: string;
  nombre: string;
  apellido: string;
  color?: string;
  especialidad?: Especialidad;
  usuario_especialidad?: Array<{ especialidad: Especialidad }>;
};

// Tipo para el turno con relaciones incluidas (como viene del JOIN)
type TurnoConRelaciones = Turno & {
  paciente?: PacienteCompleto;
  especialista?: Usuario;
  especialidad?: Especialidad;
  box?: Box;
};

interface EditarTurnoModalProps {
  turno: TurnoConRelaciones;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated?: TurnoConRelaciones) => void;
}

export default function EditarTurnoDialog({ turno, open, onClose, onSaved }: EditarTurnoModalProps) {
  const [formData, setFormData] = useState({
    fecha: turno.fecha,
    hora: turno.hora.slice(0, 5), // Remover segundos para mostrar solo HH:MM
    id_especialista: turno.id_especialista || '',
    id_especialidad: turno.id_especialidad ? String(turno.id_especialidad) : '',
    tipo_plan: (turno.tipo_plan || 'particular') as 'particular' | 'obra_social',
    id_paciente: String(turno.id_paciente),
    observaciones: turno.observaciones || ''
  });

  const [isPending, startTransition] = useTransition();

  // Estados con tipos que coinciden con lo que devuelve tu API
  const [pacientes, setPacientes] = useState<PacienteAPI[]>([]);
  const [especialistas, setEspecialistas] = useState<EspecialistaAPI[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
  const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false);

  // Dialog para mensajes
  const [dialog, setDialog] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({ 
    open: false, 
    type: 'success', 
    message: '' 
  });

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (!open) return;
    
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [p, e, esp, b] = await Promise.all([
          obtenerPacientes(),
          obtenerEspecialistas(),
          obtenerEspecialidades(),
          obtenerBoxes()
        ]);
        
        if (p.success) setPacientes(p.data || []);
        if (e.success) setEspecialistas(
          (e.data || []).map((item: any) => ({
            ...item,
            color: item.color === null ? undefined : item.color
          }))
        );
        if (esp.success) setEspecialidades(esp.data || []);
        if (b.success) setBoxes(b.data || []);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [open]);

  // Filtrar especialidades según especialista seleccionado
  useEffect(() => {
    if (!formData.id_especialista) {
      setEspecialidadesDisponibles([]);
      return;
    }
    
    const especialista = especialistas.find(e => e.id_usuario === formData.id_especialista);
    if (!especialista) {
      setEspecialidadesDisponibles([]);
      return;
    }
    
    const lista: Especialidad[] = [];
    if (especialista.especialidad) lista.push(especialista.especialidad);
    if (Array.isArray(especialista.usuario_especialidad)) {
      especialista.usuario_especialidad.forEach((ue) => {
        if (ue.especialidad) lista.push(ue.especialidad);
      });
    }
    
    const unicas = lista.filter((esp, i, arr) => 
      i === arr.findIndex(e => e.id_especialidad === esp.id_especialidad)
    );
    setEspecialidadesDisponibles(unicas);
    
    // Si la especialidad seleccionada ya no existe, limpiar
    if (formData.id_especialidad && !unicas.some(e => 
      String(e.id_especialidad) === String(formData.id_especialidad)
    )) {
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
          // Generar lista de horas ocupadas, excluyendo el turno actual
          const ocupadas: string[] = [];
          
          res.data.forEach((turnoAgenda: Turno) => {
            // Excluir el turno actual que se está editando
            if (turnoAgenda.id_turno === turno.id_turno || turnoAgenda.estado === 'cancelado') {
              return;
            }
            
            const [horas, minutos] = turnoAgenda.hora.split(':').map(Number);
            const inicioTurno = new Date();
            inicioTurno.setHours(horas, minutos, 0, 0);
            
            // Duración del turno (1 hora por defecto)
            const duracionTurno = 60; // minutos
            const finTurno = new Date(inicioTurno.getTime() + (duracionTurno * 60000));
            
            // Marcar todos los slots de tiempo ocupados en intervalos de 15 minutos
            const inicioSlot = new Date(inicioTurno);
            while (inicioSlot < finTurno) {
              const horaStr = inicioSlot.toTimeString().slice(0, 5); // "HH:MM"
              ocupadas.push(horaStr);
              inicioSlot.setMinutes(inicioSlot.getMinutes() + 15); // Intervalos de 15 min
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
  }, [formData.id_especialista, formData.fecha, turno.id_turno]);

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

  const handleSubmit = async () => {
    if (!formData.fecha || !formData.hora || !formData.id_especialista || !formData.id_especialidad || !formData.id_paciente) {
      setDialog({
        open: true,
        type: 'error',
        message: 'Por favor completa fecha, hora, especialista, especialidad y paciente'
      });
      return;
    }

    startTransition(async () => {
      try {
        // Preparar datos con tipos correctos para la actualización
        const datosActualizacion: Partial<Database['public']['Tables']['turno']['Update']> = {
          id_paciente: Number(formData.id_paciente),
          id_especialista: formData.id_especialista,
          id_especialidad: Number(formData.id_especialidad),
          id_box: null, // Puedes agregar lógica para box si es necesario
          fecha: formData.fecha,
          hora: formData.hora + ':00', // Agregar segundos
          observaciones: formData.observaciones || null,
          tipo_plan: formData.tipo_plan,
        };

        const res = await actualizarTurno(turno.id_turno, datosActualizacion);

        if (res.success) {
          setDialog({ 
            open: true, 
            type: 'success', 
            message: "Turno actualizado exitosamente" 
          });
          onSaved?.(res.data as TurnoConRelaciones);
          onClose();
        } else {
          setDialog({ 
            open: true, 
            type: 'error', 
            message: res.error || "Error al actualizar turno" 
          });
        }
      } catch (error) {
        console.error('Error al actualizar turno:', error);
        setDialog({ 
          open: true, 
          type: 'error', 
          message: "Error inesperado al actualizar el turno" 
        });
      }
    });
  };

  // Mostrar loading mientras carga datos
  if (loading) {
    return (
      <BaseDialog
        type="custom"
        size="md"
        title="Editar Turno"
        isOpen={open}
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
        title="Editar Turno"
        isOpen={open}
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
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value, hora: formData.hora }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Hora */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora * {verificandoDisponibilidad && <span className="text-xs text-gray-500">(Verificando disponibilidad...)</span>}
              </label>
              <select
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
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
                    disabled={!disponible && value !== formData.hora} // Permitir la hora actual aunque esté "ocupada"
                    style={{ 
                      color: (disponible || value === formData.hora) ? 'black' : '#ccc',
                      backgroundColor: (disponible || value === formData.hora) ? 'white' : '#f5f5f5'
                    }}
                  >
                    {label} {!disponible && value !== formData.hora && '(Ocupado)'}
                  </option>
                ))}
              </select>
              {formData.id_especialista && formData.fecha && horasOcupadas.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {generarOpcionesHora().filter(h => h.disponible || h.value === formData.hora).length} horarios disponibles
                </p>
              )}
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
                {especialidadesDisponibles.map((esp) => (
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
          text: isPending ? "Guardando..." : "Guardar Cambios",
          onClick: handleSubmit,
          disabled: isPending || (!esHoraDisponible(formData.hora) && formData.hora !== turno.hora.slice(0, 5)),
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