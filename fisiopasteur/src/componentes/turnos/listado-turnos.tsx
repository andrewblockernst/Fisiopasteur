"use client";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DetalleTurnoDialog } from "@/componentes/turnos/detalle-turno-dialog";
import { marcarComoAtendido, cancelarTurno, eliminarTurno, actualizarEstadoTurnosMasivo } from "@/lib/actions/turno.action";
import { useToastStore } from "@/stores/toast-store";
import { useAuth } from "@/hooks/usePerfil";
import { turnoKeys, type InvalidateTurnosOptions } from "@/hooks/useTurnosQuery";
import EditarTurnoModal from "./editar-turno-modal";
import type { TurnoWithRelations } from "@/types";
import { CheckCircle, XCircle, Edit, Trash, X } from "lucide-react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import UnifiedSkeletonLoader from "../unified-skeleton-loader";
import { nowIso } from "@/lib/dayjs";
import CompactListTable from "@/componentes/tablas/compact-list-table";
import { RowActionsMenu, RowActionsItem, RowActionsSeparator } from "@/componentes/tablas/row-actions-menu";
import {
  puedeConfirmar,
  puedeCancelar,
  puedeEditar,
  puedeEliminar,
  ESTADOS_PARA_CONFIRMAR,
  ESTADOS_PARA_CANCELAR,
} from "@/lib/utils/turno-acciones";

type TurnosTableProps = {
  turnos: TurnoWithRelations[];
  invalidateTurnos: (options?: InvalidateTurnosOptions) => void;
  turnosLoading: boolean;
  isMobile: boolean;
};

