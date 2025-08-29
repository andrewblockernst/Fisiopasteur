"use client";

import React, { useState, useEffect } from "react";
import { CalendarioTurnos } from "@/componentes/calendario/calendario-turnos";
import { DayViewModal } from "@/componentes/calendario/dia-vista-dialog";
import NuevoTurnoModal from "@/componentes/calendario/nuevo-turno-dialog";
import { useTurnoStore, type TurnoConDetalles } from "@/stores/turno-store";
import { useToastStore } from "@/stores/toast-store";
import { Calendar, Users, Clock, Filter, ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "../boton";

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
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTurnos, setSelectedDayTurnos] = useState<TurnoConDetalles[]>([]);
  const [especialistaFiltro, setEspecialistaFiltro] = useState<string>("");

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

  const handleSuccessfulTurnoCreation = () => {
    setIsCreateModalOpen(false);
    showServerActionResponse({
      success: true,
      message: 'Turno creado exitosamente',
      toastType: 'success',
      description: 'El turno ha sido creado correctamente'
    });
  };

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
          <h1 className="text-lg font-semibold">Calendario</h1>
          <button
            onClick={handleCreateTurno}
            className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white"
            style={{ backgroundColor: BRAND }}
            aria-label="Nuevo turno"
            title="Nuevo turno"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden sm:block">
        <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 ">
            <h2 className="text-2xl sm:text-3xl font-bold">Calendario</h2>
            {/* Controles Desktop */}
            <div className="flex items-center gap-4">
              {/* Filtro por especialista */}
              <div className="flex items-center gap-2">
                <select
                  value={especialistaFiltro}
                  onChange={(e) => setEspecialistaFiltro(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                >
                  <option value="">Todos los especialistas</option>
                  {especialistas.map((especialista) => (
                    <option key={especialista.id_usuario} value={especialista.id_usuario}>
                      {especialista.nombre} {especialista.apellido}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón nuevo turno */}
              <Button
                onClick={handleCreateTurno}
                variant="primary"
              >
                Nuevo Turno
              </Button>
            </div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="rounded-lg">
          <CalendarioTurnos
            turnos={turnosFiltrados}
            onDayClick={(date: Date, turnos: TurnoConDetalles[]) => {
              setSelectedDate(date);
              setSelectedDayTurnos(turnos);
              setIsDayModalOpen(true);
            }}
            onCreateTurno={(date: Date) => {
              setSelectedDate(date);
              setIsCreateModalOpen(true);
            }}
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
        onClose={() => setIsCreateModalOpen(false)}
        fechaSeleccionada={selectedDate}
        especialistas={especialistas}
        pacientes={pacientes}
      />
    </div>
  );
}

export default CalendarioClient;
