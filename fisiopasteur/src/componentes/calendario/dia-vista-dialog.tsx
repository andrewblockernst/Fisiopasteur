"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useTurnoStore, type TurnoConDetalles } from "@/stores/turno-store";
import { useToastStore } from "@/stores/toast-store";
import BaseDialog from "@/componentes/dialog/base-dialog";
import EditarTurnoDialog from "@/componentes/turnos/editar-turno-modal";
import { eliminarTurno as eliminarTurnoAction } from "@/lib/actions/turno.action";
import Image from "next/image";
import TurnoCard from "./turno-card";

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
      case 'pendiente':
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
      customIcon={
        <Image
          src="/favicon.svg"
          alt="Logo Fisiopasteur"
          width={28}
          height={28}
          className="w-7 h-7"
          />
      }
      message={
        <div className="text-left">
          <p className="text-[#9C1838] font-semibold mb-4 capitalize">
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
                  <TurnoCard
                    key={turno.id_turno}
                    turno={turno}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    getEstadoColor={getEstadoColor}
                    formatearHora={formatearHora}
                  />
                ))}
            </div>
          )}
        </div>
      }
    />
      {turnoEditando && (
        <EditarTurnoDialog
          turno={{
            id_turno: turnoEditando.id_turno,
            id_paciente: turnoEditando.id_paciente ?? 0,
            id_especialista: turnoEditando.id_especialista || null,
            id_especialidad: turnoEditando.id_especialidad || null,
            id_box: (turnoEditando as any).id_box ?? null,
            fecha: turnoEditando.fecha,
            hora: turnoEditando.hora,
            observaciones: turnoEditando.observaciones || null,
          }}
          open={Boolean(turnoEditando)}
          onClose={() => setTurnoEditando(null)}
          onSaved={(updated?: any) => {
            setTurnoEditando(null);
            if (updated) {
              updateTurno(turnoEditando.id_turno, updated);
              setTurnosLocal(prev => prev.map(t => t.id_turno === turnoEditando.id_turno ? { ...t, ...updated } as any : t));
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
