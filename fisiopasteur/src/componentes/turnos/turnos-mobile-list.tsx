"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  User,
  MapPin,
  Phone,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  ArrowLeft,
  Filter,
  X,
} from 'lucide-react';
import { NuevoTurnoModal } from '../calendario/nuevo-turno-dialog';
import TurnosTable from './listado-turnos';
import type { TurnoConDetalles } from "@/stores/turno-store";
import type { Tables, EspecialistaWithSpecialties, TurnoWithRelations } from "@/types";
import type { InvalidateTurnosOptions, TurnosPagination } from '@/hooks/useTurnosQuery';
import { turnoKeys } from '@/hooks/useTurnosQuery';
import UnifiedSkeletonLoader from '../unified-skeleton-loader';
import { dayjs, todayYmd } from '@/lib/dayjs';
import PaginacionBar from '@/componentes/paginacion/paginacion-bar';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  IconButton,
  Input,
  EmptyState,
  PageHeader,
} from '@/componentes/ui';
import type { BadgeProps } from '@/componentes/ui';
import { cn } from '@/lib/utils';

interface TurnosMobileListProps {
  turnos: TurnoConDetalles[];
  onTurnoCreated?: () => void;
  invalidateTurnos: (options?: InvalidateTurnosOptions) => void;
  especialistas: EspecialistaWithSpecialties[];
  especialidades: Tables<"especialidad">[];
  loadingTurnos: boolean;
  initialFilters: {
    fecha_desde: string;
    fecha_hasta: string;
    especialista_ids: string[];
    especialidad_ids: string[];
    estados: string[];
    page: number;
    page_size: number;
    paciente_id?: number;
    search?: string;
  };
  activeFilters: {
    fecha_desde: string;
    fecha_hasta: string;
    especialista_ids: string[];
    especialidad_ids: string[];
    estados: string[];
    page: number;
    page_size: number;
    paciente_id?: number;
    search?: string;
  };
  pagination?: TurnosPagination;
  allowedPageSizes: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const ESTADOS_OPCIONES = [
  { key: 'programado', label: 'Programado', variant: 'info' as const },
  { key: 'pendiente', label: 'Pendiente', variant: 'warning' as const },
  { key: 'atendido', label: 'Atendido', variant: 'success' as const },
  { key: 'cancelado', label: 'Cancelado', variant: 'destructive' as const },
];

export default function TurnosMobileList({
  turnos,
  onTurnoCreated,
  invalidateTurnos,
  especialistas,
  especialidades,
  loadingTurnos,
  initialFilters,
  activeFilters,
  pagination,
  allowedPageSizes,
  onPageChange,
  onPageSizeChange,
}: TurnosMobileListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const getTurnosSnapshots = () => {
    return queryClient.getQueriesData<TurnoConDetalles[]>({ queryKey: turnoKeys.lists() });
  };

  const restoreTurnosSnapshots = (snapshots: Array<[readonly unknown[], TurnoConDetalles[] | undefined]>) => {
    for (const [queryKey, data] of snapshots) {
      queryClient.setQueryData(queryKey, data);
    }
  };

  const updateTurnosLists = (updater: (rows: TurnoConDetalles[]) => TurnoConDetalles[]) => {
    queryClient.setQueriesData(
      { queryKey: turnoKeys.lists() },
      (oldData: unknown) => {
        if (!oldData) return oldData;

        if (Array.isArray(oldData)) {
          return updater(oldData as TurnoConDetalles[]);
        }

        if (
          typeof oldData === "object" &&
          oldData !== null &&
          "pages" in oldData &&
          Array.isArray((oldData as { pages: unknown[] }).pages)
        ) {
          const paged = oldData as { pages: unknown[] };
          return {
            ...paged,
            pages: paged.pages.map((page) =>
              Array.isArray(page) ? updater(page as TurnoConDetalles[]) : page
            ),
          };
        }

        if (
          typeof oldData === "object" &&
          oldData !== null &&
          "data" in oldData &&
          Array.isArray((oldData as { data: unknown }).data)
        ) {
          const withData = oldData as { data: TurnoConDetalles[] } & Record<string, unknown>;
          return {
            ...withData,
            data: updater(withData.data),
          };
        }

        return oldData;
      }
    );
  };

  const [searchTerm, setSearchTerm] = useState(activeFilters.search ?? '');
  const lastPushedSearchRef = useRef(activeFilters.search ?? '');
  const [showNuevoTurnoModal, setShowNuevoTurnoModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEspecialistasList, setShowEspecialistasList] = useState(false);
  const [showEspecialidadesList, setShowEspecialidadesList] = useState(false);

  // Sincroniza desde URL externa (back/forward, limpiar filtros, etc.) sin pisar
  // un input "en vuelo" cuyo cambio aún no fue pusheado.
  useEffect(() => {
    const incoming = activeFilters.search ?? '';
    if (incoming !== lastPushedSearchRef.current) {
      lastPushedSearchRef.current = incoming;
      setSearchTerm(incoming);
    }
  }, [activeFilters.search]);

  // Debounce: al tipear, espera 400ms y empuja el search al URL como query param
  // (lo cual dispara el refetch via React Query con el nuevo filtro server-side).
  useEffect(() => {
    const nextSearch = searchTerm.trim();
    if (nextSearch === lastPushedSearchRef.current) return;

    const timeoutId = setTimeout(() => {
      lastPushedSearchRef.current = nextSearch;
      const params = new URLSearchParams(window.location.search);
      if (nextSearch) {
        params.set('search', nextSearch);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.replace(`/turnos?${params.toString()}`);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, router]);

  // ============= ESTADO DE FILTROS (multi-select) =============
  const [fechaDesde, setFechaDesde] = useState(initialFilters.fecha_desde);
  const [fechaHasta, setFechaHasta] = useState(initialFilters.fecha_hasta);
  const [especialistaIds, setEspecialistaIds] = useState<string[]>(initialFilters.especialista_ids ?? []);
  const [especialidadIds, setEspecialidadIds] = useState<string[]>(initialFilters.especialidad_ids ?? []);
  const [estados, setEstados] = useState<string[]>(initialFilters.estados ?? []);

  useEffect(() => {
    setFechaDesde(activeFilters.fecha_desde);
    setFechaHasta(activeFilters.fecha_hasta);
    setEspecialistaIds(activeFilters.especialista_ids ?? []);
    setEspecialidadIds(activeFilters.especialidad_ids ?? []);
    setEstados(activeFilters.estados ?? []);
  }, [
    activeFilters.fecha_desde,
    activeFilters.fecha_hasta,
    activeFilters.especialista_ids,
    activeFilters.especialidad_ids,
    activeFilters.estados,
  ]);

  const handleTurnoCreated = useCallback(() => {
    invalidateTurnos({
      scope: 'dates',
      date: activeFilters.fecha_desde,
    });
    onTurnoCreated?.();
  }, [invalidateTurnos, onTurnoCreated, activeFilters.fecha_desde]);

  // ✨ Número de talonario
  const calcularNumeroTalonario = useCallback((turno: TurnoConDetalles): string | null => {
    if (!turno.id_paciente || !turno.id_especialidad || !turno.numero_en_grupo || !turno.grupo_tratamiento?.cantidad_turnos_planificados) return null;
    return `${turno.numero_en_grupo}/${turno.grupo_tratamiento?.cantidad_turnos_planificados}`;
  }, []);

  // Aplicar filtros (navegar con query params)
  const aplicarFiltros = useCallback(() => {
    const params = new URLSearchParams();

    if (fechaDesde) params.set('desde', fechaDesde);
    if (fechaHasta) params.set('hasta', fechaHasta);

    if (especialistaIds.length > 0) {
      especialistaIds.forEach((id) => params.append('especialistas', id));
    } else {
      // Intención explícita: ver todos los especialistas aunque el usuario no gestione turnos.
      params.set('ver_todos', '1');
    }

    especialidadIds.forEach((id) => params.append('especialidades', id));
    estados.forEach((e) => params.append('estados', e));

    // Preserva el search libre que se maneja desde el header.
    const currentSearch = lastPushedSearchRef.current;
    if (currentSearch) {
      params.set('search', currentSearch);
    }

    params.set('page', '1');
    params.set('page_size', String(activeFilters.page_size || 20));

    router.push(`/turnos?${params.toString()}`);
    setShowFilters(false);
  }, [fechaDesde, fechaHasta, especialistaIds, especialidadIds, estados, router, activeFilters.page_size]);

  const limpiarFiltros = useCallback(() => {
    const hoy = todayYmd();
    const params = new URLSearchParams();
    params.set('desde', hoy);
    params.set('hasta', hoy);
    params.set('ver_todos', '1');
    params.set('page', '1');
    params.set('page_size', String(activeFilters.page_size || 20));

    // Limpia también el search local (el effect no lo va a re-pushear porque
    // matchea el activeFilters.search resultante = "").
    lastPushedSearchRef.current = '';
    setSearchTerm('');

    router.push(`/turnos?${params.toString()}`);
    setShowFilters(false);
  }, [router, activeFilters.page_size]);

  const contarFiltrosActivos = useMemo(() => {
    let count = 0;
    if (especialistaIds.length > 0) count++;
    if (especialidadIds.length > 0) count++;
    if (estados.length > 0) count++;
    return count;
  }, [especialistaIds, especialidadIds, estados]);

  // El filtrado por nombre/apellido de paciente se hace server-side via el RPC/PostgREST
  // embedded filter (ver `obtenerTurnosConFiltros`). Acá ya recibimos los turnos filtrados.

  // Agrupar por fecha y hora (solo para vista cards)
  const turnosAgrupadosPorFecha = useMemo(() => {
    return turnos.reduce((groups, turno) => {
      const fecha = turno.fecha;
      if (!groups[fecha]) groups[fecha] = {};
      const hora = turno.hora;
      if (!groups[fecha][hora]) groups[fecha][hora] = [];
      groups[fecha][hora].push(turno);
      return groups;
    }, {} as Record<string, Record<string, TurnoConDetalles[]>>);
  }, [turnos]);

  const fechasOrdenadas = useMemo(() => {
    return Object.keys(turnosAgrupadosPorFecha).sort();
  }, [turnosAgrupadosPorFecha]);

  const formatDate = useMemo(() => {
    return (fecha: string) => dayjs(fecha, 'YYYY-MM-DD').format('dddd D [de] MMMM [de] YYYY');
  }, []);

  const formatTime = useMemo(() => {
    return (hora: string) => dayjs(hora, 'HH:mm:ss').format('hh:mm A');
  }, []);

  const handleTurnoClick = useCallback((turnoId: string) => {
    router.push(`/turnos/${turnoId}`);
  }, [router]);

  // Toggles multi-select
  const toggleEspecialista = useCallback((id: string) => {
    setEspecialistaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleEspecialidad = useCallback((id: string) => {
    setEspecialidadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleEstado = useCallback((estado: string) => {
    setEstados((prev) => (prev.includes(estado) ? prev.filter((x) => x !== estado) : [...prev, estado]));
  }, []);

  return (
    <div className="h-[calc(100dvh-5rem)] lg:h-[100dvh] flex flex-col text-foreground overflow-hidden bg-muted/40">
      {/* Header mobile (back + título) — solo <md */}
      <header className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <IconButton
            aria-label="Volver"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => router.back()}
            className="-ml-2"
          />
          <h1 className="flex-1 text-base font-semibold text-center truncate">
            Turnos
          </h1>
          <span className="w-9" aria-hidden />
        </div>
      </header>

      {/* Page header desktop-ish — ≥md */}
      <div className="hidden md:block bg-background shrink-0">
        <PageHeader
          title="Turnos"
          actions={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => setShowNuevoTurnoModal(true)}
            >
              Nuevo turno
            </Button>
          }
        />
      </div>

      {/* Search + botón de filtros (todos los tamaños <lg) */}
      <div className="px-4 md:px-6 lg:px-8 py-3 flex items-center gap-2 bg-background shrink-0 border-b border-border md:border-0">
        <Input
          type="text"
          placeholder="Buscar por paciente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search />}
          className="flex-1"
        />
        <div className="relative shrink-0">
          <IconButton
            aria-label="Filtros"
            variant="outline"
            icon={<Filter className="w-5 h-5" />}
            onClick={() => setShowFilters(true)}
          />
          {contarFiltrosActivos > 0 && (
            <Badge
              variant="brand"
              size="sm"
              pill
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 justify-center pointer-events-none"
            >
              {contarFiltrosActivos}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-muted/40 md:bg-background">
        {/* Vista cards <md — FAB sticky adentro */}
        <div className="md:hidden flex flex-col min-h-full">
          <div className="flex-1 px-4 pt-4 text-black">
            {loadingTurnos ? (
              <UnifiedSkeletonLoader type="cards" showFilters={false} showHeader={false} showSearch={false} />
            ) : fechasOrdenadas.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-7 h-7" />}
                title={searchTerm ? 'No se encontraron resultados' : 'No hay turnos programados'}
                description={
                  searchTerm
                    ? 'Prueba con otro término de búsqueda'
                    : 'No hay turnos para los filtros seleccionados'
                }
              />
            ) : (
              <div className="space-y-8">
                {fechasOrdenadas.map((fechaActual) => {
                  const horasEnFecha = Object.keys(turnosAgrupadosPorFecha[fechaActual]).sort();
                  const totalTurnosFecha = horasEnFecha.reduce(
                    (sum, hora) => sum + turnosAgrupadosPorFecha[fechaActual][hora].length,
                    0,
                  );

                  return (
                    <div key={fechaActual} className="space-y-4">
                      <div className="text-sm text-muted-foreground capitalize font-medium sticky top-0 bg-muted/40 py-2 z-10">
                        {formatDate(fechaActual)} • {totalTurnosFecha} turno{totalTurnosFecha !== 1 ? 's' : ''}
                      </div>

                      <div className="space-y-6">
                        {horasEnFecha.map((hora) => (
                          <div key={`${fechaActual}-${hora}`} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="brand" size="lg" className="min-w-[80px] justify-center font-medium">
                                {formatTime(hora)}
                              </Badge>
                              <div className="flex-1 h-px bg-border" />
                            </div>

                            <div className="space-y-3">
                              {turnosAgrupadosPorFecha[fechaActual][hora].map((turno) => (
                                <TurnoCard
                                  key={turno.id_turno}
                                  turno={turno}
                                  numeroTalonario={calcularNumeroTalonario(turno)}
                                  onClick={() => handleTurnoClick(turno.id_turno.toString())}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Espacio en blanco al final + FAB sticky dentro del container de cards */}
          <div className="h-20 shrink-0" aria-hidden />
          <div className="sticky bottom-4 z-20 -mt-16 flex justify-end pr-4 pointer-events-none">
            <button
              type="button"
              aria-label="Agregar nuevo turno"
              onClick={() => setShowNuevoTurnoModal(true)}
              className="pointer-events-auto h-14 w-14 rounded-full bg-brand text-brand-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabla ≥md */}
        <div className="hidden md:block px-6 lg:px-8 py-4">
          {loadingTurnos ? (
            <UnifiedSkeletonLoader type="table" rows={5} columns={6} showHeader={false} showFilters={false} showSearch={false} />
          ) : (
            <TurnosTable
              turnos={turnos as TurnoWithRelations[]}
              invalidateTurnos={invalidateTurnos}
              turnosLoading={false}
              isMobile={false}
            />
          )}
        </div>
      </div>

      {/* Paginación abajo */}
      {pagination && (
        <div className="px-3 md:px-6 lg:px-8 pt-2 pb-2 shrink-0 bg-background border-t border-border">
          <PaginacionBar
            variant="mobile"
            pagination={pagination}
            visibleCount={turnos.length}
            pageSize={activeFilters.page_size}
            allowedPageSizes={allowedPageSizes}
            itemLabel="turnos"
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            loading={loadingTurnos}
          />
        </div>
      )}

      {/* Drawer de filtros */}
      {showFilters && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setShowFilters(false)}
          />

          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 shadow-2xl flex flex-col max-h-[90vh]"
            style={{ animation: 'slide-up 0.3s ease-out' }}
          >
            <style jsx>{`
              @keyframes slide-up {
                from { transform: translateY(100%); }
                to   { transform: translateY(0); }
              }
            `}</style>

            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="text-lg font-semibold text-foreground">Filtros</h3>
              <IconButton
                aria-label="Cerrar filtros"
                variant="ghost"
                size="sm"
                icon={<X className="w-5 h-5" />}
                onClick={() => setShowFilters(false)}
              />
            </div>

            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              {/* Rango de fechas */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">Rango de fechas</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Desde</label>
                    <Input
                      type="date"
                      value={fechaDesde}
                      max={fechaHasta || undefined}
                      onChange={(e) => setFechaDesde(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
                    <Input
                      type="date"
                      value={fechaHasta}
                      min={fechaDesde || undefined}
                      onChange={(e) => setFechaHasta(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Especialistas (dropdown colapsable) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowEspecialistasList((prev) => !prev)}
                  aria-expanded={showEspecialistasList}
                  className="w-full h-10 px-3 flex items-center justify-between gap-2 border border-input rounded-md bg-background hover:border-muted-foreground/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    Especialistas
                    {especialistaIds.length > 0 && (
                      <Badge variant="brand" size="sm" pill>
                        {especialistaIds.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      'text-muted-foreground transition-transform shrink-0',
                      showEspecialistasList && 'rotate-180',
                    )}
                  />
                </button>

                {showEspecialistasList && (
                  <div className="border border-input rounded-md bg-background overflow-hidden">
                    {especialistaIds.length > 0 && (
                      <div className="px-2 py-1.5 border-b border-border flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEspecialistaIds([])}
                          className="text-xs text-brand hover:underline"
                        >
                          Limpiar ({especialistaIds.length})
                        </button>
                      </div>
                    )}
                    <div className="max-h-56 overflow-y-auto p-1">
                      {especialistas.length === 0 && (
                        <p className="text-sm text-muted-foreground px-2 py-1.5">Sin opciones</p>
                      )}
                      {especialistas.map((esp) => {
                        const checked = especialistaIds.includes(esp.id_usuario);
                        return (
                          <label
                            key={esp.id_usuario}
                            className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleEspecialista(esp.id_usuario)}
                            />
                            <span className="text-sm flex items-center gap-2 flex-1 min-w-0">
                              {esp.color && (
                                <span
                                  aria-hidden="true"
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: esp.color }}
                                />
                              )}
                              <span className="truncate">{esp.apellido}, {esp.nombre}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Especialidades (dropdown colapsable) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowEspecialidadesList((prev) => !prev)}
                  aria-expanded={showEspecialidadesList}
                  className="w-full h-10 px-3 flex items-center justify-between gap-2 border border-input rounded-md bg-background hover:border-muted-foreground/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    Especialidades
                    {especialidadIds.length > 0 && (
                      <Badge variant="brand" size="sm" pill>
                        {especialidadIds.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      'text-muted-foreground transition-transform shrink-0',
                      showEspecialidadesList && 'rotate-180',
                    )}
                  />
                </button>

                {showEspecialidadesList && (
                  <div className="border border-input rounded-md bg-background overflow-hidden">
                    {especialidadIds.length > 0 && (
                      <div className="px-2 py-1.5 border-b border-border flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEspecialidadIds([])}
                          className="text-xs text-brand hover:underline"
                        >
                          Limpiar ({especialidadIds.length})
                        </button>
                      </div>
                    )}
                    <div className="max-h-56 overflow-y-auto p-1">
                      {especialidades
                        .filter((esp) => !esp.nombre?.toLowerCase().includes('pilates'))
                        .map((esp) => {
                          const id = esp.id_especialidad.toString();
                          const checked = especialidadIds.includes(id);
                          return (
                            <label
                              key={esp.id_especialidad}
                              className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleEspecialidad(id)}
                              />
                              <span className="text-sm truncate">{esp.nombre}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Estados (botones multi-select) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-foreground">Estado del turno</label>
                  {estados.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEstados([])}
                      className="text-xs text-brand hover:underline"
                    >
                      Limpiar ({estados.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ESTADOS_OPCIONES.map(({ key, label, variant }) => {
                    const isActive = estados.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleEstado(key)}
                        className={cn(
                          'h-10 px-3 rounded-md text-sm font-medium transition-colors',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isActive && variant === 'info' && 'bg-info text-info-foreground',
                          isActive && variant === 'warning' && 'bg-warning text-warning-foreground',
                          isActive && variant === 'success' && 'bg-success text-success-foreground',
                          isActive && variant === 'destructive' && 'bg-destructive text-destructive-foreground',
                          !isActive && 'bg-muted text-foreground hover:bg-muted/70',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-3 shrink-0">
              <Button variant="outline" fullWidth onClick={limpiarFiltros}>
                Limpiar
              </Button>
              <Button variant="primary" fullWidth onClick={aplicarFiltros}>
                Aplicar
              </Button>
            </div>
          </div>
        </>
      )}

      <NuevoTurnoModal
        isOpen={showNuevoTurnoModal}
        onClose={() => setShowNuevoTurnoModal(false)}
        onTurnoCreated={handleTurnoCreated}
        fechaSeleccionada={dayjs(activeFilters.fecha_desde, 'YYYY-MM-DD').toDate()}
        especialistaPreseleccionado={especialistaIds.length === 1 ? especialistaIds[0] : null}
      />
    </div>
  );
}

// Mapeo estado → variant del Badge.
const estadoVariant: Record<string, BadgeProps['variant']> = {
  programado: 'info',
  pendiente: 'warning',
  atendido: 'success',
  en_curso: 'success',
  completado: 'default',
  cancelado: 'destructive',
  no_asistio: 'warning',
  vencido: 'warning',
};

// Background sutil de la card según estado.
const estadoCardBg: Record<string, string> = {
  vencido: 'bg-warning/5',
  atendido: 'bg-success/5',
  cancelado: 'bg-destructive/5',
};

function TurnoCard({
  turno,
  numeroTalonario,
  onClick,
}: {
  turno: TurnoConDetalles;
  numeroTalonario: string | null;
  onClick: () => void;
}) {
  const estado = (turno.estado || 'programado').toLowerCase();
  const cardBg = estadoCardBg[estado] ?? 'bg-card';

  return (
    <Card
      interactive
      padding="md"
      onClick={onClick}
      className={cn('cursor-pointer rounded-xl', cardBg)}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <User className="w-4 h-4 text-brand shrink-0" />
            <span className="font-semibold text-foreground truncate">
              {turno.paciente
                ? `${turno.paciente.nombre} ${turno.paciente.apellido}`
                : 'Sin paciente'}
            </span>
            {numeroTalonario && (
              <Badge variant="info" size="sm">
                📋 {numeroTalonario}
              </Badge>
            )}
          </div>
          {turno.paciente?.dni && (
            <p className="text-sm text-muted-foreground">
              DNI: {turno.paciente.dni}
            </p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>

      {turno.especialista && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            aria-hidden="true"
            className="w-3 h-3 rounded-full shrink-0"
            style={{
              backgroundColor: turno.especialista.color || 'var(--brand)',
            }}
          />
          <span className="text-sm text-foreground/80">
            {turno.especialista.nombre} {turno.especialista.apellido}
          </span>
          {turno.especialidad && (
            <span className="text-sm text-muted-foreground">
              • {turno.especialidad.nombre}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {turno.box && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Box {turno.box.numero}
            </span>
          )}
          {turno.paciente?.telefono && (
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {turno.paciente.telefono}
            </span>
          )}
        </div>
        <Badge variant={estadoVariant[estado] ?? 'default'} size="sm">
          {estado.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {turno.observaciones && (
        <div className="mt-3 p-3 bg-muted/40 rounded-md">
          <p className="text-sm text-foreground/80">{turno.observaciones}</p>
        </div>
      )}
    </Card>
  );
}
