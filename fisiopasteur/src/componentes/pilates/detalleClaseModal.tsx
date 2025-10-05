"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { eliminarTurno, crearTurno, actualizarTurno } from "@/lib/actions/turno.action";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToastStore } from '@/stores/toast-store';
import { Users, Clock, Calendar, User, AlertTriangle, Trash2, UserPlus, Settings } from "lucide-react";
import Image from "next/image";

interface DetalleClaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnosActualizados?: () => void;
  turnos: any[];
  especialistas: any[];
  pacientes: any[];
  userRole?: number;
}

export function DetalleClaseModal({
  isOpen,
  onClose,
  onTurnosActualizados,
  turnos,
  especialistas,
  pacientes,
  userRole = 2
}: DetalleClaseModalProps) {
  const { addToast } = useToastStore();
  
  const [modoEdicion, setModoEdicion] = useState(false);
  const [modoResolucionConflicto, setModoResolucionConflicto] = useState(false);
  const [especialistaSeleccionado, setEspecialistaSeleccionado] = useState('');
  const [pacientesSeleccionados, setPacientesSeleccionados] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);

  // Obtener información de la clase
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
        setModoEdicion(false);
        setModoResolucionConflicto(false);
      }
    }
  }, [isOpen, turnos, hayConflicto]);

  // ============= RESOLVER CONFLICTO (FUNCIÓN CORREGIDA) =============
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

      // Actualizar todos los turnos al especialista seleccionado
      for (const turno of turnos) {
        if (turno.id_especialista !== especialistaSeleccionado) {
          console.log(`🔄 Actualizando turno ${turno.id_turno} de ${turno.id_especialista} a ${especialistaSeleccionado}`);
          
          const resultado = await actualizarTurno(turno.id_turno, {
            id_especialista: especialistaSeleccionado
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
      
      // ============= AQUÍ ESTÁ LA CORRECCIÓN: ESPERAR A QUE SE RECARGUEN LOS DATOS =============
      console.log('🔄 Recargando datos del calendario...');
      
      if (onTurnosActualizados) {
        // Si onTurnosActualizados es asíncrona, esperarla
        await Promise.resolve(onTurnosActualizados());
      }
      
      console.log('✅ Datos recargados, cerrando modal...');
      
      // Pequeño delay para asegurar que la UI se actualice
      setTimeout(() => {
        onClose();
      }, 500);
      
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

  // ============= GUARDAR CAMBIOS NORMALES (TAMBIÉN CORREGIDA) =============
  const handleGuardarCambios = async () => {
    setIsSubmitting(true);
    
    try {
      const fecha = fechaClase;
      const hora = horaClase + ':00';
      
      console.log('💾 Guardando cambios en la clase...');
      
      // 1. Eliminar turnos que ya no están seleccionados
      const pacientesActuales = turnos.map(t => t.id_paciente);
      const pacientesAEliminar = pacientesActuales.filter(id => !pacientesSeleccionados.includes(id));
      
      for (const pacienteId of pacientesAEliminar) {
        const turnoAEliminar = turnos.find(t => t.id_paciente === pacienteId);
        if (turnoAEliminar) {
          console.log(`🗑️ Eliminando turno de paciente ${pacienteId}`);
          await eliminarTurno(turnoAEliminar.id_turno);
        }
      }

      // 2. Actualizar especialista en turnos existentes (solo admin)
      if (userRole === 1) {
        const pacientesExistentes = pacientesSeleccionados.filter(id => pacientesActuales.includes(id));
        for (const pacienteId of pacientesExistentes) {
          const turnoExistente = turnos.find(t => t.id_paciente === pacienteId);
          if (turnoExistente && turnoExistente.id_especialista !== especialistaSeleccionado) {
            console.log(`🔄 Actualizando especialista para paciente ${pacienteId}`);
            await actualizarTurno(turnoExistente.id_turno, {
              id_especialista: especialistaSeleccionado
            });
          }
        }
      }

      // 3. Crear nuevos turnos para pacientes agregados
      const pacientesNuevos = pacientesSeleccionados.filter(id => !pacientesActuales.includes(id));
      for (const pacienteId of pacientesNuevos) {
        console.log(`➕ Creando nuevo turno para paciente ${pacienteId}`);
        await crearTurno({
          fecha,
          hora,
          id_especialista: especialistaSeleccionado,
          id_especialidad: 4,
          id_paciente: pacienteId,
          estado: "programado",
          tipo_plan: "particular"
        });
      }

      addToast({
        variant: 'success',
        message: 'Clase actualizada',
        description: 'Los cambios se guardaron correctamente',
      });

      setModoEdicion(false);
      
      // Esperar a que se recarguen los datos
      console.log('🔄 Recargando datos después de guardar cambios...');
      if (onTurnosActualizados) {
        await Promise.resolve(onTurnosActualizados());
      }
      
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error actualizando clase:', error);
      addToast({
        variant: 'error',
        message: 'Error al actualizar',
        description: 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============= ELIMINAR CLASE (TAMBIÉN CORREGIDA) =============
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
      }, 500);
      
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

  // Manejar selección de pacientes
  const handlePacienteToggle = (pacienteId: number) => {
    setPacientesSeleccionados(prev => {
      if (prev.includes(pacienteId)) {
        return prev.filter(id => id !== pacienteId);
      } else {
        return prev.length < 4 ? [...prev, pacienteId] : prev;
      }
    });
  };

  // ============= EL RESTO DEL CÓDIGO PERMANECE IGUAL =============
  const renderContenido = () => {
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

    // Vista normal de la clase (sin conflictos)
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
              <span>{turnos.length}/4 participantes</span>
            </div>
          </div>
        </div>

        {/* Especialista */}
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

          {modoEdicion && userRole === 1 ? (
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

        {/* Participantes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">
                Participantes ({modoEdicion ? pacientesSeleccionados.length : turnos.length}/4)
              </span>
            </div>
            {!modoEdicion && (
              <button
                onClick={() => setModoEdicion(true)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <UserPlus className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>

          {modoEdicion ? (
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
              {pacientes.map(paciente => (
                <label
                  key={paciente.id_paciente}
                  className="flex items-center gap-2 cursor-pointer px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={pacientesSeleccionados.includes(paciente.id_paciente)}
                    onChange={() => handlePacienteToggle(paciente.id_paciente)}
                    disabled={
                      !pacientesSeleccionados.includes(paciente.id_paciente) &&
                      pacientesSeleccionados.length >= 4
                    }
                    className="w-4 h-4 text-[#9C1838] focus:ring-[#9C1838] border-gray-300 rounded"
                  />
                  <span className="text-sm">
                    {paciente.nombre} {paciente.apellido}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {turnos.map((turno, index) => (
                <div key={turno.id_turno} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-sm">
                    {turno.paciente?.nombre} {turno.paciente?.apellido}
                  </span>
                </div>
              ))}
              
              {/* Mostrar espacios disponibles */}
              {Array.from({ length: 4 - turnos.length }, (_, index) => (
                <div key={`disponible-${index}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded opacity-60">
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  <span className="text-sm italic text-gray-500">Lugar disponible</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-4 border-t">
          {modoEdicion ? (
            <>
              <button
                onClick={() => setModoEdicion(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarCambios}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-[#9C1838] text-white rounded-md hover:bg-[#7d1329] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Guardando..' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setMostrarConfirmacionEliminar(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar clase
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