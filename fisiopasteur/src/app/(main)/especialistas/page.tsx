"use client";

import { getEspecialistas, getEspecialidades } from "@/lib/actions/especialista.action";
import Button from "@/componentes/boton";
import { EspecialistasTable } from "@/componentes/especialista/especialista-listado";
import { NuevoEspecialistaDialog } from "@/componentes/especialista/nuevo-especialista-dialog";
import { useState, useEffect } from "react";
import type { Tables } from "@/types/database.types";
import SkeletonLoader from "@/componentes/skeleton-loader";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Especialidad = Tables<"especialidad">;
type Usuario = Tables<"usuario"> & { 
  especialidades?: Especialidad[] 
};

const BRAND = '#9C1838';

export default function EspecialistasPage() {
  const router = useRouter();
  const [especialistas, setEspecialistas] = useState<Usuario[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [especialistasData, especialidadesData] = await Promise.all([
          getEspecialistas(),
          getEspecialidades()
        ]);
        setEspecialistas(especialistasData);
        setEspecialidades(especialidadesData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    loadData();
  }, []);

  const handleDialogClose = async () => {
    setShowDialog(false);
    // Recargar la lista de especialistas después de crear uno nuevo
    try {
      const updatedEspecialistas = await getEspecialistas();
      setEspecialistas(updatedEspecialistas);
    } catch (error) {
      console.error("Error reloading specialists:", error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return <SkeletonLoader/>;
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Header - Sticky mejorado */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Especialistas</h1>
            <button
            onClick={() => setShowDialog(true)}
            className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white"
            style={{ backgroundColor: BRAND }}
            aria-label="Nuevo especialista"
            title="Nuevo especialista"
            >
            <Plus className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Especialistas</h2>
          <Button 
            variant="primary"
            onClick={() => setShowDialog(true)}
            className="w-full sm:w-auto"
          >
            Nuevo Especialista
          </Button>
        </div>

        <EspecialistasTable 
          especialistas={especialistas}
          especialidades={especialidades}
          onEspecialistaDeleted={async () => {
            // Recargar la lista después de eliminar
            try {
              const updatedEspecialistas = await getEspecialistas();
              setEspecialistas(updatedEspecialistas);
            } catch (error) {
              console.error("Error reloading specialists:", error);
            }
          }}
          onEspecialistaUpdated={async () => {
            // Recargar la lista después de actualizar
            try {
              const updatedEspecialistas = await getEspecialistas();
              setEspecialistas(updatedEspecialistas);
            } catch (error) {
              console.error("Error reloading specialists:", error);
            }
          }}
          />
      </div>

      <NuevoEspecialistaDialog
        isOpen={showDialog}
        onClose={handleDialogClose}
        especialidades={especialidades}
      />
    </div>
  );
}