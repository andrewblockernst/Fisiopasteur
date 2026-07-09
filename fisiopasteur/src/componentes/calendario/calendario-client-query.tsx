'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarioTurnos, type VistaCalendario } from "@/componentes/calendario/calendario-turnos";
import { DayViewModal } from "@/componentes/calendario/dia-vista-dialog";
import NuevoTurnoModal from "@/componentes/calendario/nuevo-turno-dialog";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { ArrowLeft, Plus } from "lucide-react";
import { EspecialistaMultiSelect } from "@/componentes/calendario/especialista-multi-select";
import { useRouter } from "next/navigation";
import UnifiedSkeletonLoader from "@/componentes/unified-skeleton-loader";
import { PageHeader } from "@/componentes/ui";
import { useTurnos, useInvalidateTurnos, usePrefetchTurnos } from "@/hooks/useTurnosQuery";

interface CalendarioClientQueryProps {
  especialistas: any[];
  initialEspecialistasFiltro?: string[];
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

  // Padding de 7 días a cada lado del bloque trimestral.
  // La vista semana puede mostrar una semana que CRUZA el borde del bloque
  // (ej. la semana del 28/06 llega al 04/07, fuera del bloque Abr-Jun), y esos
  // días quedaban sin datos. Una semana se extiende como máximo 6 días más allá
  // del día de referencia, así que 7 días de margen la cubren entera. El rango
  // sigue siendo determinístico por bloque, por lo que el cacheo no se rompe.
  primerDiaVentana.setDate(primerDiaVentana.getDate() - 7);
  ultimoDiaVentana.setDate(ultimoDiaVentana.getDate() + 7);

  return {
    fecha_desde: formatDateISO(primerDiaVentana),
    fecha_hasta: formatDateISO(ultimoDiaVentana),
  };
};

export function CalendarioClientQuery({
  especialistas,
  initialEspecialistasFiltro = [],
  // pacientes
}: CalendarioClientQueryProps) {
  const router = useRouter();

  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTurnos, setSelectedDayTurnos] = useState<TurnoConDetalles[]>([]);
  const [especialistasFiltro, setEspecialistasFiltro] = useState<string[]>(initialEspecialistasFiltro);
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
      especialista_ids: especialistasFiltro.length > 0 ? especialistasFiltro : undefined,
    };
  }, [fechaVisible, especialistasFiltro]);
  
  // ✅ React Query - obtener turnos con caché
  // refetchOnMount: true para que, al volver a /calendario después de crear un turno
  // en otra ruta (ej. /turnos), la query invalidada se refetchee al montarse.
  const { data: turnos = [], isLoading: turnosLoading } = useTurnos({ filters, refetchOnMount: true });
  const invalidateTurnos = useInvalidateTurnos();
  const prefetchTurnos = usePrefetchTurnos();

  // Efecto para mostrar skeleton loader en la carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 400);
    
    return () => clearTimeout(timer);
  }, []);

  // Prefetch ventanas adyacentes para navegación rápida (mes/día/semana)
  useEffect(() => {
    const prevRange = getCacheWindowRange(fechaVisible, -1);
    const nextRange = getCacheWindowRange(fechaVisible, 1);

    const base = especialistasFiltro.length > 0 ? { especialista_ids: especialistasFiltro } : {};

    prefetchTurnos({ ...prevRange, ...base });
    prefetchTurnos({ ...nextRange, ...base });
  }, [fechaVisible, especialistasFiltro, prefetchTurnos]);

  // Handler para volver (mobile)
  const handleBack = () => {
    router.push('/inicio');
  };

  const handleCreateTurno = () => {
    setIsCreateModalOpen(true);
  };

  const handleSuccessfulTurnoCreation = () => {
    // Invalidar TODAS las listas: un paquete de sesiones puede crear turnos
    // en semanas/meses futuros y `scope: 'dates'` solo refrescaría la ventana
    // que contiene la fecha base, dejando las demás stale hasta un refetch
    // manual / recarga.
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
    <div className="h-[calc(100dvh-5rem)] lg:h-[100dvh] flex flex-col text-foreground overflow-hidden">
      {/* Mobile Header */}
      <header className="shrink-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 lg:hidden">
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

      {/* Mobile Filter */}
      <div className="shrink-0 lg:hidden px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        <EspecialistaMultiSelect
          especialistas={especialistas}
          seleccionados={especialistasFiltro}
          onChange={setEspecialistasFiltro}
          compact
          disabled={initialEspecialistasFiltro.length > 0 && especialistas.length <= 1}
        />
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 min-h-0 flex flex-col mx-auto w-full bg-background p-2 lg:p-6 lg:px-8 lg:pt-6">
        {/* Desktop Header */}
        <div className="hidden lg:block shrink-0">
          <PageHeader title="Calendario" />
        </div>

        <div className="flex-1 min-h-0 rounded-lg flex flex-col">
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
            especialistasSeleccionados={especialistasFiltro}
            onEspecialistasChange={setEspecialistasFiltro}
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
        especialistaPreseleccionado={especialistasFiltro.length === 1 ? especialistasFiltro[0] : null}
        especialistas={especialistas}
        // pacientes={pacientes}
        onTurnoCreated={handleSuccessfulTurnoCreation}
      />

      {/* Botón flotante para agregar turno - Solo móvil */}
      <button
        onClick={handleCreateTurno}
        className="fixed bottom-25 right-6 w-14 h-14 bg-[#9C1838] hover:bg-[#7D1329] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 z-50 flex items-center justify-center lg:hidden"
        aria-label="Agregar nuevo turno"
      >
        <Plus size={30} />
      </button>
    </div>
  );
}

export default CalendarioClientQuery;
