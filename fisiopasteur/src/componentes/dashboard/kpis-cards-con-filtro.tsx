"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, DollarSign, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { dayjs, ARG_TIMEZONE } from "@/lib/dayjs";
import { useKPIs } from "@/hooks/useDashboardQuery";
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  type PeriodoFiltro,
  type KPIHistorico,
  type KPIsDashboard,
} from "@/lib/actions/dashboard.action";
import { getEspecialistas } from "@/lib/actions/especialista.action";
import { useAuth } from "@/hooks/AuthContext";
import { Card, Skeleton } from "@/componentes/ui";
import { cn } from "@/lib/utils";

interface KPICardMetricsProps {
  titulo: string;
  valor: number;
  valorAnterior?: number;
  /** Si true, una baja se considera positiva (ej. cancelaciones). */
  inversoEsBueno?: boolean;
  icono: React.ReactNode;
  /** Color semántico del KPI: define el color del número y del fill de la barra. */
  accent: "info" | "success" | "warning" | "destructive";
  datos: KPIHistorico[];
  dataKey: "Programados" | "Atendidos" | "Cancelaciones" | "Ingresos";
  descripcion: string;
  periodo: PeriodoFiltro;
  esMoneda?: boolean;
}

const labelComparativa: Record<PeriodoFiltro, string> = {
  hoy: "vs día anterior",
  semana: "vs semana anterior",
  mes: "vs mes anterior",
};

function DeltaIndicator({
  valor,
  anterior,
  inversoEsBueno = false,
  periodo,
}: {
  valor: number;
  anterior: number;
  inversoEsBueno?: boolean;
  periodo: PeriodoFiltro;
}) {
  if (anterior === 0 && valor === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> {labelComparativa[periodo]}
      </span>
    );
  }
  if (anterior === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        nuevo {labelComparativa[periodo]}
      </span>
    );
  }
  const diff = valor - anterior;
  const pct = (diff / anterior) * 100;
  const sube = diff > 0;
  const baja = diff < 0;
  const esPositivo = inversoEsBueno ? baja : sube;
  const esNegativo = inversoEsBueno ? sube : baja;
  const colorClass = esPositivo
    ? "text-success"
    : esNegativo
    ? "text-destructive"
    : "text-muted-foreground";
  const Icon = sube ? TrendingUp : baja ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", colorClass)}>
      <Icon className="w-3 h-3" />
      {sube ? "+" : ""}
      {pct.toFixed(0)}% <span className="text-muted-foreground font-normal">{labelComparativa[periodo]}</span>
    </span>
  );
}

/** Maps the accent token name to a CSS variable usable by Recharts. */
const accentColorVar: Record<KPICardMetricsProps["accent"], string> = {
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
};

const accentTextClass: Record<KPICardMetricsProps["accent"], string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const accentBgClass: Record<KPICardMetricsProps["accent"], string> = {
  info: "bg-info/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
};

