"use client";

import { getEspecialistas } from "@/lib/actions/especialista.action";
import { getEspecialidades } from "@/lib/actions/especialidad.action";
import Button from "@/componentes/boton";
import { EspecialistasTable } from "@/componentes/especialista/especialista-listado";
import { NuevoEspecialistaDialog } from "@/componentes/especialista/nuevo-especialista-dialog";
import { GestionEspecialidadesDialog } from "@/componentes/especialista/gestion-especialidades-dialog";
import { useState, useEffect } from "react";
import type { Tables } from "@/types/database.types";
import { ArrowLeft, Plus, Search, Filter, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/usePerfil";

type Especialidad = Tables<"especialidad">;

// ✅ Tipo correcto que coincide con lo que devuelve getEspecialistas()
type EspecialistaConDatos = {
  id_usuario: string;
  id_usuario_organizacion: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  color: string | null;
  activo: boolean;
  id_rol: number;
  rol: {
    id: number;
    nombre: string;
  };
  especialidades: Array<{
    id_especialidad: number;
    nombre: string;
    precio_particular: number | null;
    precio_obra_social: number | null;
  }>;
  usuario_especialidad: Array<{
    precio_particular: number | null;
    precio_obra_social: number | null;
    activo: boolean | null; // ✅ Puede ser null según DB
    especialidad: {
      id_especialidad: number;
      nombre: string;
    };
  }>;
};

const BRAND = '#9C1838';

type Filter = "activos" | "inactivos" | "todos";

export default function EspecialistasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showEspecialidadesDialog, setShowEspecialidadesDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("activos");
  const [especialistas, setEspecialistas] = useState<EspecialistaConDatos[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const incluirInactivos = filter !== "activos";
        const [especialistasData, especialidadesData] = await Promise.all([
          getEspecialistas({ incluirInactivos }),
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
  }, [filter]); // ✅ Solo depende de filter, igual que pacientes

  const handleDialogClose = async () => {
    setShowDialog(false);
    // Recargar la lista de especialistas después de crear uno nuevo
    try {
      const incluirInactivos = filter !== "activos";
      const updatedEspecialistas = await getEspecialistas({ incluirInactivos });
      setEspecialistas(updatedEspecialistas);
    } catch (error) {
      console.error("Error reloading specialists:", error);
    }
  };

  const handleEspecialidadesDialogClose = async () => {
    setShowEspecialidadesDialog(false);
    // Recargar especialidades
    try {
      const updatedEspecialidades = await getEspecialidades();
      setEspecialidades(updatedEspecialidades);
    } catch (error) {
      console.error("Error reloading specialties:", error);
    }
  };

  const handleEspecialidadesUpdated = async () => {
    // Recargar especialidades cuando se actualizan
    try {
      const updatedEspecialidades = await getEspecialidades();
      setEspecialidades(updatedEspecialidades);
    } catch (error) {
      console.error("Error reloading specialties:", error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Filtrado en frontend (por estado y término de búsqueda)
  const especialistasFiltrados = especialistas.filter(e => {
    // Filtro por estado
    const passFilterEstado = 
      filter === "activos" ? e.activo === true :
      filter === "inactivos" ? e.activo === false :
      true;
    
    // Filtro por búsqueda
    const passFilterBusqueda = searchTerm === "" || 
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.apellido.toLowerCase().includes(searchTerm.toLowerCase());
    
    return passFilterEstado && passFilterBusqueda;
  });

  // ✅ Mostrar skeleton mientras cargan los datos
  if (loading) {
    return (
      <div className="min-h-screen text-black">
        {/* Mobile Header Skeleton */}
        <div className="sm:hidden bg-white border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <div className="animate-pulse rounded-md bg-gray-300 h-6 w-6 mr-3"></div>
            <div className="animate-pulse rounded-md bg-gray-300 h-6 w-32 flex-1 mr-9"></div>
          </div>
          <div className="px-4 pb-3">
            <div className="animate-pulse rounded-lg bg-gray-100 h-10 w-full"></div>
          </div>
        </div>

        {/* Contenido Principal Skeleton */}
  <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8">
          {/* Desktop Header Skeleton */}
          <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
            <div className="animate-pulse rounded-md bg-gray-300 h-8 w-64"></div>
          </div>

          {/* Filtros y Búsqueda Skeleton - Solo Desktop */}
          <div className="hidden sm:block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="animate-pulse">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="rounded-lg bg-gray-300 h-10 w-80"></div>
                  <div className="flex items-center gap-2">
                    <div className="rounded bg-gray-300 h-4 w-16"></div>
                    <div className="rounded-lg bg-gray-300 h-10 w-32"></div>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-300 h-10 w-40"></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="rounded bg-gray-300 h-4 w-48"></div>
              </div>
            </div>
          </div>

          {/* Table Skeleton para Desktop */}
          <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
            <div className="animate-pulse">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 flex space-x-4">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-4 bg-gray-300 rounded w-40"></div>
                <div className="h-4 bg-gray-300 rounded w-36"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
                <div className="h-4 bg-gray-300 rounded w-28"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </div>
              
              {/* Table Rows */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-gray-200 px-6 py-4 flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-32"></div>
                      <div className="h-3 bg-gray-300 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-300 rounded w-40"></div>
                  <div className="flex space-x-1">
                    <div className="h-6 bg-gray-300 rounded-full w-20"></div>
                    <div className="h-6 bg-gray-300 rounded-full w-16"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                  <div className="h-4 bg-gray-300 rounded w-28"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                    <div className="h-8 bg-gray-300 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cards Skeleton para Mobile */}
          <div className="md:hidden space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-32"></div>
                      <div className="h-3 bg-gray-300 rounded w-24"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="h-3 bg-gray-300 rounded w-40"></div>
                    <div className="h-3 bg-gray-300 rounded w-28"></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      <div className="h-6 bg-gray-300 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-300 rounded-full w-20"></div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-300 rounded w-16"></div>
                      <div className="h-8 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
  <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8">
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

            {/* Lado derecho: Botones - Solo para Admin y Programadores */}
            {user?.puedeGestionarTurnos && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary"
                  onClick={() => setShowEspecialidadesDialog(true)}
                  className="whitespace-nowrap px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center gap-2"
                >
                  Especialidades
                </Button>
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
          especialistas={especialistasFiltrados}
          especialidades={especialidades}
          onEspecialistaDeleted={async () => {
            // Recargar la lista después de eliminar
            try {
              const incluirInactivos = filter !== "activos";
              const updatedEspecialistas = await getEspecialistas({ incluirInactivos });
              setEspecialistas(updatedEspecialistas);
            } catch (error) {
              console.error("Error reloading specialists:", error);
            }
          }}
          onEspecialistaUpdated={async () => {
            // Recargar la lista después de actualizar
            try {
              const incluirInactivos = filter !== "activos";
              const updatedEspecialistas = await getEspecialistas({ incluirInactivos });
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

      <GestionEspecialidadesDialog
        isOpen={showEspecialidadesDialog}
        onClose={handleEspecialidadesDialogClose}
        especialidades={especialidades}
        onEspecialidadesUpdated={handleEspecialidadesUpdated}
      />
    </div>
  );
}