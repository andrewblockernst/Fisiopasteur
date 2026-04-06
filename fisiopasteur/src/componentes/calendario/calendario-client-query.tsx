'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarioTurnos, type VistaCalendario } from "@/componentes/calendario/calendario-turnos";
import { DayViewModal } from "@/componentes/calendario/dia-vista-dialog";
import NuevoTurnoModal from "@/componentes/calendario/nuevo-turno-dialog";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { useAuth } from "@/hooks/usePerfil";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import UnifiedSkeletonLoader from "@/componentes/unified-skeleton-loader";
import { useTurnos, useInvalidateTurnos, usePrefetchTurnos } from "@/hooks/useTurnosQuery";

interface CalendarioClientQueryProps {
  especialistas: any[];
  // pacientes: any[];
}

// Cantidad de meses por bloque de cache (ajustable).
// Con 3, cada key cubre 3 meses contiguos y evita solapamientos redundantes.
const WINDOW_MONTHS = 3;

const formatDateISO = (date: Date) => date.toISOString().split('T')[0];

const getCacheWindowRange = (fechaVisible: Date, blockOffset = 0) => {
  // Normaliza por bloques no solapados para reutilizar cache entre meses adyacentes.
  const monthIndex = fechaVisible.getFullYear() * 12 + fechaVisible.getMonth();
  const baseBlockStartIndex = Math.floor(monthIndex / WINDOW_MONTHS) * WINDOW_MONTHS;
  const blockStartIndex = baseBlockStartIndex + blockOffset * WINDOW_MONTHS;

  const startYear = Math.floor(blockStartIndex / 12);
  const startMonth = blockStartIndex % 12;
  const endIndexExclusive = blockStartIndex + WINDOW_MONTHS;
  const endYear = Math.floor(endIndexExclusive / 12);
  const endMonth = endIndexExclusive % 12;

  const primerDiaVentana = new Date(startYear, startMonth, 1);
  const ultimoDiaVentana = new Date(endYear, endMonth, 0);

  return {
    fecha_desde: formatDateISO(primerDiaVentana),
    fecha_hasta: formatDateISO(ultimoDiaVentana),
  };
};

