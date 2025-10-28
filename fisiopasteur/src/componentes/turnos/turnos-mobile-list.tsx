"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  User, 
  MapPin, 
  Phone,
  ChevronRight,
  Plus,
  Filter,
  Search,
  ArrowLeft
} from 'lucide-react';
import { NuevoTurnoModal } from '../calendario/nuevo-turno-dialog';
import type { TurnoWithRelations } from "@/types/database.types";

interface TurnosMobileListProps {
  turnos: TurnoWithRelations[];
  fecha: string;
  onDateChange: (date: string) => void;
  onTurnoCreated?: () => void;
}

export default function TurnosMobileList({ turnos, fecha, onDateChange, onTurnoCreated }: TurnosMobileListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNuevoTurnoModal, setShowNuevoTurnoModal] = useState(false);

  // ✨ Función para calcular el número de talonario
  const calcularNumeroTalonario = (turno: TurnoWithRelations): string | null => {
    if (!turno.id_paciente || !turno.id_especialidad) return null;

    // Filtrar turnos del mismo paciente y especialidad (sin importar mes/año)
    const turnosMismoPaquete = turnos.filter(t => 
      t.id_paciente === turno.id_paciente &&
      t.id_especialidad === turno.id_especialidad &&
      t.estado !== 'cancelado' // Excluir cancelados del conteo
    );

    // Si solo hay un turno, no mostrar número
    if (turnosMismoPaquete.length <= 1) return null;

    // Ordenar por fecha y hora
    const turnosOrdenados = [...turnosMismoPaquete].sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T${a.hora}`);
      const fechaB = new Date(`${b.fecha}T${b.hora}`);
      return fechaA.getTime() - fechaB.getTime();
    });

    // Encontrar la posición del turno actual
    const posicion = turnosOrdenados.findIndex(t => t.id_turno === turno.id_turno) + 1;
    const total = turnosOrdenados.length;

    return `${posicion}/${total}`;
  };

  // Filtrar turnos por término de búsqueda
  const turnosFiltrados = turnos.filter(turno => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const pacienteNombre = turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}`.toLowerCase() : '';
    const especialistaNombre = turno.especialista ? `${turno.especialista.nombre} ${turno.especialista.apellido}`.toLowerCase() : '';
    
    return pacienteNombre.includes(searchLower) || especialistaNombre.includes(searchLower);
  });

  // Agrupar turnos por hora
  const turnosAgrupados = turnosFiltrados.reduce((groups, turno) => {
    const hora = turno.hora;
    if (!groups[hora]) {
      groups[hora] = [];
    }
    groups[hora].push(turno);
    return groups;
  }, {} as Record<string, TurnoWithRelations[]>);

  // Ordenar horas
  const horasOrdenadas = Object.keys(turnosAgrupados).sort();

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
  <div className="min-h-screen bg-neutral-50 text-black">
      {/* Header fijo - Estilo similar al perfil */}
  <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 text-black">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <div className="flex-1 flex justify-center">
            <h1 className="text-lg text-black text-center">Turnos</h1>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
  <div className="px-4 py-3 text-black">

        {/* Selector de fecha */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <input
              type="date"
              value={fecha}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por paciente o especialista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
          />
        </div>

        {/* Info de fecha */}
        <div className="mt-3 text-sm text-neutral-600 capitalize">
          {formatDate(fecha)} • {turnosFiltrados.length} turnos
        </div>
      </div>

      {/* Contenido */}
  <div className="px-4 pb-20 text-black">
        {horasOrdenadas.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-700 mb-2">
              {searchTerm ? 'No se encontraron resultados' : 'No hay turnos programados'}
            </h3>
            <p className="text-neutral-500 mb-6">
              {searchTerm ? 'Prueba con otro término de búsqueda' : `No tienes turnos para ${formatDate(fecha)}`}
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {horasOrdenadas.map((hora) => (
              <div key={hora} className="space-y-3">
                {/* Header de hora */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center min-w-[80px] px-3 h-8 bg-[#9C1838] text-white rounded-lg text-sm font-medium whitespace-nowrap">
                    {formatTime(hora)}
                  </div>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>

                {/* Turnos para esta hora */}
                <div className="space-y-3">
                  {turnosAgrupados[hora].map((turno) => (
                    <TurnoCard 
                      key={turno.id_turno} 
                      turno={turno}
                      numeroTalonario={calcularNumeroTalonario(turno)}
                      onClick={() => router.push(`/turnos/${turno.id_turno}`)} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón flotante para agregar turno */}
      <button
        onClick={() => setShowNuevoTurnoModal(true)}
        className="fixed bottom-25 right-6 w-14 h-14 bg-[#9C1838] hover:bg-[#7D1329] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 z-50 flex items-center justify-center"
        aria-label="Agregar nuevo turno"
      >
        <Plus size={30} />
      </button>

      {/* Modal de Nuevo Turno */}
      <NuevoTurnoModal
        isOpen={showNuevoTurnoModal}
        onClose={() => setShowNuevoTurnoModal(false)}
        onTurnoCreated={() => {
          setShowNuevoTurnoModal(false);
          if (onTurnoCreated) onTurnoCreated();
        }}
        fechaSeleccionada={new Date(fecha)}
      />
    </div>
  );
}

function TurnoCard({ 
  turno, 
  numeroTalonario,
  onClick 
}: { 
  turno: TurnoWithRelations; 
  numeroTalonario: string | null;
  onClick: () => void;
}) {
  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'programado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vencido':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

  const getCardBackgroundColor = (estado: string) => {
    if (estado.toLowerCase() === 'vencido') {
      return 'bg-yellow-50';
    }
    return 'bg-white';
  };

  return (
    <div
      onClick={onClick}
      className={`${getCardBackgroundColor(turno.estado || 'programado')} rounded-xl border border-neutral-200 p-4 hover:shadow-md transition-shadow cursor-pointer`}
    >
      {/* Header del turno */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <User className="w-4 h-4 text-[#9C1838]" />
            <span className="font-semibold text-gray-900">
              {turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}` : 'Sin paciente'}
            </span>
            {/* Badge de talonario */}
            {numeroTalonario && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-md border border-blue-200">
                📋 {numeroTalonario}
              </span>
            )}
          </div>
          {turno.paciente?.dni && (
            <p className="text-sm text-neutral-600">DNI: {turno.paciente.dni}</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-neutral-400 ml-2" />
      </div>

      {/* Especialista */}
      {turno.especialista && (
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: turno.especialista.color || '#9C1838' }}
          />
          <span className="text-sm text-neutral-700">
            {turno.especialista.nombre} {turno.especialista.apellido}
          </span>
          {turno.especialidad && (
            <span className="text-sm text-neutral-500">• {turno.especialidad.nombre}</span>
          )}
        </div>
      )}

      {/* Detalles adicionales */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          {turno.box && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>Box {turno.box.numero}</span>
            </div>
          )}
          {turno.paciente?.telefono && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{turno.paciente.telefono}</span>
            </div>
          )}
        </div>
        
        {/* Estado */}
        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getEstadoColor(turno.estado || 'programado')}`}>
          {turno.estado === 'vencido' ? '⚠️ VENCIDO' : (turno.estado || 'programado').replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Observaciones */}
      {turno.observaciones && (
        <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
          <p className="text-sm text-neutral-700">{turno.observaciones}</p>
        </div>
      )}
    </div>
  );
}