'use client'

import { useEffect, useMemo, useState } from "react";
import { PacientesTable } from "@/componentes/paciente/paciente-listado";
import { activarPaciente } from "@/lib/actions/paciente.action";
import type { Tables } from "@/types/database.types";
import Button from "@/componentes/boton";
import UnifiedSkeletonLoader from "@/componentes/unified-skeleton-loader";
import { NuevoPacienteDialog } from "@/componentes/paciente/nuevo-paciente-dialog";
import { Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToastStore } from "@/stores/toast-store";
import { pacienteKeys, useInvalidatePacientes, usePacientesPaginated } from "@/hooks/usePacientesQuery";
import PaginacionBar from "@/componentes/paginacion/paginacion-bar";
import { useQueryClient } from "@tanstack/react-query";

type Filter = 'activos' | 'inactivos' | 'todos';
type Paciente = Tables<"paciente">;

export default function PacientePage() {

    const [showDialog, setShowDialog] = useState(false);
    const [filter, setFilter] = useState<Filter>('activos');
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const allowedPageSizes = [10, 20, 30, 50];
    const router = useRouter();
    const toast = useToastStore();
    const invalidatePacientes = useInvalidatePacientes();
    const queryClient = useQueryClient();

    const pacientesFilters = useMemo(() => ({
        search: debouncedSearchTerm,
        status: filter,
        page,
        pageSize,
        orderBy: 'nombre' as const,
        orderDirection: 'asc' as const,
    }), [debouncedSearchTerm, filter, page, pageSize]);

    const {
        data: pacientesPaginated,
        isLoading,
        isFetching,
    } = usePacientesPaginated(pacientesFilters);

    const pacientes = pacientesPaginated?.items ?? [];
    const pagination = pacientesPaginated?.pagination;

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // void queryClient.cancelQueries({ queryKey: pacienteKeys.all });
            setPage(1);
            const nextSearch = searchTerm.trim();
            setDebouncedSearchTerm(nextSearch);

            // Evita acumulacion de entradas de busqueda en cache (solo inactivas).
            queryClient.removeQueries({
                queryKey: pacienteKeys.all,
                type: 'inactive',
                predicate: (query) => {
                    const queryKey = query.queryKey;
                    if (!Array.isArray(queryKey)) return false;
                    if (queryKey[0] !== pacienteKeys.all[0] || queryKey[1] !== 'paginated') return false;

                    const filters = queryKey[2] as { search?: string } | undefined;
                    const cachedSearch = (filters?.search ?? '').toString();
                    return cachedSearch !== nextSearch;
                },
            });
        }, 500);

        return () => {
            clearTimeout(timeoutId);
            // void queryClient.cancelQueries({ queryKey: pacienteKeys.all });
        };
    }, [searchTerm, queryClient]);

    useEffect(() => {
        setPage(1);
    }, [filter]);

    const handleDialogClose = async () => {
        setShowDialog(false);
        await invalidatePacientes();
    };

    const handleActive = async (paciente: Paciente) => {
        try {
            const result = await activarPaciente(paciente.id_paciente);
            if (!result.success) {
                toast.addToast({
                    variant: "error",
                    message: result.error,
                });
                return;
            }
            await invalidatePacientes();
            toast.addToast({
                variant: "success",
                message: "El paciente se ha activado correctamente.",
            });
        } catch (error) {
            console.error("Error activating patient:", error);
            toast.addToast({
                variant: "error",
                message: "Error al activar el paciente.",
            });
        }
    }

    const handleReturnMobile = () => {
        // router.push('/inicio');
        router.back();
    }

    if (isLoading && !pacientesPaginated) {
        return <UnifiedSkeletonLoader type="table" />;
    }

    return (
        <div className="min-h-screen text-black">
            
            {/* Header Mobile */}
            <div className="sm:hidden bg-white border-b border-gray-200">
                <div className="flex items-center px-4 py-3">
                    {/* Botón de regreso */}
                    <button 
                        className="mr-3 p-1"
                        onClick={() => {handleReturnMobile()}}
                    >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    
                    {/* Título */}
                    <h1 className="text-lg font-medium text-gray-900 flex-1 text-center mr-9">
                        Pacientes
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
                        
                        {/* Dropdown de filtro */}
                        <select
                            name="filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as Filter)}
                            className="bg-[#9C1838] text-white px-3 py-2 rounded-lg text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[#9C1838] focus:ring-opacity-50"
                        >
                            <option value="activos" className="bg-white text-gray-900">Activos</option>
                            <option value="inactivos" className="bg-white text-gray-900">Inactivos</option>
                            <option value="todos" className="bg-white text-gray-900">Todos</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="mx-auto w-full bg-white p-4 sm:p-6 lg:px-6 lg:pt-8 sm:flex sm:flex-col sm:h-[calc(100vh-3rem)]">
                {/* Desktop Header */}
                <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold">Pacientes</h2>
                </div>
                {/* Filtros y Búsqueda - Solo Desktop */}
                <div className="hidden sm:block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
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
                                    placeholder="Buscar por nombre y apellido o DNI o teléfono"
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

                        {/* Lado derecho: Botón Nuevo Paciente */}
                        <div className="flex items-center">
                            <Button 
                                variant="primary"
                                onClick={() => setShowDialog(true)}
                                className="whitespace-nowrap px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                                Nuevo Paciente
                            </Button>
                        </div>
                    </div>

                    {/* Contador de resultados */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Mostrando {pacientes.length} de {pagination?.total ?? pacientes.length} pacientes
                            {searchTerm && (
                                <span className="ml-1">
                                    que coinciden con "{searchTerm}"
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="sm:flex-1 sm:min-h-0 sm:overflow-hidden">
                    <PacientesTable 
                        pacientes={pacientes}
                        onPacienteDeleted={handleDialogClose}
                        onPacienteUpdated={handleDialogClose}
                        onActivatePaciente={handleActive}
                        handleToast={toast.addToast}
                    />
                </div>

                <div className="hidden sm:block pt-3 shrink-0 bg-white">
                    {pagination ? (
                        <PaginacionBar
                            pagination={pagination}
                            visibleCount={pacientes.length}
                            pageSize={pageSize}
                            allowedPageSizes={allowedPageSizes}
                            itemLabel="pacientes"
                            onPageChange={setPage}
                            onPageSizeChange={(size) => {
                                setPageSize(size);
                                setPage(1);
                            }}
                            loading={isFetching}
                            showSummary
                        />
                    ) : (
                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500">
                            Sin resultados para paginar.
                        </div>
                    )}
                </div>

                <div className="sm:hidden px-3 pt-2">
                    {pagination ? (
                        <PaginacionBar
                            variant="mobile"
                            pagination={pagination}
                            visibleCount={pacientes.length}
                            pageSize={pageSize}
                            allowedPageSizes={allowedPageSizes}
                            itemLabel="pacientes"
                            onPageChange={setPage}
                            onPageSizeChange={(size) => {
                                setPageSize(size);
                                setPage(1);
                            }}
                            loading={isFetching}
                        />
                    ) : (
                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500">
                            Sin resultados para paginar.
                        </div>
                    )}
                </div>
            </div>

            <NuevoPacienteDialog
                isOpen={showDialog}
                onClose={handleDialogClose}
                handleToast={toast.addToast}
            />
        </div>
    );
}