export function CalendarioClientQuery({ 
  especialistas, 
  // pacientes 
}: CalendarioClientQueryProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTurnos, setSelectedDayTurnos] = useState<TurnoConDetalles[]>([]);
  const [especialistaFiltro, setEspecialistaFiltro] = useState<string>("");
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [vistaCalendario, setVistaCalendario] = useState<VistaCalendario>('mes');
  const [fechaVisible, setFechaVisible] = useState<Date>(new Date());

  const handleViewContextChange = useCallback(({ vista, fecha }: { vista: VistaCalendario; fecha: Date }) => {
    setVistaCalendario((prev) => (prev === vista ? prev : vista));
    setFechaVisible((prev) => (prev.getTime() === fecha.getTime() ? prev : fecha));
  }, []);

  const filters = useMemo(() => {
    const range = getCacheWindowRange(fechaVisible);

    return {
      ...range,
      especialista_ids: especialistaFiltro ? [especialistaFiltro] : undefined,
    };
  }, [fechaVisible, especialistaFiltro]);
  
  // ✅ React Query - obtener turnos con caché
  const { data: turnos = [], isLoading: turnosLoading } = useTurnos({ filters });
  const invalidateTurnos = useInvalidateTurnos();
  const prefetchTurnos = usePrefetchTurnos();

  // Efecto para mostrar skeleton loader en la carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 400);
    
    return () => clearTimeout(timer);
  }, []);

  // Aplicar filtro automático por especialista al cargar
  useEffect(() => {
    if (!authLoading && user && !especialistaFiltro) {
      const esEspecialistaActivo = especialistas?.some((esp: any) => esp.id_usuario === user.id_usuario);
      // ✅ LÓGICA CORREGIDA: Admin y Programadores SIEMPRE pueden ver "Todos"
      const debeAplicarFiltro = !user.puedeGestionarTurnos && esEspecialistaActivo;
      
      if (debeAplicarFiltro && user.id_usuario) {
        setEspecialistaFiltro(user.id_usuario);
      }
    }
  }, [user, authLoading, especialistas, especialistaFiltro]);

  // Prefetch ventanas adyacentes para navegación rápida (mes/día/semana)
  useEffect(() => {
    const prevRange = getCacheWindowRange(fechaVisible, -1);
    const nextRange = getCacheWindowRange(fechaVisible, 1);

    const base = especialistaFiltro ? { especialista_ids: [especialistaFiltro] } : {};

    prefetchTurnos({ ...prevRange, ...base });
    prefetchTurnos({ ...nextRange, ...base });
  }, [fechaVisible, especialistaFiltro, prefetchTurnos]);

  // Handler para volver (mobile)
  const handleBack = () => {
    router.push('/inicio');
  };

  const handleCreateTurno = () => {
    setIsCreateModalOpen(true);
  };

  const handleSuccessfulTurnoCreation = () => {
    // ✅ Invalidar caché para refrescar los datos
    if (selectedDate) {
      invalidateTurnos({ scope: 'dates', date: formatDateISO(selectedDate) });
      return;
    }
    invalidateTurnos({ scope: 'lists' });
  };

  // ✅ Mostrar skeleton solo durante la carga inicial o mientras carga datos
  if (isInitialLoad || (turnosLoading && turnos.length === 0)) {
    return (
      <UnifiedSkeletonLoader 
        type="calendar" 
        showHeader={true} 
        showFilters={false}
      />
    );
  }

  return (
    <div className="min-h-screen text-black">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1">Calendario</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden sm:block">
        <div className="max-w-[1800px] mx-auto p-4 sm:p-6 lg:px-8 lg:pt-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <h2 className="text-2xl sm:text-3xl font-bold">Calendario</h2>
          </div>
        </div>
      </div>

      {/* Mobile Filter */}
      <div className="sm:hidden px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <select
            value={especialistaFiltro}
            onChange={(e) => setEspecialistaFiltro(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent bg-white"
          >
            <option value="">Todos los especialistas</option>
            {especialistas.map((especialista) => (
              <option key={especialista.id_usuario} value={especialista.id_usuario}>
                {especialista.apellido}, {especialista.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendario principal */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-0">
        <div className="rounded-lg">
          <CalendarioTurnos
            turnos={turnos}
            onDayClick={(date: Date, turnos: TurnoConDetalles[]) => {
              setSelectedDate(date);
              setSelectedDayTurnos(turnos);
              setIsDayModalOpen(true);
            }}
            onCreateTurno={(date: Date, hora?: string) => {
              setSelectedDate(date);
              setHoraSeleccionada(hora || '');
              setIsCreateModalOpen(true);
            }}
            setIsCreateModalOpen={setIsCreateModalOpen}
            especialistas={especialistas}
            especialistaSeleccionado={especialistaFiltro}
            onEspecialistaChange={setEspecialistaFiltro}
            vistaProp={vistaCalendario}
            onVistaChange={setVistaCalendario}
            onViewContextChange={handleViewContextChange}
          />
        </div>
      </div>

      {/* Modal de vista de día */}
      <DayViewModal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        fecha={selectedDate}
        turnos={selectedDayTurnos}
      />

      {/* Modal de crear turno */}
      <NuevoTurnoModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setHoraSeleccionada('');
        }}
        fechaSeleccionada={selectedDate}
        horaSeleccionada={horaSeleccionada}
        especialistaPreseleccionado={especialistaFiltro || null}
        especialistas={especialistas}
        // pacientes={pacientes}
        onTurnoCreated={handleSuccessfulTurnoCreation}
      />

      {/* Botón flotante para agregar turno - Solo móvil */}
      <button
        onClick={handleCreateTurno}
        className="fixed bottom-25 right-6 w-14 h-14 bg-[#9C1838] hover:bg-[#7D1329] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 z-50 flex items-center justify-center sm:hidden"
        aria-label="Agregar nuevo turno"
      >
        <Plus size={30} />
      </button>
    </div>
  );
}

export default CalendarioClientQuery;
