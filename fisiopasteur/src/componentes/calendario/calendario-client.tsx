"use client";

import React, { useState, useEffect } from "react";
import { CalendarioTurnos } from "@/componentes/calendario/calendario-turnos";
import { DayViewModal } from "@/componentes/calendario/dia-vista-dialog";
import NuevoTurnoModal from "@/componentes/calendario/nuevo-turno-dialog";
import { useTurnoStore, type TurnoConDetalles } from "@/stores/turno-store";
import { useToastStore } from "@/stores/toast-store";
import { useAuth } from "@/hooks/usePerfil";
import { Calendar, Users, Clock, ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "../boton";
import UnifiedSkeletonLoader from "@/componentes/unified-skeleton-loader";
import { moverTurno } from "@/lib/actions/turno.action";

interface CalendarioClientProps {
  turnosIniciales: TurnoConDetalles[];
  especialistas: any[];
  pacientes: any[];
}

const BRAND = '#9C1838';

export function CalendarioClient({ 
  turnosIniciales, 
  especialistas, 
  pacientes 
}: CalendarioClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTurnos, setSelectedDayTurnos] = useState<TurnoConDetalles[]>([]);
  const [especialistaFiltro, setEspecialistaFiltro] = useState<string>("");
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>("");
  const [goToTodaySignal, setGoToTodaySignal] = useState(0);
  const [vistaCalendario, setVistaCalendario] = useState<'mes' | 'semana' | 'dia'>('mes');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { 
    turnos, 
    loading, 
    setLoading, 
    setTurnos, 
    getTurnosHoy, 
    getTurnosProximos,
    getTurnosByDate
  } = useTurnoStore();
  
  const { showServerActionResponse } = useToastStore();

  // Inicializar el store con los datos del servidor
  useEffect(() => {
    setTurnos(turnosIniciales);
  }, [turnosIniciales, setTurnos]);

  // Efecto para mostrar skeleton loader en la carga inicial
  useEffect(() => {
    // Mostrar skeleton por 400ms en la primera carga
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 400);
    
    return () => clearTimeout(timer);
  }, []);

  // Aplicar filtro automático por especialista al cargar
  useEffect(() => {
    if (!authLoading && user && !especialistaFiltro) {
      // Verificar si el usuario es especialista activo
      const esEspecialistaActivo = especialistas?.some((esp: any) => esp.id_usuario === user.id_usuario);
      
      // Aplicar filtro si no es admin O si es admin pero también es especialista activo
      const debeAplicarFiltro = !user.esAdmin || (user.esAdmin && esEspecialistaActivo);
      
      if (debeAplicarFiltro && user.id_usuario) {
        setEspecialistaFiltro(user.id_usuario);
      }
    }
  }, [user, authLoading, especialistas]);

  // Handler para volver (mobile)
  const handleBack = () => {
    router.push('/inicio');
  };

  // Handlers para el calendario
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const turnosDelDia = getTurnosByDate(turnos, date);
    setSelectedDayTurnos(turnosDelDia);
    setIsDayModalOpen(true);
  };

  const handleCreateTurno = () => {
    setIsCreateModalOpen(true);
  };

  const handleGoToToday = () => {
    setGoToTodaySignal(prev => prev + 1);
  };

  const handleVistaChange = (vista: 'mes' | 'semana' | 'dia') => {
    setVistaCalendario(vista);
  };

  const handleSuccessfulTurnoCreation = () => {
    setIsCreateModalOpen(false);
    showServerActionResponse({
      success: true,
      message: 'Turno creado exitosamente',
      toastType: 'success',
      description: 'El turno ha sido creado correctamente'
    });
  };

  // Handler para mover turno (Drag and Drop) - Actualización Optimista
  const handleMoverTurno = async (turnoId: number, nuevaFecha: string, nuevaHora: string) => {
    // Guardar el estado anterior para rollback si falla
    const turnoOriginal = turnos.find(t => t.id_turno === turnoId);
    if (!turnoOriginal) return;
    
    // OPTIMISTIC UPDATE: Actualizar inmediatamente en el cliente
    const turnosActualizados = turnos.map(t => 
      t.id_turno === turnoId 
        ? { ...t, fecha: nuevaFecha, hora: nuevaHora }
        : t
    );
    setTurnos(turnosActualizados);
    
    // Luego validar en el servidor en segundo plano
    try {
      const resultado = await moverTurno(turnoId, nuevaFecha, nuevaHora);
      
      if (resultado.success) {
        // Éxito - el cambio ya está aplicado visualmente
        showServerActionResponse({
          success: true,
          message: 'Turno movido exitosamente',
          toastType: 'success',
          description: `Turno movido a ${nuevaFecha} a las ${nuevaHora}`
        });
      } else {
        // Error - hacer rollback al estado original
        const turnosRollback = turnos.map(t => 
          t.id_turno === turnoId 
            ? turnoOriginal
            : t
        );
        setTurnos(turnosRollback);
        
        showServerActionResponse({
          success: false,
          message: 'Error al mover turno',
          toastType: 'error',
          description: resultado.error || 'No se pudo mover el turno'
        });
      }
    } catch (error) {
      console.error('Error al mover turno:', error);
      
      // Error - hacer rollback al estado original
      const turnosRollback = turnos.map(t => 
        t.id_turno === turnoId 
          ? turnoOriginal
          : t
      );
      setTurnos(turnosRollback);
      
      showServerActionResponse({
        success: false,
        message: 'Error inesperado',
        toastType: 'error',
        description: 'Ocurrió un error al mover el turno'
      });
    }
  };

  // Mostrar skeleton loader durante la carga inicial o mientras carga auth
  if (loading || authLoading || isInitialLoad) {
    return (
      <UnifiedSkeletonLoader 
        type="calendar" 
        showHeader={true} 
        showFilters={false}
      />
    );
  }

  // Filtrar turnos por especialista
  const turnosFiltrados = especialistaFiltro 
    ? turnos.filter(turno => turno.id_especialista === especialistaFiltro)
    : turnos;

  const turnosHoy = getTurnosHoy();
  const turnosProximos = getTurnosProximos();

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
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 ">
            <h2 className="text-2xl sm:text-3xl font-bold">Calendario</h2>
            {/* Controles Desktop */}
            
          </div>
        </div>
      </div>

      {/* Mobile Filter (solo visible en mobile) */}
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
                {especialista.nombre} {especialista.apellido}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendario principal */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-0">
        <div className="rounded-lg">
          <CalendarioTurnos
            turnos={turnosFiltrados}
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
            onMoverTurno={handleMoverTurno}
            especialistas={especialistas}
            especialistaSeleccionado={especialistaFiltro}
            onEspecialistaChange={setEspecialistaFiltro}
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
        horaSeleccionada={horaSeleccionada} // Pasar la hora preseleccionada
        especialistas={especialistas}
        pacientes={pacientes}
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

export default CalendarioClient;