export default function TurnosTable({ turnos, invalidateTurnos, turnosLoading, isMobile }: TurnosTableProps) {

  // const router = useRouter();
  const toast = useToastStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getTurnosSnapshots = () => {
    return queryClient.getQueriesData<unknown>({ queryKey: turnoKeys.lists() });
  };

  const restoreTurnosSnapshots = (snapshots: Array<[readonly unknown[], unknown]>) => {
    for (const [queryKey, data] of snapshots) {
      queryClient.setQueryData(queryKey, data);
    }
  };

  const updateTurnosLists = (updater: (rows: TurnoWithRelations[]) => TurnoWithRelations[]) => {
    queryClient.setQueriesData(
      { queryKey: turnoKeys.lists() },
      (oldData: unknown) => {
        if (!oldData) return oldData;

        // Soporta listas planas y caches paginados sin asumir forma única.
        if (Array.isArray(oldData)) {
          return updater(oldData as TurnoWithRelations[]);
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
              Array.isArray(page) ? updater(page as TurnoWithRelations[]) : page
            ),
          };
        }

        if (
          typeof oldData === "object" &&
          oldData !== null &&
          "data" in oldData &&
          Array.isArray((oldData as { data: unknown }).data)
        ) {
          const withData = oldData as { data: TurnoWithRelations[] } & Record<string, unknown>;
          return {
            ...withData,
            data: updater(withData.data),
          };
        }

        return oldData;
      }
    );
  };

  const userId = String(user?.id_usuario || user?.id || '');
  const puedeAccionarTurno = (turno: TurnoWithRelations) => {
    if (user?.puedeGestionarTurnos) return true;
    return String(turno.id_especialista || '') === userId;
  };
  const mostrarSinPermisos = () => {
    toast.addToast({
      variant: "error",
      message: "Sin permisos",
      description: "Solo puedes gestionar turnos propios",
    });
  };
  
  // ============= ESTADO PARA MODAL DE DETALLE =============
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoWithRelations | null>(null);
  const [numeroTalonarioSeleccionado, setNumeroTalonarioSeleccionado] = useState<string | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);

  // ============= ESTADO PARA MODAL DE EDICIÓN =============
  const [turnoParaEditar, setTurnoParaEditar] = useState<TurnoWithRelations | null>(null);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);

  // ============= ESTADO PARA MODAL DE CONFIRMACIÓN =============
  const [confirmDialogAbierto, setConfirmDialogAbierto] = useState(false);
  const [turnoParaEliminar, setTurnoParaEliminar] = useState<TurnoWithRelations | null>(null);
  const [selectedTurnoIds, setSelectedTurnoIds] = useState<number[]>([]);
  const [selectionAnchorTurnoId, setSelectionAnchorTurnoId] = useState<number | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkEliminarDialogAbierto, setBulkEliminarDialogAbierto] = useState(false);

  // ============= FUNCIONES DE ACCIONES =============
  const handleMarcarAtendido = async (turno: TurnoWithRelations) => {
    if (!puedeAccionarTurno(turno)) {
      mostrarSinPermisos();
      return;
    }

    const snapshots = getTurnosSnapshots();
    updateTurnosLists((rows) =>
      rows.map((row) =>
        row.id_turno === turno.id_turno
          ? { ...row, estado: "atendido", updated_at: nowIso() }
          : row
      )
    );

    const resultado = await marcarComoAtendido(turno.id_turno);
    
    if (resultado.success) {
      toast.addToast({
        variant: "success",
        message: "Turno marcado como atendido",
      });
      invalidateTurnos({ scope: "statuses", statuses: ["programado", "pendiente", "atendido"] });
    } else {
      restoreTurnosSnapshots(snapshots);
      toast.addToast({
        variant: "error",
        message: resultado.error || "Error al marcar turno",
      });
    }
  };

  const handleCancelar = async (turno: TurnoWithRelations) => {
    if (!puedeAccionarTurno(turno)) {
      mostrarSinPermisos();
      return;
    }

    const snapshots = getTurnosSnapshots();
    updateTurnosLists((rows) =>
      rows.map((row) =>
        row.id_turno === turno.id_turno
          ? { ...row, estado: "cancelado", updated_at: nowIso() }
          : row
      )
    );

    const resultado = await cancelarTurno(turno.id_turno);
    
    if (resultado.success) {
      toast.addToast({
        variant: "success",
        message: "Turno cancelado",
      });
      invalidateTurnos({ scope: "statuses", statuses: ["programado", "pendiente", "cancelado"] });
    } else {
      restoreTurnosSnapshots(snapshots);
      toast.addToast({
        variant: "error",
        message: resultado.error || "Error al cancelar turno",
      });
    }
  };

  const handleEliminar = async (turno: TurnoWithRelations) => {
    if (!puedeAccionarTurno(turno)) {
      mostrarSinPermisos();
      return;
    }

    // Abrir modal de confirmación
    setTurnoParaEliminar(turno);
    setConfirmDialogAbierto(true);
  };

  const confirmarEliminacion = async () => {
    if (!turnoParaEliminar) return;
    if (!puedeAccionarTurno(turnoParaEliminar)) {
      mostrarSinPermisos();
      setConfirmDialogAbierto(false);
      setTurnoParaEliminar(null);
      return;
    }

    const snapshots = getTurnosSnapshots();
    updateTurnosLists((rows) => rows.filter((row) => row.id_turno !== turnoParaEliminar.id_turno));

    const resultado = await eliminarTurno(turnoParaEliminar.id_turno);
    
    if (resultado.success) {
      toast.addToast({
        variant: "success",
        message: "Turno eliminado",
        description: "El turno se eliminó correctamente"
      });
      invalidateTurnos({ scope: "lists" });
    } else {
      restoreTurnosSnapshots(snapshots);
      toast.addToast({
        variant: "error",
        message: resultado.error || "Error al eliminar turno",
      });
    }
    
    // Cerrar modal y limpiar estado
    setConfirmDialogAbierto(false);
    setTurnoParaEliminar(null);
  };

  const handleEditar = (turno: TurnoWithRelations) => {
    if (!puedeAccionarTurno(turno)) {
      mostrarSinPermisos();
      return;
    }

    setTurnoParaEditar(turno);
    setModalEditarAbierto(true);
  };

  // Función para formatear fecha como DD/MM/YYYY
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr + 'T00:00:00'); // Evitar problemas de zona horaria
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Función para formatear hora como HH:MM
  const formatearHora = (horaStr: string) => {
    if (!horaStr) return '-';
    return horaStr.slice(0, 5); // Solo toma HH:MM
  };

  // Función para determinar el color de fondo de la fila
  const getRowClassName = (turno: any) => {
    let baseClass = "border-t hover:bg-gray-50 border-l-4 border-l-gray-200 transition-colors";
    if (turno.estado === 'atendido') {
      baseClass += " bg-green-100 border-l-4 border-l-green-500";
    }
    if (turno.estado === 'cancelado') {
      baseClass += " bg-red-100 border-l-4 border-l-red-500";
    }
    // ✅ Turnos pendientes (pasados sin actualizar) con fondo amarillo para destacar
    if (turno.estado === 'pendiente') {
      baseClass += " bg-yellow-50 border-l-4 border-l-yellow-500";
    }
    return baseClass;
  };

  // Función para el estilo del texto según estado
  const getTextStyle = (turno: any) => {
    if (turno.estado === 'cancelado') {
      return "text-gray-500"; // Solo color más suave, sin tachado
    }
    return "text-gray-900";
  };

  // Función para verificar si es turno de Pilates
  const esTurnoPilates = (turno: any) => {
    // Verificar por nombre de especialidad (case insensitive)
    if (turno.especialidad && turno.especialidad.nombre) {
      return turno.especialidad.nombre.toLowerCase().includes('pilates');
    }
    return false;
  };

  // Filtrar turnos: excluir Pilates y luego ordenar
  const turnosOrdenados = useMemo(() => {
    return turnos
      ?.filter(turno => !esTurnoPilates(turno)) // Filtrar Pilates
      ?.sort((a, b) => {
        // Prioridad por estado: pendiente (0), programado (1), atendido (2), cancelado (3)
        const prioridadEstado = (estado: string) => {
          switch (estado?.toLowerCase()) {
            case 'pendiente': return 0; // ⚠️ Los pendientes primero para que se vean
            case 'programado': return 1;
            case 'atendido': return 2;
            case 'cancelado': return 3;
            case '': return 4;
            default: return 5;
          }
        };

        const prioridadA = prioridadEstado(a.estado || '');
        const prioridadB = prioridadEstado(b.estado || '');

        // Si tienen diferente estado, ordenar por prioridad
        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB;
        }

        // Si tienen el mismo estado, ordenar por fecha y hora
        const fechaA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
        const fechaB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
        return fechaA.getTime() - fechaB.getTime();
      }) || [];
  }, [turnos]);

  // ✅ FUNCIÓN: Calcular número de turno en el paquete (talonario) usando datos persistidos
  const calcularNumeroTalonario = (turno: any) => {
    if (!turno.id_grupo_tratamiento) return null;

    const posicion = turno.numero_en_grupo;
    const total = turno.grupo_tratamiento?.cantidad_turnos_planificados;

    if (!posicion || !total || total <= 1) return null;

    return `${posicion}/${total}`;
  };

  // ============= FUNCIÓN PARA ABRIR DETALLE DEL TURNO =============
  const abrirDetalleTurno = (turno: TurnoWithRelations) => {
    setTurnoSeleccionado(turno);
    setNumeroTalonarioSeleccionado(calcularNumeroTalonario(turno));
    setModalDetalleAbierto(true);
  };

  const toggleTurnoSelection = (turnoId: number, checked: boolean, useShiftRange = false) => {
    if (useShiftRange && selectionAnchorTurnoId !== null && selectionAnchorTurnoId !== turnoId) {
      const startIndex = turnosOrdenados.findIndex((t) => t.id_turno === selectionAnchorTurnoId);
      const endIndex = turnosOrdenados.findIndex((t) => t.id_turno === turnoId);

      if (startIndex !== -1 && endIndex !== -1) {
        const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const rangeIds = turnosOrdenados.slice(from, to + 1).map((t) => t.id_turno);

        setSelectedTurnoIds((prev) => {
          const next = new Set(prev);
          for (const id of rangeIds) {
            if (checked) {
              next.add(id);
            } else {
              next.delete(id);
            }
          }
          return Array.from(next);
        });
        setSelectionAnchorTurnoId(turnoId);
        return;
      }
    }

    setSelectedTurnoIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(turnoId);
      } else {
        next.delete(turnoId);
      }
      return Array.from(next);
    });
    setSelectionAnchorTurnoId(turnoId);
  };

  const clearSelection = () => {
    setSelectedTurnoIds([]);
    setSelectionAnchorTurnoId(null);
  };

  const visibleTurnoIds = useMemo(
    () => turnosOrdenados.map((t) => t.id_turno),
    [turnosOrdenados]
  );
  const selectedVisibleCount = useMemo(
    () => visibleTurnoIds.filter((id) => selectedTurnoIds.includes(id)).length,
    [visibleTurnoIds, selectedTurnoIds]
  );
  const allVisibleSelected = visibleTurnoIds.length > 0 && selectedVisibleCount === visibleTurnoIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedTurnoIds((prev) => prev.filter((id) => !visibleTurnoIds.includes(id)));
    } else {
      setSelectedTurnoIds((prev) => Array.from(new Set([...prev, ...visibleTurnoIds])));
    }
    setSelectionAnchorTurnoId(null);
  };

  const headerCheckboxRef = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = someVisibleSelected;
  };

  useEffect(() => {
    // Ante cualquier cambio del listado visible, resetea selección masiva.
    setSelectedTurnoIds((prev) => (prev.length > 0 ? [] : prev));
    setSelectionAnchorTurnoId(null);
  }, [turnos]);

  const handleBulkAction = async (action: "atendido" | "cancelado" | "eliminado") => {
    if (bulkSubmitting || selectedTurnoIds.length === 0) return;

    const seleccionados = turnosOrdenados.filter((t) => selectedTurnoIds.includes(t.id_turno));
    const elegibles = seleccionados.filter((t) => {
      if (action === "atendido") return puedeConfirmar(t.estado);
      if (action === "cancelado") return puedeCancelar(t.estado);
      return puedeEliminar(t.estado);
    });
    const accionables = elegibles.filter((t) => puedeAccionarTurno(t));

    if (accionables.length === 0) {
      const estadosTxt = action === "atendido"
        ? ESTADOS_PARA_CONFIRMAR.join(", ")
        : action === "cancelado"
          ? ESTADOS_PARA_CANCELAR.join(", ")
          : "programado, pendiente, atendido, cancelado";
      toast.addToast({
        variant: "error",
        message: "No hay turnos accionables",
        description: `Selecciona turnos en estado ${estadosTxt} y con permisos para gestionarlos.`,
      });
      return;
    }

    if (action === "eliminado") {
      // Confirmación vía BaseDialog — la ejecución continúa en confirmarBulkEliminar.
      setBulkEliminarDialogAbierto(true);
      return;
    }

    await ejecutarBulkAction(action, accionables.map((t) => t.id_turno));
  };

  const ejecutarBulkAction = async (
    action: "atendido" | "cancelado" | "eliminado",
    ids: number[],
  ) => {
    if (ids.length === 0) return;
    setBulkSubmitting(true);

    const result = await actualizarEstadoTurnosMasivo(ids, action);

    if (!result.success) {
      toast.addToast({
        variant: "error",
        message: "No se pudieron actualizar los turnos",
        description: result.error,
      });
      setBulkSubmitting(false);
      return;
    }

    const successCount = result.updatedIds.length;
    const failCount = result.failedCount;

    if (successCount > 0) {
      invalidateTurnos({
        scope: "statuses",
        statuses: action === "atendido"
          ? ["programado", "pendiente", "atendido"]
          : action === "cancelado"
            ? ["programado", "pendiente", "cancelado"]
            : ["programado", "pendiente", "atendido", "cancelado", "eliminado"],
      });
      toast.addToast({
        variant: "success",
        message: action === "atendido"
          ? `${successCount} turno(s) marcados como atendidos`
          : action === "cancelado"
            ? `${successCount} turno(s) cancelados`
            : `${successCount} turno(s) eliminados`,
      });
    }

    if (failCount > 0) {
      toast.addToast({
        variant: "error",
        message: `No se pudieron actualizar ${failCount} turno(s)`,
      });
    }

    clearSelection();
    setBulkSubmitting(false);
  };

  const confirmarBulkEliminar = async () => {
    const seleccionados = turnosOrdenados.filter((t) => selectedTurnoIds.includes(t.id_turno));
    const accionables = seleccionados
      .filter((t) => puedeEliminar(t.estado))
      .filter((t) => puedeAccionarTurno(t));
    setBulkEliminarDialogAbierto(false);
    await ejecutarBulkAction("eliminado", accionables.map((t) => t.id_turno));
  };

  const cantidadBulkEliminar = selectedTurnoIds.length;

  if (turnosLoading) {
    return (
      <UnifiedSkeletonLoader
        type={isMobile ? "list" : "table"}
        rows={5}
        columns={6}
        showHeader={false}
        showFilters={false}
        showSearch={false}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {selectedTurnoIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2">
          <span className="text-sm text-gray-700">
            {selectedTurnoIds.length} turno(s) seleccionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 rounded-md border-2 border-success bg-transparent px-3 text-xs font-semibold text-success transition-colors hover:bg-success hover:text-success-foreground disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleBulkAction("atendido")}
              disabled={bulkSubmitting}
            >
              Marcar como atendidos
            </button>
            <button
              type="button"
              className="h-8 rounded-md border-2 border-destructive bg-transparent px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleBulkAction("cancelado")}
              disabled={bulkSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="h-8 rounded-md border-2 border-destructive bg-transparent px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleBulkAction("eliminado")}
              disabled={bulkSubmitting}
            >
              Eliminar
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              onClick={clearSelection}
              disabled={bulkSubmitting}
              aria-label="Limpiar selección"
              title="Limpiar selección"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

        <CompactListTable className="flex-1 min-h-0">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="w-10 px-2 py-2">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-input text-brand focus:ring-brand"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  disabled={visibleTurnoIds.length === 0}
                  aria-label="Seleccionar todos los turnos visibles"
                />
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Hora</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Especialista</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
              <th className="px-4 py-2 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">Box</th>
              <th className="px-4 py-2 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">N°</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-14">Acciones</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {turnosOrdenados.map((t) => {
              const numeroTalonario = calcularNumeroTalonario(t);
              const turnoEsPropio = puedeAccionarTurno(t);

              return (
              <tr 
                key={t.id_turno} 
                className={`${getRowClassName(t)} cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => abrirDetalleTurno(t)}
              >
                <td className="px-3 py-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-input text-brand focus:ring-brand"
                    checked={selectedTurnoIds.includes(t.id_turno)}
                    readOnly
                    onClick={(e) =>
                      toggleTurnoSelection(
                        t.id_turno,
                        !selectedTurnoIds.includes(t.id_turno),
                        e.shiftKey
                      )
                    }
                    aria-label={`Seleccionar turno ${t.id_turno}`}
                  />
                </td>
                <td className={`px-4 py-0 text-sm ${getTextStyle(t)}`}>
                  {formatearFecha(t.fecha)}
                </td>
                <td className={`px-4 py-0 text-sm font-mono ${getTextStyle(t)}`}>
                  {formatearHora(t.hora)}
                </td>
                <td className={`px-4 py-0 text-sm ${getTextStyle(t)}`}>
                  {t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : "Sin asignar"}
                </td>
                <td className={`px-4 py-0 text-sm ${getTextStyle(t)}`}>
                  {t.especialista ? (
                    <span className="inline-flex items-center gap-2">
                      <span 
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: t.especialista.color || '#9C1838' }}
                      />
                      {`${t.especialista.apellido}, ${t.especialista.nombre}`}
                    </span>
                  ) : "Sin asignar"}
                </td>
                <td className={`px-4 py-0 text-sm ${getTextStyle(t)}`}>
                  {t.especialidad ? t.especialidad.nombre : "Sin asignar"}
                </td>
                {/* ✅ COLUMNA: Box asignado */}
                <td className={`px-4 py-0 text-sm text-center ${getTextStyle(t)}`}>
                  {t.box ? `${t.box.numero}` : <span className="text-gray-400">—</span>}
                </td>
                {/* ✅ COLUMNA: Número de talonario */}
                <td className="px-4 py-0 text-center text-black text-sm">
                  {numeroTalonario ? (
                    <span className="text-xs font-semibold">{numeroTalonario}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                {/* ✅ COLUMNA DE ACCIONES - Evitar propagación del click */}
                <td className="px-2 py-0" onClick={(e) => e.stopPropagation()}>
                  {t.id_paciente && (
                    <>
                    {/* Iconos visibles en pantallas anchas (xl+) */}
                    <div className="hidden xl:flex items-center gap-1">
                      {puedeConfirmar(t.estado) && (
                        <button
                          type="button"
                          aria-label="Marcar como atendido"
                          title="Marcar como atendido"
                          className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${turnoEsPropio ? 'text-green-600 hover:bg-green-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                          onClick={() => turnoEsPropio ? handleMarcarAtendido(t) : mostrarSinPermisos()}
                          disabled={!turnoEsPropio}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {puedeCancelar(t.estado) && (
                        <button
                          type="button"
                          aria-label="Cancelar turno"
                          title="Cancelar turno"
                          className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${turnoEsPropio ? 'text-red-600 hover:bg-red-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                          onClick={() => turnoEsPropio ? handleCancelar(t) : mostrarSinPermisos()}
                          disabled={!turnoEsPropio}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {puedeEditar(t.estado) && (
                        <button
                          type="button"
                          aria-label="Editar turno"
                          title="Editar"
                          className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${turnoEsPropio ? 'text-gray-700 hover:bg-muted cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                          onClick={() => turnoEsPropio ? handleEditar(t) : mostrarSinPermisos()}
                          disabled={!turnoEsPropio}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {puedeEliminar(t.estado) && (
                        <button
                          type="button"
                          aria-label="Eliminar turno"
                          title="Eliminar"
                          className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${turnoEsPropio ? 'text-red-600 hover:bg-red-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                          onClick={() => turnoEsPropio ? handleEliminar(t) : mostrarSinPermisos()}
                          disabled={!turnoEsPropio}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown 3-puntos en pantallas más chicas */}
                    <div className="xl:hidden">
                      <RowActionsMenu ariaLabel="Acciones del turno">
                        {puedeConfirmar(t.estado) && (
                          <RowActionsItem
                            variant="success"
                            icon={<CheckCircle size={16} />}
                            onSelect={() => (turnoEsPropio ? handleMarcarAtendido(t) : mostrarSinPermisos())}
                            disabled={!turnoEsPropio}
                          >
                            Marcar como Atendido
                          </RowActionsItem>
                        )}

                        {puedeCancelar(t.estado) && (
                          <RowActionsItem
                            variant="destructive"
                            icon={<XCircle size={16} />}
                            onSelect={() => (turnoEsPropio ? handleCancelar(t) : mostrarSinPermisos())}
                            disabled={!turnoEsPropio}
                          >
                            Cancelar Turno
                          </RowActionsItem>
                        )}

                        {(puedeConfirmar(t.estado) || puedeCancelar(t.estado)) && (puedeEditar(t.estado) || puedeEliminar(t.estado)) && (
                          <RowActionsSeparator />
                        )}

                        {puedeEditar(t.estado) && (
                          <RowActionsItem
                            icon={<Edit size={16} />}
                            onSelect={() => (turnoEsPropio ? handleEditar(t) : mostrarSinPermisos())}
                            disabled={!turnoEsPropio}
                          >
                            Editar
                          </RowActionsItem>
                        )}

                        {puedeEliminar(t.estado) && (
                          <RowActionsItem
                            variant="destructive"
                            icon={<Trash size={16} />}
                            onSelect={() => (turnoEsPropio ? handleEliminar(t) : mostrarSinPermisos())}
                            disabled={!turnoEsPropio}
                          >
                            Eliminar
                          </RowActionsItem>
                        )}
                      </RowActionsMenu>
                    </div>
                    </>
                  )}
                </td>
              </tr>
            )})}
            {(!turnosOrdenados || turnosOrdenados.length === 0) && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={9}>
                  <div className="flex flex-col items-center gap-2">
                    <span>No hay turnos para mostrar</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
      </CompactListTable>

    {/* Modal de Detalle del Turno */}
    <DetalleTurnoDialog
      isOpen={modalDetalleAbierto}
      onClose={() => setModalDetalleAbierto(false)}
      turno={turnoSeleccionado}
      numeroTalonario={numeroTalonarioSeleccionado}
      onTurnoActualizado={() => invalidateTurnos()}
    />

    {/* Modal de Edición del Turno */}
    {modalEditarAbierto && turnoParaEditar && (
      <EditarTurnoModal
        turno={turnoParaEditar as any}
        open={modalEditarAbierto}
        onClose={() => setModalEditarAbierto(false)}
        onSaved={() => {
          setModalEditarAbierto(false);
          invalidateTurnos();
        }}
      />
    )}

    {/* Modal de Confirmación de Eliminación */}
    <BaseDialog
      type="error"
      size="sm"
      title="Eliminar Turno"
      message="¿Estás seguro de que deseas eliminar este turno? Esta acción no se puede deshacer."
      isOpen={confirmDialogAbierto}
      onClose={() => {
        setConfirmDialogAbierto(false);
        setTurnoParaEliminar(null);
      }}
      showCloseButton
      primaryButton={{
        text: "Eliminar",
        onClick: confirmarEliminacion,
      }}
      secondaryButton={{
        text: "Cancelar",
        onClick: () => {
          setConfirmDialogAbierto(false);
          setTurnoParaEliminar(null);
        },
      }}
    />

    {/* Modal de Confirmación de Eliminación Masiva */}
    <BaseDialog
      type="warning"
      title="Confirmar eliminación masiva"
      message={
        <>
          ¿Estás seguro de que deseas eliminar <b>{cantidadBulkEliminar}</b> turno(s)?
          <br />
          <span className="mt-3 block text-xs font-semibold text-muted-foreground">
            Esta acción no se puede deshacer desde la app.
          </span>
        </>
      }
      isOpen={bulkEliminarDialogAbierto}
      onClose={() => setBulkEliminarDialogAbierto(false)}
      showCloseButton
      primaryButton={{
        text: bulkSubmitting ? "Eliminando..." : "Eliminar",
        onClick: confirmarBulkEliminar,
      }}
      secondaryButton={{
        text: "Cancelar",
        onClick: () => setBulkEliminarDialogAbierto(false),
      }}
    />
  </div>
  );
}