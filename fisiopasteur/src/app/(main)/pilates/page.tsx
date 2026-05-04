'use client'
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import PilatesCalendarioSemanal from "@/componentes/pilates/componenteSemanal";
import { NuevoTurnoPilatesModal } from "@/componentes/pilates/nuevoTurnoPilatesDialog";
import { DetalleClaseModal } from "@/componentes/pilates/detalleClaseModal";
import { obtenerEspecialistasPilates, obtenerPacientes } from "@/lib/actions/turno.action";
import { getIdPilates } from "@/lib/constants/especialidades";
import UnifiedSkeletonLoader from "@/componentes/unified-skeleton-loader";
import { usePilatesTurnos, useInvalidatePilatesTurnos, usePrefetchPilatesTurnos, getCacheWindowRange } from "@/hooks/usePilatesTurnosQuery";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { useAuth } from "@/hooks/usePerfil";

interface SlotInfo {
  disponible: boolean;
  razon: string;
  tipo: 'libre' | 'existente' | 'completa';
  especialistaAsignado?: string;
  participantes?: number;
}

const formatDateISO = (date: Date) => date.toISOString().split('T')[0];

export default function PilatesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // ============= ESTADOS PARA MODALES =============
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTurnos, setSelectedDayTurnos] = useState<TurnoConDetalles[]>([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>("");

  // ============= ESTADOS GENERALES =============
  // const [especialistaFiltro, setEspecialistaFiltro] = useState<string>("");
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fechaVisible, setFechaVisible] = useState<Date>(new Date());
  const [idPilates, setIdPilates] = useState<number | null>(null);
  const puedeGestionarTurnos = Boolean(user?.puedeGestionarTurnos);
  const currentUserId = user?.id_usuario ?? user?.id ?? null;
  const userRole = puedeGestionarTurnos ? 1 : 2;

  // ============= CALCULAR RANGO DE FECHAS PARA CACHÉ =============
  const filters = useMemo(() => {
    const range = getCacheWindowRange(fechaVisible);

    return {
      ...range,
      especialidad_ids: idPilates ? [String(idPilates)] : undefined,
      // especialista_ids: especialistaFiltro ? [especialistaFiltro] : undefined,
    };
  }, [fechaVisible, idPilates]); // especialistaFiltro

  // ============= REACT QUERY - OBTENER TURNOS CON CACHÉ =============
  const { data: turnos = [], isLoading: turnosLoading } = usePilatesTurnos({ 
    filters,
    enabled: idPilates !== null
  });
  const invalidatePilatesTurnos = useInvalidatePilatesTurnos();
  const prefetchPilatesTurnos = usePrefetchPilatesTurnos();

  // ============= CREAR MAPA DE TURNOS POR SLOT PARA VALIDACIÓN =============
  const turnosPorSlot = useMemo(() => {
    const map = new Map<string, number>();
    turnos.forEach(turno => {
      const key = `${turno.fecha}:${turno.hora?.substring(0, 5)}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [turnos]);

  // ============= EFECTO PARA MOSTRAR SKELETON EN CARGA INICIAL =============
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // ============= CARGAR DATOS INICIALES =============
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar especialistas de Pilates
        const resEspecialistas = await obtenerEspecialistasPilates();
        if (resEspecialistas.success && Array.isArray(resEspecialistas.data)) {
          const especialistasPilates = resEspecialistas.data;

          // Obtener el ID de Pilates
          const todasEspecialidades = especialistasPilates.flatMap((e: any) =>
            (e.usuario_especialidad || []).map((ue: any) => ue.especialidad)
          );
          const pilatesId = getIdPilates(todasEspecialidades);
          setIdPilates(pilatesId);

          setEspecialistas(especialistasPilates);
        }

        // Cargar pacientes
        const resPacientes = await obtenerPacientes();
        if (resPacientes.success && Array.isArray(resPacientes.data)) {
          setPacientes(resPacientes.data);
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      }
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    if (authLoading || !currentUserId) return; //|| especialistaFiltro
    const esEspecialistaActivo = especialistas.some((esp) =>
      String(esp.id_usuario) === String(currentUserId)
    );
    // if (!puedeGestionarTurnos && esEspecialistaActivo) {
    //   setEspecialistaFiltro(String(currentUserId));
    // }
  }, [authLoading, currentUserId, especialistas, puedeGestionarTurnos]); // especialistaFiltro

  // ============= PREFETCH AUTOMÁTICO DE BLOQUES ADYACENTES =============
  useEffect(() => {
    const prevRange = getCacheWindowRange(fechaVisible, -1);
    const nextRange = getCacheWindowRange(fechaVisible, 1);

    const base = {
      especialidad_ids: idPilates ? [String(idPilates)] : undefined,
      // ...(especialistaFiltro ? { especialista_ids: [especialistaFiltro] } : {}),
    };

    prefetchPilatesTurnos({ ...prevRange, ...base });
    prefetchPilatesTurnos({ ...nextRange, ...base });
  }, [fechaVisible, idPilates, prefetchPilatesTurnos]);// especialistaFiltro

  // ============= HANDLERS =============
  const handleBack = () => {
    router.push('/inicio');
  };

  const handleCreateTurno = () => {
    setSelectedDate(null);
    setHoraSeleccionada('');
    setIsCreateModalOpen(true);
  };

  const handleAgregarTurnoSlot = (dia: Date, horario: string) => {
    setSelectedDate(dia);
    setHoraSeleccionada(horario);
    setIsCreateModalOpen(true);
  };

  const handleSuccessfulTurnoCreation = () => {
    invalidatePilatesTurnos({ scope: 'lists' });
  };

  // ============= MOSTRAR SKELETON DURANTE CARGA INICIAL =============
  if (!idPilates || turnosLoading) {
    return (
      <UnifiedSkeletonLoader
        type="calendar"
        showHeader={true}
        showFilters={false}
      />
    );
  }

  // ============= RENDER PRINCIPAL =============
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
          <h1 className="text-lg font-semibold text-center flex-1">Pilates</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden sm:block">
        <div className="max-w-[1800px] mx-auto p-4 sm:p-6 lg:px-8 lg:pt-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <h2 className="text-2xl sm:text-3xl font-bold">Pilates</h2>
          </div>
        </div>
      </div>

      {/* Mobile Filter */}
      <div className="sm:hidden px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <select
            // value={especialistaFiltro}
            // onChange={(e) => setEspecialistaFiltro(e.target.value)}
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
          <PilatesCalendarioSemanal
            turnos={turnos}
            semanaBase={fechaVisible}
            onSemanaChange={setFechaVisible}
            onAgregarTurno={handleAgregarTurnoSlot}
            onNuevoTurno={handleCreateTurno}
            onVerTurno={(turnos) => {
              setSelectedDayTurnos(turnos);
              setIsDayModalOpen(true);
            }}
            especialistas={especialistas}
          />
        </div>
      </div>

      {/* Modal de crear turno */}
      <NuevoTurnoPilatesModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setHoraSeleccionada('');
          setSelectedDate(null);
        }}
        fechaSeleccionada={selectedDate}
        horaSeleccionada={horaSeleccionada}
        especialistas={especialistas}
        pacientes={pacientes}
        turnosPorSlot={turnosPorSlot}
        onTurnoCreated={handleSuccessfulTurnoCreation}
        userRole={userRole}
        puedeGestionarTurnos={puedeGestionarTurnos}
        currentUserId={currentUserId ? String(currentUserId) : undefined}
      />

      {/* Modal de detalles de clase existente */}
      <DetalleClaseModal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        onTurnosActualizados={async () => {
          invalidatePilatesTurnos({ scope: 'lists' });
        }}
        turnos={selectedDayTurnos}
        especialistas={especialistas}
        pacientes={pacientes}
        userRole={userRole}
        puedeGestionarTurnos={puedeGestionarTurnos}
        currentUserId={currentUserId ? String(currentUserId) : undefined}
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
