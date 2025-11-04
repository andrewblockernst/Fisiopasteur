"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getPaciente } from "@/lib/actions/paciente.action";
import Boton from "@/componentes/boton";
import DatosPaciente from "@/componentes/paciente/datos-paciente";
import { Tables } from "@/types/database.types";

type Paciente = Tables<"paciente">;

function HistorialClinicoContent() {
  const params = useSearchParams();
  const idPaciente = Number(params.get("id"));
  const [paciente, setPaciente] = useState<Paciente | null>(null);

  useEffect(() => {
    async function cargarDatos() {
      if (!idPaciente) return;
      const pacienteData = await getPaciente(idPaciente);
      setPaciente(pacienteData);
    }
    cargarDatos();
  }, [idPaciente]);

  // Handler para volver atrás
  const handleBack = () => {
    window.history.length > 1 ? window.history.back() : window.location.assign("/pacientes");
  };

  return (
    <div className="max-w-[1500px] mx-auto px-2 sm:px-6 py-6 space-y-4">
      {/* Mobile Header - Solo móvil */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1">Historial Clínico</h1>
          <span className="w-8" />
        </div>
      </header>

      {/* HEADER desktop */}
      <div className="hidden sm:flex items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Historial Clínico</h1>
      </div>

      {/* Detalles del paciente */}
      <div className="bg-white rounded-xl border border-gray-200 shadow p-4 sm:p-6 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold mb-2 text-black">Datos del paciente</h2>
        {paciente && <DatosPaciente paciente={paciente} />}
      </div>

      {/* Botón para volver a la lista de pacientes */}
      <div className="w-full flex justify-center mt-8">
        <Boton
          className="text-black"
          variant="secondary"
          onClick={() => window.location.href = "/pacientes"}
        >
          Volver a listado de pacientes
        </Boton>
      </div>
    </div>
  );
}

export default function HistorialClinicoPage() {
  return (
    <Suspense fallback={<div className="p-4">Cargando...</div>}>
      <HistorialClinicoContent />
    </Suspense>
  );
}