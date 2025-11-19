"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { actualizarTurno } from "@/lib/actions/turno.action";
import { useToastStore } from "@/stores/toast-store";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  ClipboardList,
  Save
} from "lucide-react";
import Image from "next/image";
import type { TurnoWithRelations } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DetalleTurnoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  turno: TurnoWithRelations | null;
  numeroTalonario?: string | null;
  onTurnoActualizado?: () => void;
}

export function DetalleTurnoDialog({
  isOpen,
  onClose,
  turno,
  numeroTalonario,
  onTurnoActualizado
}: DetalleTurnoDialogProps) {
  
  const { addToast } = useToastStore();
  
  // ============= ESTADO PARA OBSERVACIONES =============
  const [observaciones, setObservaciones] = useState(turno?.observaciones || '');
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  
  // ============= SINCRONIZAR OBSERVACIONES CUANDO CAMBIA EL TURNO =============
  useEffect(() => {
    if (turno) {
      setObservaciones(turno.observaciones || '');
      setEditando(false);
    }
  }, [turno?.id_turno]);
  
  if (!turno) return null;

  // ============= DETECTAR CAMBIOS EN OBSERVACIONES =============
  const hayCambios = observaciones !== (turno.observaciones || '');

  // ============= FUNCIÓN PARA GUARDAR OBSERVACIONES =============
  const handleGuardarObservaciones = async () => {
    setGuardando(true);
    
    try {
      const resultado = await actualizarTurno(turno.id_turno, {
        observaciones: observaciones.trim() || null
      });

      if (resultado.success) {
        addToast({
          variant: 'success',
          message: 'Observaciones guardadas',
          description: 'Las observaciones se actualizaron correctamente'
        });
        
        setEditando(false);
        
        // Recargar datos si hay callback
        if (onTurnoActualizado) {
          onTurnoActualizado();
        }
      } else {
        addToast({
          variant: 'error',
          message: 'Error al guardar',
          description: resultado.error || 'No se pudieron guardar las observaciones'
        });
      }
    } catch (error) {
      addToast({
        variant: 'error',
        message: 'Error inesperado',
        description: 'Ocurrió un error al guardar las observaciones'
      });
    } finally {
      setGuardando(false);
    }
  };

  // ============= FUNCIONES DE FORMATO =============
  const formatearFecha = (fecha: string) => {
    try {
      const date = new Date(fecha + 'T00:00:00');
      return format(date, "EEEE dd/MM/yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  const formatearHora = (hora: string | null) => {
    if (!hora) return '-';
    return hora.slice(0, 5);
  };

  // ============= ESTILOS SEGÚN ESTADO =============
  const getEstadoConfig = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'programado':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Calendar className="w-4 h-4 text-blue-600" />,
          label: 'Programado'
        };
      case 'vencido':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: <AlertCircle className="w-4 h-4 text-yellow-600" />,
          label: '⚠️ Vencido'
        };
      case 'atendido':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          label: 'Atendido'
        };
      case 'cancelado':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          label: 'Cancelado'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
          label: estado || 'Sin estado'
        };
    }
  };

  const estadoConfig = getEstadoConfig(turno.estado || 'programado');

  // ============= RENDER DEL CONTENIDO =============
  const renderContenido = () => {
    return (
      <div className="space-y-4 md:space-y-5 max-h-[65vh] md:max-h-[70vh] overflow-y-auto px-1">
        
        {/* Estado del turno */}
        <div className={`${estadoConfig.bg} border ${estadoConfig.border} p-3 md:p-4 rounded-lg`}>
          <div className="flex items-center gap-2 mb-2">
            {estadoConfig.icon}
            <span className={`text-sm md:text-base font-semibold ${estadoConfig.text}`}>
              Estado: {estadoConfig.label}
            </span>
          </div>
          
          {/* Número de talonario si existe */}
          {numeroTalonario && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current/10">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                <span className="font-medium">Paquete:</span> Turno {numeroTalonario}
              </span>
            </div>
          )}
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs md:text-sm font-medium text-gray-600">Fecha</span>
            </div>
            <p className="text-sm md:text-base font-semibold text-gray-900 capitalize">
              {formatearFecha(turno.fecha)}
            </p>
          </div>

          <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-xs md:text-sm font-medium text-gray-600">Hora</span>
            </div>
            <p className="text-sm md:text-base font-semibold text-gray-900 font-mono">
              {formatearHora(turno.hora)}
            </p>
          </div>
        </div>

        {/* Paciente */}
        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-xs md:text-sm font-medium text-gray-600">Paciente</span>
          </div>
          
          {turno.paciente ? (
            <div className="space-y-2">
              <p className="text-sm md:text-base font-semibold text-gray-900">
                {turno.paciente.nombre} {turno.paciente.apellido}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-gray-600">
                {turno.paciente.dni && (
                  <div>
                    <span className="font-medium">DNI:</span> {turno.paciente.dni}
                  </div>
                )}
                {turno.paciente.telefono && (
                  <div>
                    <span className="font-medium">Teléfono:</span> {turno.paciente.telefono}
                  </div>
                )}
                {turno.paciente.email && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Email:</span> {turno.paciente.email}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Sin paciente asignado</p>
          )}
        </div>

        {/* Especialista y Especialidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-xs md:text-sm font-medium text-gray-600">Especialista</span>
            </div>
            
            {turno.especialista ? (
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: turno.especialista.color || '#9C1838' }}
                />
                <p className="text-sm md:text-base font-semibold text-gray-900">
                  {turno.especialista.nombre} {turno.especialista.apellido}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Sin especialista</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-gray-500" />
              <span className="text-xs md:text-sm font-medium text-gray-600">Especialidad</span>
            </div>
            <p className="text-sm md:text-base font-semibold text-gray-900">
              {turno.especialidad?.nombre || 'Sin especialidad'}
            </p>
          </div>
        </div>

        {/* Box */}
        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-xs md:text-sm font-medium text-gray-600">Box / Consultorio</span>
          </div>
          <p className="text-sm md:text-base font-semibold text-gray-900">
            {turno.box ? `Box ${turno.box.numero}` : 'Sin box asignado'}
          </p>
        </div>

        {/* Observaciones - EDITABLE */}
        <div className="bg-amber-50 border border-amber-200 p-3 md:p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-xs md:text-sm font-medium text-amber-800">Observaciones</span>
            </div>
            {!editando && (
              <button
                onClick={() => setEditando(true)}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium underline"
              >
                Editar
              </button>
            )}
          </div>
          
          {editando ? (
            <div className="space-y-3">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
                rows={4}
                placeholder="Escribir observaciones..."
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setObservaciones(turno.observaciones || '');
                    setEditando(false);
                  }}
                  disabled={guardando}
                  className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarObservaciones}
                  disabled={guardando || !hayCambios}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm md:text-base text-amber-900 whitespace-pre-wrap">
              {observaciones || 'Sin observaciones'}
            </p>
          )}
        </div>

        {/* Información adicional de auditoría */}
        <div className="pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
            {turno.created_at && (
              <div>
                <span className="font-medium">Creado:</span>{' '}
                {format(new Date(turno.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
            )}
            {turno.updated_at && (
              <div>
                <span className="font-medium">Actualizado:</span>{' '}
                {format(new Date(turno.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseDialog
      type="custom"
      size="lg"
      title="Detalle del Turno"
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
      message={renderContenido()}
    />
  );
}
