"use client";

import { getEspecialistas, getEspecialidades } from "@/lib/actions/especialista.action";
import Button from "@/components/button";
import { EspecialistasTable } from "@/components/especialista/especialista-listado";
import { NuevoEspecialistaDialog } from "@/components/especialista/nuevo-especialista-dialog";
import { useState, useEffect } from "react";
import type { Tables } from "@/types/database.types";

type Especialidad = Tables<"especialidad">;
type Usuario = Tables<"usuario"> & { 
  especialidades?: Especialidad[] 
};

export default function EspecialistasPage() {
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
        setLoading(false);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Gestión de Especialistas</h1>
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

      <NuevoEspecialistaDialog
        isOpen={showDialog}
        onClose={handleDialogClose}
        especialidades={especialidades}
      />
    </div>
  );
}