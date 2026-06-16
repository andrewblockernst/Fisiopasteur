"use client";

import { getEspecialidades } from "@/lib/actions/especialidad.action";
import { EspecialistasTable } from "@/componentes/especialista/especialista-listado";
import { NuevoEspecialistaDialog } from "@/componentes/especialista/nuevo-especialista-dialog";
import { GestionEspecialidadesDialog } from "@/componentes/especialista/gestion-especialidades-dialog";
import { GestionBoxesDialog } from "@/componentes/especialista/gestion-boxes-dialog";
import { useState, useEffect, useMemo } from "react";
import type { Tables } from "@/types/database.types";
import { ArrowLeft, Plus, Search, Filter, GraduationCap, Box, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/usePerfil";
import { especialistaKeys, useEspecialistasPaginated, useInvalidateEspecialistas } from "@/hooks/useEspecialistasQuery";
import PaginacionBar from "@/componentes/paginacion/paginacion-bar";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, IconButton, Input, PageHeader, Skeleton } from "@/componentes/ui";

// type Especialidad = Tables<"especialidad">;
type Especialidad = {
  id_especialidad: number;
  nombre: string;
}

// ✅ Tipo correcto que coincide con lo que devuelve getEspecialistas()
type EspecialistaConDatos = {
  id_usuario: string;
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

type Especialista = Tables<"usuario">;

type Filter = "activos" | "inactivos" | "todos";

export default function EspecialistasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showEspecialidadesDialog, setShowEspecialidadesDialog] = useState(false);
  const [showBoxesDialog, setShowBoxesDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("activos");
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const allowedPageSizes = [10, 20, 30, 50];
  const queryClient = useQueryClient();
  const invalidateEspecialistas = useInvalidateEspecialistas();

  const especialistasFilters = useMemo(() => ({
    incluirInactivos: filter !== "activos",
    status: filter,
    search: debouncedSearchTerm,
    page,
    pageSize,
  }), [filter, debouncedSearchTerm, page, pageSize]);

  const {
    data: especialistasPaginated,
    isLoading,
    isFetching,
  } = useEspecialistasPaginated(especialistasFilters);

  const especialistas = (especialistasPaginated?.items ?? []) as EspecialistaConDatos[];
  const pagination = especialistasPaginated?.pagination;

  useEffect(() => {
    const loadEspecialidades = async () => {
      try {
        const especialidadesResult = await getEspecialidades();
        const loaded = especialidadesResult.success ? especialidadesResult.data : [];
        setEspecialidades(loaded);
      } catch (error) {
        console.error("Error cargando especialidades:", error);
      }
    };

    loadEspecialidades();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // void queryClient.cancelQueries({ queryKey: especialistaKeys.all });
      const nextSearch = searchTerm.trim();
      setPage(1);
      setDebouncedSearchTerm(nextSearch);

      queryClient.removeQueries({
        queryKey: especialistaKeys.all,
        type: 'inactive',
        predicate: (query) => {
          const queryKey = query.queryKey;
          if (!Array.isArray(queryKey)) return false;
          if (queryKey[0] !== especialistaKeys.all[0] || queryKey[1] !== 'paginated') return false;

          const filters = queryKey[2] as { search?: string } | undefined;
          const cachedSearch = (filters?.search ?? '').toString().trim();
          return cachedSearch.length > 0;
        },
      });
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      // void queryClient.cancelQueries({ queryKey: especialistaKeys.all });
    };
  }, [searchTerm, queryClient]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const handleDialogClose = async () => {
    setShowDialog(false);
    await invalidateEspecialistas();
  };

  const handleEspecialidadesDialogClose = async () => {
    setShowEspecialidadesDialog(false);
    // Recargar especialidades
    try {
      const updatedEspecialidadesResult = await getEspecialidades();
      const updatedEspecialidades = updatedEspecialidadesResult.success ? updatedEspecialidadesResult.data : [];
      setEspecialidades(updatedEspecialidades);
    } catch (error) {
      console.error("Error reloading specialties:", error);
    }
  };

  const handleEspecialidadesUpdated = async () => {
    // Recargar especialidades cuando se actualizan
    try {
      const updatedEspecialidadesResult  = await getEspecialidades();
      const updatedEspecialidades = updatedEspecialidadesResult.success ? updatedEspecialidadesResult.data : [];
      setEspecialidades(updatedEspecialidades);
    } catch (error) {
      console.error("Error reloading specialties:", error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // ✅ Skeleton mientras cargan los datos
  if (isLoading && !especialistasPaginated) {
    return (
      <div className="min-h-screen text-foreground">
        {/* Mobile header skeleton */}
        <div className="sm:hidden bg-background border-b border-border">
          <div className="flex items-center px-4 py-3 gap-3">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 flex-1" />
          </div>
          <div className="px-4 pb-3">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="mx-auto w-full bg-background p-4 sm:p-6 lg:px-8 lg:pt-6">
          {/* Desktop header skeleton — imita el padding interno de <PageHeader /> */}
          <div className="hidden sm:block px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6 mb-4">
            <Skeleton className="h-8 sm:h-9 w-64" />
          </div>

          {/* Filtros skeleton */}
          <Card className="hidden sm:block mb-4" padding="md">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex gap-3 flex-1">
                <Skeleton className="h-10 w-80" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          </Card>

          {/* Table/cards skeleton */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-5rem)] lg:h-[100dvh] flex flex-col text-foreground overflow-hidden">
      {/* Mobile Header (<md) */}
      <div className="md:hidden bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-20 shrink-0">
        <div className="flex items-center px-4 py-3 gap-2">
          <IconButton
            aria-label="Volver"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={handleBack}
            className="-ml-2"
          />
          <h1 className="text-base font-semibold text-foreground flex-1 text-center truncate">
            Especialistas
          </h1>
          <span className="w-9" aria-hidden />
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <Input
              type="text"
              name="search"
              placeholder="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search />}
              className="flex-1"
            />
            <select
              name="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              aria-label="Filtrar por estado"
              className="h-10 px-3 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <option value="activos" className="bg-popover text-foreground">Activos</option>
              <option value="inactivos" className="bg-popover text-foreground">Inactivos</option>
              <option value="todos" className="bg-popover text-foreground">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 min-h-0 flex flex-col mx-auto w-full bg-background md:p-6 md:pb-0 lg:p-6 lg:px-8 lg:pt-6 overflow-hidden">
        {/* md..<lg: PageHeader con acción + search row compacta */}
        <div className="hidden md:block lg:hidden">
          <PageHeader
            title="Especialistas"
            actions={
              user?.puedeGestionarTurnos ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowDialog(true)}
                >
                  Nuevo especialista
                </Button>
              ) : null
            }
          />
          <div className="flex gap-2 items-center mb-4 mt-2">
            <Input
              name="search"
              type="text"
              placeholder="Buscar por nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search />}
              rightIcon={
                searchTerm ? (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setSearchTerm("")}
                    className="text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined
              }
              className="flex-1"
            />
            <select
              name="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              aria-label="Filtrar por estado"
              className="h-10 px-3 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand transition-colors cursor-pointer shrink-0"
            >
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>

        {/* ≥lg: Page header + filter Card */}
        <div className="hidden lg:block">
          <PageHeader title="Especialistas"/>
        </div>

        {/* Filtros y Búsqueda — ≥lg */}
        <Card className="hidden lg:block mb-4" padding="md">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Búsqueda y Filtro */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1 max-w-md">
                <Input
                  name="search"
                  type="text"
                  placeholder="Buscar por nombre o apellido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search />}
                  rightIcon={
                    searchTerm ? (
                      <button
                        type="button"
                        aria-label="Limpiar búsqueda"
                        onClick={() => setSearchTerm("")}
                        className="text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : undefined
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Estado:</span>
                </div>
                <select
                  name="filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Filter)}
                  aria-label="Filtrar por estado"
                  className="h-10 px-3 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand transition-colors cursor-pointer"
                >
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                  <option value="todos">Todos</option>
                </select>
              </div>

            </div>

            {/* Botones (solo Admin/Programador) */}
            {user?.puedeGestionarTurnos && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Box className="w-4 h-4" />}
                  onClick={() => setShowBoxesDialog(true)}
                >
                  Boxes
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<GraduationCap className="w-4 h-4" />}
                  onClick={() => setShowEspecialidadesDialog(true)}
                >
                  Especialidades
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowDialog(true)}
                >
                  Nuevo especialista
                </Button>
              </div>
            )}
          </div>

        </Card>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <EspecialistasTable
            especialistas={especialistas}
            especialidades={especialidades}
            onEspecialistaDeleted={async () => {
              await invalidateEspecialistas();
            }}
            onEspecialistaUpdated={async () => {
              await invalidateEspecialistas();
            }}
            setShowDialog={setShowDialog}
          />
        </div>

        {/* Paginación sticky al bottom — mobile variant <lg, desktop variant ≥lg */}
        <div className="shrink-0 pt-2 lg:pt-3 px-3 lg:px-0 bg-background border-t border-border lg:border-0">
          {pagination ? (
            <>
              <div className="lg:hidden">
                <PaginacionBar
                  variant="mobile"
                  pagination={pagination}
                  visibleCount={especialistas.length}
                  pageSize={pageSize}
                  allowedPageSizes={allowedPageSizes}
                  itemLabel="especialistas"
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  loading={isFetching}
                />
              </div>
              <div className="hidden lg:block">
                <PaginacionBar
                  pagination={pagination}
                  visibleCount={especialistas.length}
                  pageSize={pageSize}
                  allowedPageSizes={allowedPageSizes}
                  itemLabel="especialistas"
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  loading={isFetching}
                  showSummary
                />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
              Sin resultados para paginar.
            </div>
          )}
        </div>
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

      <GestionBoxesDialog
        isOpen={showBoxesDialog}
        onClose={() => setShowBoxesDialog(false)}
        onBoxesUpdated={() => {
          // Podrías recargar datos si es necesario
          console.log('Boxes actualizados');
        }}
      />
    </div>
  );
}