function KPICard({
  titulo,
  valor,
  valorAnterior,
  inversoEsBueno,
  icono,
  accent,
  datos,
  dataKey,
  descripcion,
  periodo,
  esMoneda = false,
}: KPICardMetricsProps) {
  const tickFormatter = (value: string) => {
    if (periodo === "hoy") return `${value}:00`;
    return new Date(value + "T00:00:00").toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
    });
  };

  const formatearMoneda = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
            {titulo}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className={cn("text-2xl sm:text-3xl font-bold leading-tight", accentTextClass[accent])}>
              {esMoneda ? formatearMoneda(valor) : valor}
            </p>
            <p className="text-xs text-muted-foreground">
              {descripcion || " "}
            </p>
          </div>
          {typeof valorAnterior === "number" && (
            <div className="mt-2">
              <DeltaIndicator
                valor={valor}
                anterior={valorAnterior}
                inversoEsBueno={inversoEsBueno}
                periodo={periodo}
              />
            </div>
          )}
        </div>
        <div
          className={cn(
            "rounded-md p-2 sm:p-2.5 flex items-center justify-center shrink-0",
            accentBgClass[accent],
          )}
          aria-hidden="true"
        >
          {icono}
        </div>
      </div>

      {/* Gráfico de barras: oculto en mobile, visible desde sm. */}
      <div className="hidden sm:block w-full h-40 sm:h-48 mt-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={datos}
            margin={{ top: 10, right: 15, left: 15, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={tickFormatter}
              tickLine={false}
              tickCount={2}
              interval={periodo === "hoy" ? 6 : periodo === "semana" ? 5 : 28}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
              formatter={(value) => [
                esMoneda ? formatearMoneda(value as number) : value,
                titulo,
              ]}
              labelFormatter={(label) =>
                `${label}${periodo === "hoy" ? ":00" : ""}`
              }
            />
            <Bar dataKey={dataKey} fill={accentColorVar[accent]} radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

interface EspecialistaSimple {
  id_usuario: string;
  nombre: string;
  apellido: string;
}

interface KPIsCardsConFiltroProps {
  loading?: boolean;
}

export function KPIsCardsConFiltro({
  loading = false,
}: KPIsCardsConFiltroProps) {
  const { user, loading: authLoading } = useAuth();
  const puedeVerTodos = user?.puedeGestionarTurnos ?? false;

  const [periodo, setPeriodo] = useState<PeriodoFiltro>("semana");
  // offset = unidades de período hacia atrás (-1) o adelante (+1) desde hoy.
  // Se resetea cuando cambia el período (los rangos no son comparables).
  const [offset, setOffset] = useState<number>(0);
  const [especialistaId, setEspecialistaId] = useState<string>("");
  const [especialistas, setEspecialistas] = useState<EspecialistaSimple[]>([]);
  const TOTAL_VACIO: KPIsDashboard = {
    Programados: 0,
    Atendidos: 0,
    Cancelaciones: 0,
    Ingresos: 0,
    tasaAsistencia: null,
  };

  // Lista de especialistas (solo admin)
  useEffect(() => {
    if (!puedeVerTodos) return;
    getEspecialistas({ status: "activos" }).then((res) => {
      if (res.success) {
        setEspecialistas(
          (res.data as any[]).map((e: any) => ({
            id_usuario: e.id_usuario,
            nombre: e.nombre,
            apellido: e.apellido,
          })),
        );
      }
    });
  }, [puedeVerTodos]);

  // Unidad de dayjs para sumar/restar segun periodo
  const unidadDelPeriodo: Record<PeriodoFiltro, "day" | "week" | "month"> = {
    hoy: "day",
    semana: "week",
    mes: "month",
  };

  // Fecha de referencia (YYYY-MM-DD) calculada a partir del offset
  const referencia = dayjs()
    .tz(ARG_TIMEZONE)
    .add(offset, unidadDelPeriodo[periodo])
    .format("YYYY-MM-DD");

  // Label legible del período actual mostrado
  const labelPeriodo = (() => {
    const ref = dayjs().tz(ARG_TIMEZONE).add(offset, unidadDelPeriodo[periodo]);
    if (periodo === "hoy") {
      if (offset === 0) return "Hoy";
      if (offset === -1) return "Ayer";
      if (offset === 1) return "Mañana";
      return ref.format("dddd D [de] MMMM");
    }
    if (periodo === "semana") {
      if (offset === 0) return "Esta semana";
      const inicio = ref.subtract(ref.day(), "day");
      const fin = inicio.add(6, "day");
      const mismoMes = inicio.month() === fin.month();
      return mismoMes
        ? `${inicio.format("D")}–${fin.format("D [de] MMMM")}`
        : `${inicio.format("D MMM")} – ${fin.format("D MMM")}`;
    }
    if (offset === 0) return "Este mes";
    return ref.format("MMMM YYYY");
  })();

  // KPIs vía TanStack Query (cache por filtros + invalidación desde el bridge realtime).
  // Admin/programador: filtro libre. Especialista: forzado a sus propios turnos.
  const idAFiltrar = puedeVerTodos
    ? especialistaId || undefined
    : user?.id_usuario || undefined;
  // Si el usuario no es admin/programador, exigimos su id_usuario antes de pedir
  // KPIs — para no mostrarle datos de todos los especialistas mientras carga.
  const filtroListo = puedeVerTodos || !!user?.id_usuario;
  const { data: kpisData, isFetching: isFetchingKPIs } = useKPIs({
    periodo,
    especialistaId: idAFiltrar,
    referencia,
    enabled: !authLoading && filtroListo,
  });

  const datos: KPIHistorico[] = kpisData?.datos ?? [];
  const totales: KPIsDashboard = kpisData?.total ?? TOTAL_VACIO;
  const anterior: KPIsDashboard = kpisData?.anterior ?? TOTAL_VACIO;
  // Skeleton solo cuando no hay datos aún (primer fetch). En refetches placeholderData
  // mantiene el render anterior, así que no flashea.
  const isLoading = (isFetchingKPIs && !kpisData) || authLoading;

  const filtrosPeriodo: { label: string; labelCorto: string; value: PeriodoFiltro }[] = [
    { label: "Hoy", labelCorto: "Hoy", value: "hoy" },
    { label: "Esta semana", labelCorto: "Semana", value: "semana" },
    { label: "Este mes", labelCorto: "Mes", value: "mes" },
  ];

  // Skeleton solo sobre el grid de KPIs — los controles (filtros, navegador temporal,
  // tabs de período) permanecen visibles e interactivos durante refetches.
  const mostrandoSkeleton = authLoading || isLoading || loading;

  return (
    <div>
      {/* Barra de controles: stack en mobile, side-by-side en desktop */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
        {/* Selector de especialista — solo admin */}
        {puedeVerTodos ? (
          <select
            value={especialistaId}
            onChange={(e) => setEspecialistaId(e.target.value)}
            aria-label="Filtrar por especialista"
            className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-brand transition-colors w-full sm:w-auto sm:min-w-[220px] sm:max-w-xs"
          >
            <option value="">Todos los especialistas</option>
            {especialistas.map((e) => (
              <option key={e.id_usuario} value={e.id_usuario}>
                {e.nombre} {e.apellido}
              </option>
            ))}
          </select>
        ) : (
          <div className="hidden sm:block" />
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegador temporal: ← label → */}
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            <button
              type="button"
              aria-label="Período anterior"
              onClick={() => setOffset((o) => o - 1)}
              className="h-7 w-7 rounded-sm inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffset(0)}
              disabled={offset === 0}
              aria-label="Volver al período actual"
              className={cn(
                "h-7 px-2.5 rounded-sm text-xs sm:text-sm font-medium min-w-[90px] sm:min-w-[110px] capitalize",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                offset === 0
                  ? "bg-brand text-brand-foreground shadow-sm cursor-default"
                  : "text-foreground hover:bg-background",
              )}
            >
              {labelPeriodo}
            </button>
            <button
              type="button"
              aria-label="Período siguiente"
              onClick={() => setOffset((o) => o + 1)}
              className="h-7 w-7 rounded-sm inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs de período (segmented control) */}
          <div
            role="tablist"
            aria-label="Período del dashboard"
            className="flex gap-0.5 bg-muted rounded-md p-0.5"
          >
            {filtrosPeriodo.map((filtro) => (
              <button
                key={filtro.value}
                role="tab"
                aria-selected={periodo === filtro.value}
                onClick={() => {
                  setPeriodo(filtro.value);
                  setOffset(0);
                }}
                className={cn(
                  "h-7 px-2.5 sm:px-3 rounded-sm text-xs sm:text-sm font-medium transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  periodo === filtro.value
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="sm:hidden">{filtro.labelCorto}</span>
                <span className="hidden sm:inline">{filtro.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de KPIs (2 cols móvil → 4 cols desktop) */}
      {mostrandoSkeleton ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="hidden sm:block h-40 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          titulo="Programados"
          valor={totales.Programados}
          valorAnterior={anterior.Programados}
          icono={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-info" />}
          accent="info"
          datos={datos}
          dataKey="Programados"
          descripcion="programados + pendientes"
          periodo={periodo}
        />

        <KPICard
          titulo="Atendidos"
          valor={totales.Atendidos}
          valorAnterior={anterior.Atendidos}
          icono={<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />}
          accent="success"
          datos={datos}
          dataKey="Atendidos"
          descripcion={
            totales.tasaAsistencia !== null
              ? `${totales.tasaAsistencia.toFixed(0)}% asistencia`
              : ""
          }
          periodo={periodo}
        />

        <KPICard
          titulo="Cancelaciones"
          valor={totales.Cancelaciones}
          valorAnterior={anterior.Cancelaciones}
          inversoEsBueno
          icono={<XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />}
          accent="destructive"
          datos={datos}
          dataKey="Cancelaciones"
          descripcion={
            totales.tasaAsistencia !== null
              ? `${(100 - totales.tasaAsistencia).toFixed(0)}% cancelación`
              : ""
          }
          periodo={periodo}
        />

        <KPICard
          titulo="Ingresos"
          valor={totales.Ingresos}
          valorAnterior={anterior.Ingresos}
          icono={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />}
          accent="warning"
          datos={datos}
          dataKey="Ingresos"
          descripcion="atendidos"
          periodo={periodo}
          esMoneda={true}
        />
      </div>
      )}
    </div>
  );
}
