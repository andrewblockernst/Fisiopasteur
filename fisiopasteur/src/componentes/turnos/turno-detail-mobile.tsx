"use client";

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
import type { TurnoWithRelations } from "@/types/database.types";
import Button from '../boton';

interface TurnoDetailMobileProps {
  turno: TurnoWithRelations;
}

export default function TurnoDetailMobile({ turno }: TurnoDetailMobileProps) {
  const router = useRouter();

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'programado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (hora: string) => {
    const [hours, minutes] = hora.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
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
              onClick={() => router.push(`/turnos/${turno.id_turno}/editar`)}
              className="p-2 text-[#9C1838] hover:bg-neutral-100 rounded-md transition"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="px-4 py-6 space-y-6">
        {/* Estado del turno */}
        <div className="text-center">
          <span className={`inline-block px-4 py-2 rounded-xl text-sm font-medium border ${getEstadoColor(turno.estado || 'programado')}`}>
            {(turno.estado || 'programado').replace('_', ' ').toUpperCase()}
          </span>
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
                <p className="text-sm text-gray-500">Duración est imada: 45 min</p>
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
          {turno.estado === 'programado' && (
            <>
              <Button className="w-full flex items-center justify-center">
                <Clock className="w-5 h-5" />
                Marcar en Curso
              </Button>
              
                <Button className='flex items-center justify-center w-full'>
                <Trash2 className="w-5 h-5" />
                Cancelar Turno
                </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}