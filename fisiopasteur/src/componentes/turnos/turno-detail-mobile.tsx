"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  FileText,
  Edit3,
  Trash2
} from 'lucide-react';
import type { TurnoConDetalles } from "@/stores/turno-store";
import { useInvalidateTurnos } from '@/hooks/useTurnosQuery';
import { cancelarTurno, marcarComoAtendido } from '@/lib/actions/turno.action';
import { useToastStore } from '@/stores/toast-store';
import Button from '../boton';
import EditarTurnoModal from './editar-turno-modal';
import { dayjs } from '@/lib/dayjs';

interface TurnoDetailMobileProps {
  turno: TurnoConDetalles;
  numeroTalonario?: string | null;
}

export default function TurnoDetailMobile({ turno, numeroTalonario }: TurnoDetailMobileProps) {
  const router = useRouter();
  const invalidateTurnos = useInvalidateTurnos();
  const { addToast } = useToastStore();
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMarcarComoAtendido = async () => {
    if (!turno?.id_turno || isSubmitting) return;

    setIsSubmitting(true);
    const resultado = await marcarComoAtendido(turno.id_turno);

    if (resultado.success) {
      addToast({
        variant: 'success',
        message: 'Turno marcado como atendido',
      });
      invalidateTurnos({ scope: 'statuses', statuses: ['programado', 'pendiente', 'atendido'] });
      invalidateTurnos({ scope: 'dates', date: turno.fecha });
      router.refresh();
    } else {
      addToast({
        variant: 'error',
        message: resultado.error || 'Error al marcar turno como atendido',
      });
    }

    setIsSubmitting(false);
  };

  const handleCancelarTurno = async () => {
    if (!turno?.id_turno || isSubmitting) return;

    setIsSubmitting(true);
    const resultado = await cancelarTurno(turno.id_turno);

    if (resultado.success) {
      addToast({
        variant: 'success',
        message: 'Turno cancelado',
      });
      invalidateTurnos({ scope: 'statuses', statuses: ['programado', 'pendiente', 'cancelado'] });
      invalidateTurnos({ scope: 'dates', date: turno.fecha });
      router.refresh();
    } else {
      addToast({
        variant: 'error',
        message: resultado.error || 'Error al cancelar turno',
      });
    }

    setIsSubmitting(false);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'programado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vencido':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'atendido':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'en_curso':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completado':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_asistio':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (fecha: string) => {
    return dayjs(fecha).format('dddd D [de] MMMM [de] YYYY');
  };

  const formatTime = (hora: string) => {
    return dayjs(hora, 'HH:mm:ss').format('hh:mm A');
  };

  return (
  <div className="min-h-screen bg-neutral-50 text-black">
      {/* Header */}
  <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 text-black">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-md hover:bg-neutral-100 active:scale-95 transition"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Detalle del Turno</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setModalEditarAbierto(true)}
              className="p-2 text-[#9C1838] hover:bg-neutral-100 rounded-md transition"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
  <div className="px-4 py-6 space-y-6 text-black">
        {/* Estado del turno */}
        <div className="text-center space-y-3">
          <span className={`inline-block px-4 py-2 rounded-xl text-sm font-medium border ${getEstadoColor(turno.estado || 'programado')}`}>
            {(turno.estado || 'programado').replace('_', ' ').toUpperCase()}
          </span>
          
          {/* Número de talonario si existe */}
          {numeroTalonario && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg border border-blue-200">
                📋 Paquete: Turno {numeroTalonario}
              </span>
            </div>
          )}
        </div>

        {/* Fecha y Hora */}
        <div className="bg-white rounded-xl p-6 border border-neutral-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Fecha y Hora</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#9C1838]" />
              <div>
                <p className="font-medium text-gray-900 capitalize">{formatDate(turno.fecha)}</p>
                <p className="text-sm text-gray-500">{turno.fecha}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#9C1838]" />
              <div>
                <p className="font-medium text-gray-900">{formatTime(turno.hora)}</p>
                <p className="text-sm text-gray-500">Duración estimada: 45 min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Paciente */}
        {turno.paciente && (
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Paciente</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#9C1838]" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {turno.paciente.nombre} {turno.paciente.apellido}
                  </p>
                  {turno.paciente.dni && (
                    <p className="text-sm text-gray-500">DNI: {turno.paciente.dni}</p>
                  )}
                </div>
              </div>
              
              {turno.paciente.telefono && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#9C1838]" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{turno.paciente.telefono}</p>
                    <div className="flex gap-2 mt-1">
                      <button className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-lg">
                        Llamar
                      </button>
                      <button className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {turno.paciente.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#9C1838]" />
                  <p className="text-sm text-gray-600">{turno.paciente.email}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Especialista */}
        {turno.especialista && (
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Especialista</h2>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: turno.especialista.color || '#9C1838' }}
              >
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {turno.especialista.nombre} {turno.especialista.apellido}
                </p>
                {turno.especialidad && (
                  <p className="text-sm text-gray-500">{turno.especialidad.nombre}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ubicación */}
        {turno.box && (
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Ubicación</h2>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#9C1838]" />
              <div>
                <p className="font-medium text-gray-900">Box {turno.box.numero}</p>
                <p className="text-sm text-gray-500">Consultorio médico</p>
              </div>
            </div>
          </div>
        )}

        {/* Observaciones */}
        {turno.observaciones && (
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Observaciones</h2>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-[#9C1838] mt-0.5" />
              <p className="text-gray-700 leading-relaxed">{turno.observaciones}</p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-3 pt-4">
          
            <>
            {turno.estado === 'programado' || turno.estado === 'pendiente' && (
              <Button
                className="w-full flex items-center justify-center"
                onClick={handleMarcarComoAtendido}
                disabled={isSubmitting}
              >
                <Clock className="w-5 h-5" />
                {isSubmitting ? 'Procesando...' : 'Marcar como atendido'}
              </Button>
            )}
              
                <Button
                  className='flex items-center justify-center w-full'
                  onClick={handleCancelarTurno}
                  disabled={isSubmitting || turno.estado === 'cancelado'} //  || turno.estado === 'atendido'
                >
                  <Trash2 className="w-5 h-5" />
                  {isSubmitting ? 'Procesando...' : 'Cancelar Turno'}
                </Button>
            </>
          
        </div>
      </div>

      {/* Modal de Edición */}
      {modalEditarAbierto && (
        <EditarTurnoModal
          turno={turno as any}
          open={modalEditarAbierto}
          onClose={() => setModalEditarAbierto(false)}
          onSaved={(updated) => {
            setModalEditarAbierto(false);
            const fechaAnterior = turno.fecha;
            const fechaNueva = updated?.fecha || turno.fecha;

            // Invalidar las listas para la fecha anterior y la nueva por si el turno cambió de día.
            invalidateTurnos({ scope: 'dates', date: fechaAnterior });
            if (fechaNueva !== fechaAnterior) {
              invalidateTurnos({ scope: 'dates', date: fechaNueva });
            }
            invalidateTurnos({ scope: 'lists' });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}