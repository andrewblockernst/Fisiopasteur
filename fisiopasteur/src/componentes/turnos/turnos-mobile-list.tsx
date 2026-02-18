"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  User, 
  MapPin, 
  Phone,
  ChevronRight,
  Plus,
  Search,
  ArrowLeft,
  Filter,
  X
} from 'lucide-react';
import { NuevoTurnoModal } from '../calendario/nuevo-turno-dialog';
import type { TurnoConDetalles } from "@/stores/turno-store";
import type { Tables, EspecialistaWithSpecialties } from "@/types";

interface TurnosMobileListProps {
  turnos: TurnoConDetalles[];
  fecha: string;
  onDateChange: (date: string) => void;
  onTurnoCreated?: () => void;
  especialistas: EspecialistaWithSpecialties[];
  especialidades: Tables<"especialidad">[];
  initialFilters: {
    fecha_desde: string;
    fecha_hasta: string;
    especialista_id?: string;
    especialidad_id?: number;
    estado?: string;
  };
}

export default function TurnosMobileList({ 
  turnos, 
  fecha, 
  onDateChange, 
  onTurnoCreated,
  especialistas,
  especialidades,
  initialFilters
}: TurnosMobileListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNuevoTurnoModal, setShowNuevoTurnoModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState(initialFilters.fecha_desde);
  const [fechaHasta, setFechaHasta] = useState(initialFilters.fecha_hasta);
  const [especialistaId, setEspecialistaId] = useState(initialFilters.especialista_id || '');
  const [especialidadId, setEspecialidadId] = useState(initialFilters.especialidad_id?.toString() || '');
  const [filtroEstado, setFiltroEstado] = useState(initialFilters.estado || 'todos');

  // ✨ Función para calcular el número de talonario
  const calcularNumeroTalonario = useCallback((turno: TurnoConDetalles): string | null => {
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
  }, [turnos]);

  // Función para aplicar filtros (navegar con query params)
  const aplicarFiltros = useCallback(() => {
    const params = new URLSearchParams();
    
    if (fechaDesde) params.set('desde', fechaDesde);
    if (fechaHasta) params.set('hasta', fechaHasta);
    if (especialistaId) params.set('especialista', especialistaId);
    if (especialidadId) params.set('especialidad', especialidadId);
    if (filtroEstado !== 'todos') params.set('estado', filtroEstado);
    
    router.push(`/turnos?${params.toString()}`);
    setShowFilters(false);
  }, [fechaDesde, fechaHasta, especialistaId, especialidadId, filtroEstado, router]);

  // Función para limpiar filtros y aplicar inmediatamente
  const limpiarFiltros = useCallback(() => {
    // Obtener fecha de hoy
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    
    // Navegar solo con la fecha de hoy (sin filtros)
    const params = new URLSearchParams();
    params.set('desde', hoy);
    params.set('hasta', hoy);
    
    router.push(`/turnos?${params.toString()}`);
    setShowFilters(false);
  }, [router]);

  // Contar filtros activos
  const contarFiltrosActivos = useMemo(() => {
    let count = 0;
    if (especialistaId) count++;
    if (especialidadId) count++;
    if (filtroEstado !== 'todos') count++;
    return count;
  }, [especialistaId, especialidadId, filtroEstado]);

  // Filtrar turnos por término de búsqueda (el filtrado por estado/especialista/etc se hace en el servidor)
  const turnosFiltrados = useMemo(() => {
    return turnos.filter(turno => {
      // Filtro de búsqueda local
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const pacienteNombre = turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}`.toLowerCase() : '';
        const especialistaNombre = turno.especialista ? `${turno.especialista.nombre} ${turno.especialista.apellido}`.toLowerCase() : '';
        
        const matchesBusqueda = pacienteNombre.includes(searchLower) || especialistaNombre.includes(searchLower);
        if (!matchesBusqueda) return false;
      }
      
      return true;
    });
  }, [turnos, searchTerm]);

  // Agrupar turnos primero por fecha, luego por hora
  const turnosAgrupadosPorFecha = useMemo(() => {
    return turnosFiltrados.reduce((groups, turno) => {
      const fecha = turno.fecha;
      if (!groups[fecha]) {
        groups[fecha] = {};
      }
      
      const hora = turno.hora;
      if (!groups[fecha][hora]) {
        groups[fecha][hora] = [];
      }
      groups[fecha][hora].push(turno);
      
      return groups;
    }, {} as Record<string, Record<string, TurnoConDetalles[]>>);
  }, [turnosFiltrados]);

  // Ordenar fechas
  const fechasOrdenadas = useMemo(() => {
    return Object.keys(turnosAgrupadosPorFecha).sort();
  }, [turnosAgrupadosPorFecha]);

  const formatDate = useMemo( () => {
    return (fecha: string) => {
      const [year, month, day] = fecha.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('es-AR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };
  }, [])

  const formatTime = useMemo(() => {
    return (hora: string) => {
      const [hours, minutes] = hora.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    };
  }, []);

  // Callback para manejar clicks en tarjetas de turno
  const handleTurnoClick = useCallback((turnoId: string) => {
    router.push(`/turnos/${turnoId}`);
  }, [router]);

  // Callbacks para los cambios de estado de filtros
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleFechaDesdeChange = useCallback((value: string) => {
    setFechaDesde(value);
  }, []);

  const handleFechaHastaChange = useCallback((value: string) => {
    setFechaHasta(value);
  }, []);

  const handleEspecialistaChange = useCallback((value: string) => {
    setEspecialistaId(value);
  }, []);

  const handleEspecialidadChange = useCallback((value: string) => {
    setEspecialidadId(value);
  }, []);

  const handleEstadoChange = useCallback((value: string) => {
    setFiltroEstado(value);
  }, []);

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
            onClick={() => setShowFilters(true)}
            className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 active:bg-neutral-100 transition-colors relative"
          >
            <Filter className="w-5 h-5" />
            {contarFiltrosActivos > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#9C1838] text-white rounded-full text-xs flex items-center justify-center font-bold">
                {contarFiltrosActivos}
              </span>
            )}
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por paciente o especialista..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
          />
        </div>
      </div>

      {/* Contenido */}
  <div className="px-4 pb-20 text-black">
        {fechasOrdenadas.length === 0 ? (
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
          <div className="space-y-8 pt-4">
            {fechasOrdenadas.map((fechaActual) => {
              const horasEnFecha = Object.keys(turnosAgrupadosPorFecha[fechaActual]).sort();
              const totalTurnosFecha = horasEnFecha.reduce((sum, hora) => sum + turnosAgrupadosPorFecha[fechaActual][hora].length, 0);
              
              return (
                <div key={fechaActual} className="space-y-4">
                  {/* Header de fecha */}
                  <div className="text-sm text-neutral-600 capitalize font-medium sticky top-16 bg-neutral-50 py-2 z-10">
                    {formatDate(fechaActual)} • {totalTurnosFecha} turno{totalTurnosFecha !== 1 ? 's' : ''}
                  </div>

                  {/* Turnos agrupados por hora para esta fecha */}
                  <div className="space-y-6">
                    {horasEnFecha.map((hora) => (
                      <div key={`${fechaActual}-${hora}`} className="space-y-3">
                        {/* Header de hora */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center min-w-[80px] px-3 h-8 bg-[#9C1838] text-white rounded-lg text-sm font-medium whitespace-nowrap">
                            {formatTime(hora)}
                          </div>
                          <div className="flex-1 h-px bg-neutral-200" />
                        </div>

                        {/* Turnos para esta hora */}
                        <div className="space-y-3">
                          {turnosAgrupadosPorFecha[fechaActual][hora].map((turno) => (
                            <TurnoCard 
                              key={turno.id_turno} 
                              turno={turno}
                              numeroTalonario={calcularNumeroTalonario(turno)}
                              onClick={() => handleTurnoClick(turno.id_turno)} 
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel de Filtros - Drawer desde abajo */}
      {showFilters && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setShowFilters(false)}
          />
          
          {/* Panel de filtros */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 shadow-2xl transition-transform duration-300 ease-out"
            style={{ animation: 'slide-up 0.3s ease-out' }}>
            <style jsx>{`
              @keyframes slide-up {
                from {
                  transform: translateY(100%);
                }
                to {
                  transform: translateY(0);
                }
              }
            `}</style>
            {/* Header del panel */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenido del panel */}
            <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {/* Filtros de Fecha */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Rango de Fechas
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Desde</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => handleFechaDesdeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => handleFechaHastaChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Filtro por Especialista */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Especialista
                </label>
                <select
                  value={especialistaId}
                  onChange={(e) => handleEspecialistaChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                >
                  <option value="">Todos los especialistas</option>
                  {especialistas.map((esp) => (
                    <option key={esp.id_usuario} value={esp.id_usuario}>
                      {esp.apellido}, {esp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Especialidad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Especialidad
                </label>
                <select
                  value={especialidadId}
                  onChange={(e) => handleEspecialidadChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                >
                  <option value="">Todas las especialidades</option>
                  {especialidades
                    .filter(esp => !esp.nombre?.toLowerCase().includes('pilates'))
                    .map((esp) => (
                      <option key={esp.id_especialidad} value={esp.id_especialidad}>
                        {esp.nombre}
                      </option>
                    ))}
                </select>
              </div>

              {/* Filtro por Estado */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estado del Turno
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEstadoChange('todos')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroEstado === 'todos'
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => handleEstadoChange('programado')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroEstado === 'programado'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    Programado
                  </button>
                  <button
                    onClick={() => handleEstadoChange('pendiente')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroEstado === 'pendiente'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    Pendiente
                  </button>
                  <button
                    onClick={() => handleEstadoChange('atendido')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroEstado === 'atendido'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    Atendido
                  </button>
                  <button
                    onClick={() => handleEstadoChange('cancelado')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroEstado === 'cancelado'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    Cancelado
                  </button>
                </div>
              </div>

              {/* Resumen de filtros activos */}
              {contarFiltrosActivos > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-1">Filtros activos:</p>
                  <div className="space-y-1 text-xs text-blue-800">
                    {especialistaId && (
                      <div>• Especialista: {especialistas.find(e => e.id_usuario === especialistaId)?.apellido}</div>
                    )}
                    {especialidadId && (
                      <div>• Especialidad: {especialidades.find(e => e.id_especialidad === parseInt(especialidadId))?.nombre}</div>
                    )}
                    {filtroEstado !== 'todos' && (
                      <div>• Estado: {filtroEstado.charAt(0).toUpperCase() + filtroEstado.slice(1)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer del panel */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={limpiarFiltros}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={aplicarFiltros}
                className="flex-1 px-4 py-2 bg-[#9C1838] text-white rounded-lg font-medium hover:bg-[#7D1329] transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}

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
        onTurnoCreated={onTurnoCreated}
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
  turno: TurnoConDetalles; 
  numeroTalonario: string | null;
  onClick: () => void;
}) {
  const getEstadoColor = useMemo(() => (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'programado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pendiente':
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
  }, []);

  const getCardBackgroundColor = useMemo(() => (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'vencido':
        return 'bg-yellow-50';
      case 'atendido':
        return 'bg-green-50';
      case 'cancelado':
        return 'bg-red-50';
      default:
        return 'bg-white';
    }
  }, []);

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
          </div>

          {/* Estado */}
          <div className="flex justify-end mt-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getEstadoColor(turno.estado || 'programado')}`}>
              {(turno.estado || 'programado').replace('_', ' ').toUpperCase()}
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