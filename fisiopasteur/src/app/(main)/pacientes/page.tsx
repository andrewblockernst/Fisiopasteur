'use client'

import { useEffect, useMemo, useState } from "react";
import { PacientesTable } from "@/componentes/paciente/paciente-listado";
import { activarPaciente } from "@/lib/actions/paciente.action";
import type { Tables } from "@/types/database.types";
import UnifiedSkeletonLoader from "@/componentes/unified-skeleton-loader";
import { NuevoPacienteDialog } from "@/componentes/paciente/nuevo-paciente-dialog";
import { Search, Filter, ArrowLeft, X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToastStore } from "@/stores/toast-store";
import { pacienteKeys, useInvalidatePacientes, usePacientesPaginated } from "@/hooks/usePacientesQuery";
import PaginacionBar from "@/componentes/paginacion/paginacion-bar";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, IconButton, Input, PageHeader } from "@/componentes/ui";

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
            console.error("Error al activar paciente:", error);
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
        <div className="h-[calc(100dvh-5rem)] lg:h-[100dvh] flex flex-col text-foreground overflow-hidden">
            {/* Header Mobile (<md) */}
            <div className="md:hidden bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-20 shrink-0">
                <div className="flex items-center px-4 py-3 gap-2">
                    <IconButton
                        aria-label="Volver"
                        variant="ghost"
                        size="sm"
                        icon={<ArrowLeft className="w-5 h-5" />}
                        onClick={handleReturnMobile}
                        className="-ml-2"
                    />
                    <h1 className="text-base font-semibold text-foreground flex-1 text-center truncate">
                        Pacientes
                    </h1>
                    <span className="w-9" aria-hidden />
                </div>

                {/* Campo de búsqueda mobile + filtro */}
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
            <div className="flex-1 min-h-0 flex flex-col mx-auto w-full bg-background md:p-6 md:pb-0 md:pt-2 lg:p-6 lg:px-8 lg:pt-2 overflow-hidden">
                {/* md..<lg: PageHeader con acción + search row compacta */}
                <div className="hidden md:block lg:hidden">
                    <PageHeader
                        title="Pacientes"
                        actions={
                            <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<Plus className="w-4 h-4" />}
                                onClick={() => setShowDialog(true)}
                            >
                                Nuevo paciente
                            </Button>
                        }
                    />
                    <div className="flex gap-2 items-center mb-4 mt-2">
                        <Input
                            name="search"
                            type="text"
                            placeholder="Buscar por nombre, apellido, DNI o teléfono"
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
                    <PageHeader title="Pacientes" />
                </div>

                {/* Filtros y Búsqueda — ≥lg */}
                <Card className="hidden lg:block mb-4" padding="md">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        {/* Lado izquierdo: Búsqueda y Filtro */}
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                            <div className="relative flex-1 max-w-md">
                                <Input
                                    name="search"
                                    type="text"
                                    placeholder="Buscar por nombre, apellido, DNI o teléfono"
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

                        {/* Botón Nuevo Paciente */}
                        <div>
                            <Button
                                variant="primary"
                                leftIcon={<Plus className="w-4 h-4" />}
                                onClick={() => setShowDialog(true)}
                            >
                                Nuevo paciente
                            </Button>
                        </div>
                    </div>

                </Card>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    <PacientesTable
                        pacientes={pacientes}
                        onPacienteDeleted={handleDialogClose}
                        onPacienteUpdated={handleDialogClose}
                        onActivatePaciente={handleActive}
                        handleToast={toast.addToast}
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
                            </div>
                            <div className="hidden lg:block">
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
                            </div>
                        </>
                    ) : (
                        <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
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
