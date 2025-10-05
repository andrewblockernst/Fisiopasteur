"use client";

import { getEspecialistas, getEspecialidades } from "@/lib/actions/especialista.action";
import Button from "@/componentes/boton";
import { EspecialistasTable } from "@/componentes/especialista/especialista-listado";
import { NuevoEspecialistaDialog } from "@/componentes/especialista/nuevo-especialista-dialog";
import { useState, useEffect } from "react";
import type { Tables } from "@/types/database.types";
import SkeletonLoader from "@/componentes/skeleton-loader";
import { ArrowLeft, Plus, Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/usePerfil";

type Especialidad = Tables<"especialidad">;
type Usuario = Tables<"usuario"> & { 
  especialidades?: Especialidad[] 
};

const BRAND = '#9C1838';

type Filter = "activos" | "inactivos" | "todos";

export default function EspecialistasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("activos");
  const [especialistas, setEspecialistas] = useState<Usuario[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  // const [showDialog, setShowDialog] = useState(false);
  // const [loading, setLoading] = useState(true);
  // const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    // Siempre traer todos si el filtro no es "activos"
    const fetchEspecialistas = async () => {
      const incluirInactivos = filter !== "activos";
      const data = await getEspecialistas({ incluirInactivos });
      setEspecialistas(data);
    };
    fetchEspecialistas();
  }, [filter]);

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

  // Filtrado en frontend
  const especialistasFiltrados = especialistas.filter(e => {
    if (filter === "activos") return e.activo === true;
    if (filter === "inactivos") return e.activo === false;
    return true;
  });

  if (loading || authLoading) {
    return <SkeletonLoader/>;
  }

  return (
    <div className="min-h-screen text-black">

      {/* Mobile Header */}
      <div className="sm:hidden bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          {/* Boton de regreso */}
          <button
            className="mr-3 p-1"
            onClick={handleBack}
          >
            <svg
              className="w-6 h-6 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Titulo */}
          <h1 className="text-lg font-medium text-gray-900 flex-1 text-center mr-9">
            Especialistas
          </h1>
        </div>

        {/* Campo de búsqueda mobile */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                name="search"
                type="text"
                placeholder="Buscar"
                className="w-full px-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-0 focus:bg-white focus:shadow-sm transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>


          </div>
        </div>

      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Especialistas</h2>
        </div>

        {/* Filtros y Búsqueda - Solo Desktop */}
        <div className="hidden sm:block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            {/* Lado izquierdo: Búsqueda y Filtro */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Campo de búsqueda con ícono */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  name="search"
                  type="text"
                  placeholder="Buscar por nombre o apellido..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9C1838] focus:border-[#9C1838] transition-colors duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="text-sm">✕</span>
                  </button>
                )}
              </div>

              {/* Filtro de estado */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Estado:</span>
                </div>
                <select
                  name="filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Filter)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#9C1838] focus:border-[#9C1838] transition-colors duration-200 cursor-pointer"
                >
                  <option id="filter-activos" value="activos">Activos</option>
                  <option id="filter-inactivos" value="inactivos">Inactivos</option>
                  <option id="filter-todos" value="todos">Todos</option>
                </select>
              </div>
            </div>

            {/* Lado derecho: Botón Nuevo Especialista - Solo para Admin */}
            {user?.esAdmin && (
              <div className="flex items-center">
                <Button 
                  variant="primary"
                  onClick={() => setShowDialog(true)}
                  className="whitespace-nowrap px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  Nuevo Especialista
                </Button>
              </div>
            )}
          </div>

          {/* Contador de resultados */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Mostrando {especialistasFiltrados.length}{" "}
              {filter === "activos" && "activos"}
              {filter === "inactivos" && "inactivos"}
              {filter === "todos" && "especialistas"}.
            </span>
          </div>
        </div>

        <EspecialistasTable 
          especialistas={especialistas.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || e.apellido.toLowerCase().includes(searchTerm.toLowerCase()))}
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
          setShowDialog={setShowDialog}
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