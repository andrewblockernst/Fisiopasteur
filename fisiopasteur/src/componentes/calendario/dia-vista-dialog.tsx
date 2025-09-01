"use client";

import { useEffect, useState } from "react";
import { Clock, FileText, Phone, Edit, Trash2 } from "lucide-react";
import { useTurnoStore, type TurnoConDetalles } from "@/stores/turno-store";
import { useToastStore } from "@/stores/toast-store";
import BaseDialog from "@/componentes/dialog/base-dialog";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";
import { eliminarTurno as eliminarTurnoAction } from "@/lib/actions/turno.action";

interface DayViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fecha: Date | null;
  turnos: TurnoConDetalles[];
  onEditTurno?: (turno: TurnoConDetalles) => void;
  onDeleteTurno?: (turno: TurnoConDetalles) => void;
}

export function DayViewModal({
  isOpen,
  onClose,
  fecha,
  turnos,
  onEditTurno,
  onDeleteTurno
}: DayViewModalProps) {
  const { addToast } = useToastStore();
  const { deleteTurno, updateTurno } = useTurnoStore();
  const [turnoEditando, setTurnoEditando] = useState<TurnoConDetalles | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; turno?: TurnoConDetalles }>(
    { open: false }
  );
  const [turnosLocal, setTurnosLocal] = useState<TurnoConDetalles[]>(turnos);

  useEffect(() => {
    if (isOpen) setTurnosLocal(turnos);
  }, [isOpen, fecha, JSON.stringify(turnos.map(t=>t.id_turno))]);

  if (!isOpen || !fecha) return null;

  const formatearFecha = (fecha: Date) => {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearHora = (hora: string) => {
    return new Date(`2000-01-01T${hora}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'confirmado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'programado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEdit = (turno: TurnoConDetalles) => {
    setTurnoEditando(turno);
  };

  const handleDelete = (turno: TurnoConDetalles) => {
    setConfirmDelete({ open: true, turno });
  };

  return (
    <>
    <BaseDialog
      type="custom"
      customColor="#9C1838"
      size="lg"
      title="Turnos del día"
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton
      message={
        <div className="text-left">
          <p className="text-red-700 font-semibold mb-4 capitalize">
            {formatearFecha(fecha)}
          </p>
          {turnosLocal.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No hay turnos programados
              </h3>
              <p className="text-gray-500">
                No se encontraron turnos para esta fecha.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {turnosLocal.length} turno{turnosLocal.length !== 1 ? 's' : ''} programado{turnosLocal.length !== 1 ? 's' : ''}
                </h3>
              </div>

              {turnosLocal
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((turno) => (
                  <div
                    key={turno.id_turno}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: turno.especialista?.color || '#9C1838' }}
                        />
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {turno.paciente?.nombre} {turno.paciente?.apellido}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Dr. {turno.especialista?.nombre} {turno.especialista?.apellido}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`
                          px-3 py-1 rounded-full text-xs font-medium border
                          ${getEstadoColor(turno.estado || 'programado')}
                        `}>
                          {turno.estado || 'programado'}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(turno)}
                            className="p-2 text-gray-600 hover:text-[#9C1838] hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(turno)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatearHora(turno.hora)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{turno.paciente?.telefono || 'Sin teléfono'}</span>
                      </div>
                      
                      {turno.observaciones && (
                        <div className="md:col-span-2 flex items-start gap-2 text-gray-600">
                          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{turno.observaciones}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      }
      secondaryButton={{
        text: "Cerrar",
        onClick: onClose,
      }}
    />
      {turnoEditando && (
        <EditarTurnoDialog
          turno={{
            id_turno: turnoEditando.id_turno,
            id_paciente: turnoEditando.id_paciente ?? null,
            id_especialista: turnoEditando.id_especialista ?? null,
            id_especialidad: turnoEditando.id_especialidad ?? null,
            id_box: (turnoEditando as any).id_box ?? null,
            fecha: turnoEditando.fecha,
            hora: turnoEditando.hora,
            observaciones: turnoEditando.observaciones ?? null,
            created_at: (turnoEditando as any).created_at ?? null,
            estado: (turnoEditando as any).estado ?? null,
            notas: (turnoEditando as any).notas ?? null,
            precio: (turnoEditando as any).precio ?? null,
            updated_at: (turnoEditando as any).updated_at ?? null,
            tipo_plan: (turnoEditando as any).tipo_plan ?? null,
          }}
          open={Boolean(turnoEditando)}
          onClose={() => setTurnoEditando(null)}
          onSaved={(updated?: any) => {
            setTurnoEditando(null);
          if (updated) {
            updateTurno(turnoEditando.id_turno, updated);
            setTurnosLocal(prev => prev.map(t => t.id_turno === turnoEditando.id_turno ? { ...t, ...updated } as any : t));
            addToast({ variant: 'success', message: 'Turno actualizado' });
          }
          }}
        />
      )}

      <BaseDialog
        type="error"
        size="sm"
        title="Eliminar turno"
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false })}
        showCloseButton
        message={
          <div>
            ¿Querés eliminar este turno? Esta acción no se puede deshacer.
          </div>
        }
        primaryButton={{
          text: 'Eliminar',
          onClick: async () => {
            if (!confirmDelete.turno) return;
            const id = confirmDelete.turno.id_turno;
            const res = await eliminarTurnoAction(id);
            if (res.success) {
              deleteTurno(id);
              setTurnosLocal(prev => prev.filter(t => t.id_turno !== id));
              addToast({ variant: 'success', message: 'Turno eliminado' });
              setConfirmDelete({ open: false });
            } else {
              addToast({ variant: 'error', message: res.error || 'Error al eliminar' });
            }
          }
        }}
        secondaryButton={{
          text: 'Cancelar',
          onClick: () => setConfirmDelete({ open: false })
        }}
      />
    </>
  );
}
