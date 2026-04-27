"use client";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DetalleTurnoDialog } from "@/componentes/turnos/detalle-turno-dialog";
import { marcarComoAtendido, cancelarTurno, eliminarTurno } from "@/lib/actions/turno.action";
import { useToastStore } from "@/stores/toast-store";
import { useAuth } from "@/hooks/usePerfil";
import { turnoKeys, type InvalidateTurnosOptions } from "@/hooks/useTurnosQuery";
import EditarTurnoModal from "./editar-turno-modal";
import type { TurnoWithRelations } from "@/types";
import { MoreVertical, CheckCircle, XCircle, Edit, Trash } from "lucide-react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import BaseDialog from "@/componentes/dialog/base-dialog";
import UnifiedSkeletonLoader from "../unified-skeleton-loader";
import { nowIso } from "@/lib/dayjs";
import { isPastDateTime } from "@/lib/dayjs";
import CompactListTable from "@/componentes/tablas/compact-list-table";

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
    let baseClass = "border-t hover:bg-gray-50 transition-colors";
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

  useEffect(() => {
    // Ante cualquier cambio del listado visible, resetea selección masiva.
    setSelectedTurnoIds((prev) => (prev.length > 0 ? [] : prev));
    setSelectionAnchorTurnoId(null);
  }, [turnos]);

  const handleBulkAction = async (action: "atendido" | "cancelado") => {
    if (bulkSubmitting || selectedTurnoIds.length === 0) return;

    const seleccionados = turnosOrdenados.filter((t) => selectedTurnoIds.includes(t.id_turno));
    const elegibles = seleccionados.filter((t) => t.estado === "programado" || t.estado === "pendiente");
    const accionables = elegibles.filter((t) => puedeAccionarTurno(t));

    if (accionables.length === 0) {
      toast.addToast({
        variant: "error",
        message: "No hay turnos accionables",
        description: "Selecciona turnos en estado programado o pendiente y con permisos para gestionarlos.",
      });
      return;
    }

    setBulkSubmitting(true);

    const results = await Promise.all(
      accionables.map((turno) =>
        action === "atendido"
          ? marcarComoAtendido(turno.id_turno)
          : cancelarTurno(turno.id_turno)
      )
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      invalidateTurnos({
        scope: "statuses",
        statuses: action === "atendido"
          ? ["programado", "pendiente", "atendido"]
          : ["programado", "pendiente", "cancelado"],
      });
      toast.addToast({
        variant: "success",
        message: action === "atendido"
          ? `${successCount} turno(s) marcados como atendidos`
          : `${successCount} turno(s) cancelados`,
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
              className="h-8 rounded border border-green-300 bg-green-50 px-3 text-xs text-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleBulkAction("atendido")}
              disabled={bulkSubmitting}
            >
              Marcar como atendidos
            </button>
            <button
              type="button"
              className="h-8 rounded border border-red-300 bg-red-50 px-3 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleBulkAction("cancelado")}
              disabled={bulkSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="h-8 rounded border border-gray-300 px-3 text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={clearSelection}
              disabled={bulkSubmitting}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

        <CompactListTable className="flex-1 min-h-0">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="w-10 px-2 py-2" />
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Hora</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Especialista</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
              <th className="px-4 py-2 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">N°</th>
              <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-14">Acciones</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {turnosOrdenados.map((t) => {
              const numeroTalonario = calcularNumeroTalonario(t);
              const turnoEsPropio = puedeAccionarTurno(t);
              const turnoEditable = !isPastDateTime(t.fecha, t.hora || "00:00");
              
              return (
              <tr 
                key={t.id_turno} 
                className={`${getRowClassName(t)} cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => abrirDetalleTurno(t)}
              >
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#9C1838] focus:ring-[#9C1838]"
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
                <td className={`px-4 py-2 text-sm ${getTextStyle(t)}`}>
                  {formatearFecha(t.fecha)}
                </td>
                <td className={`px-4 py-2 text-sm font-mono ${getTextStyle(t)}`}>
                  {formatearHora(t.hora)}
                </td>
                <td className={`px-4 py-2 text-sm ${getTextStyle(t)}`}>
                  {t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : "Sin asignar"}
                </td>
                <td className={`px-4 py-2 text-sm ${getTextStyle(t)}`}>
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
                <td className={`px-4 py-2 text-sm ${getTextStyle(t)}`}>
                  {t.especialidad ? t.especialidad.nombre : "Sin asignar"}
                </td>
                {/* ✅ COLUMNA: Número de talonario */}
                <td className="px-4 py-2 text-center text-black text-sm">
                  {numeroTalonario ? (
                    <span className="text-xs font-semibold">{numeroTalonario}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                {/* ✅ COLUMNA DE ACCIONES - Evitar propagación del click */}
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  {t.id_paciente && (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Content align="end" className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">
                        {/* Marcar como Atendido */}
                        {(t.estado === 'programado' || t.estado === 'pendiente') && (
                          <DropdownMenu.Item
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 outline-none ${turnoEsPropio ? 'hover:bg-green-50 text-green-600 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                            onSelect={() => handleMarcarAtendido(t)}
                            disabled={!turnoEsPropio}
                          >
                            <CheckCircle size={16} />
                            Marcar como Atendido
                          </DropdownMenu.Item>
                        )}

                        {/* Cancelar Turno */}
                        {(t.estado === 'programado' || t.estado === 'pendiente') && (
                          <DropdownMenu.Item
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 outline-none ${turnoEsPropio ? 'hover:bg-red-50 text-red-600 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                            onSelect={() => handleCancelar(t)}
                            disabled={!turnoEsPropio}
                          >
                            <XCircle size={16} />
                            Cancelar Turno
                          </DropdownMenu.Item>
                        )}

                        {/* Separador */}
                        {(t.estado === 'programado' || t.estado === 'pendiente') && (
                          <div className="h-px bg-gray-200 my-1" />
                        )}

                        {/* Editar */}
                        {t.estado !== 'atendido' && (
                          <DropdownMenu.Item
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 outline-none ${turnoEsPropio && turnoEditable ? 'hover:bg-gray-50 text-gray-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                            onSelect={() => handleEditar(t)}
                            disabled={!turnoEsPropio || !turnoEditable}
                          >
                            <Edit size={16} />
                            Editar
                          </DropdownMenu.Item>
                        )}

                        {/* Eliminar */}
                        <DropdownMenu.Item
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 outline-none ${turnoEsPropio ? 'hover:bg-red-50 text-red-600 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                          onSelect={() => handleEliminar(t)}
                          disabled={!turnoEsPropio}
                        >
                          <Trash size={16} />
                          Eliminar
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  )}
                </td>
              </tr>
            )})}
            {(!turnosOrdenados || turnosOrdenados.length === 0) && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={8}>
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
  </div>
  );
}