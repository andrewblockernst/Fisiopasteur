"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  EmptyState,
  Skeleton,
} from "@/componentes/ui";
import { cn } from "@/lib/utils";
import { dayjs, ARG_TIMEZONE } from "@/lib/dayjs";
import type {
  OcupacionTurno,
  OcupacionBoxResumen,
  OcupacionRango,
  PeriodoFiltro,
} from "@/lib/actions/dashboard.action";

interface OcupacionBoxesProps {
  boxes: OcupacionBoxResumen[];
  turnos: OcupacionTurno[];
  rango: OcupacionRango;
  periodo: PeriodoFiltro;
  isLoading?: boolean;
}

// Horario de atención del centro (constante hasta parametrizar).
const HORA_INICIO = 7;
const HORA_FIN = 22; // exclusivo
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);

// Escala discreta estilo GitHub: 5 niveles de opacidad según percentil del máximo.
function colorHeatmap(count: number, max: number): string {
  if (count === 0 || max === 0) return "var(--muted)";
  const t = count / max;
  // 5 niveles: 0.2, 0.4, 0.6, 0.8, 1.0
  const nivel = t <= 0.2 ? 0.2 : t <= 0.4 ? 0.4 : t <= 0.6 ? 0.6 : t <= 0.8 ? 0.8 : 1;
  return `color-mix(in oklch, var(--brand) ${nivel * 100}%, transparent)`;
}

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function OcupacionBoxes({
  boxes,
  turnos,
  rango,
  periodo,
  isLoading = false,
}: OcupacionBoxesProps) {
  // 1. Filas del heatmap según período.
  //    - "hoy":    una fila por box (vista operativa).
  //    - "semana": una fila por día del rango (Lun, Mar, ...).
  //    - "mes":    una fila por día-de-semana agregando todas las ocurrencias
  //                (4-5 lunes del mes sumados) — patrón mensual compacto.
  const filasHeatmap = useMemo(() => {
    if (periodo === "hoy") {
      return boxes.map((b) => ({
        key: `box-${b.id_box}`,
        label: `Box ${b.numeroBox}`,
        match: (t: OcupacionTurno) => t.id_box === b.id_box,
      }));
    }
    if (periodo === "semana") {
      const inicio = dayjs(rango.inicio).tz(ARG_TIMEZONE, true);
      return Array.from({ length: rango.dias }, (_, i) => {
        const f = inicio.add(i, "day");
        const fechaStr = f.format("YYYY-MM-DD");
        return {
          key: `fecha-${fechaStr}`,
          label: f.format("ddd D"),
          match: (t: OcupacionTurno) => t.fecha === fechaStr,
        };
      });
    }
    // "mes" → agregar por día de la semana (0=dom..6=sáb).
    return Array.from({ length: 7 }, (_, dow) => ({
      key: `dow-${dow}`,
      label: DIAS_SEMANA[dow],
      match: (t: OcupacionTurno) =>
        dayjs(t.fecha).tz(ARG_TIMEZONE, true).day() === dow,
    }));
  }, [periodo, boxes, rango]);

  // 2. Matriz heatmap[fila][hora] → count.
  const { matriz, maxCount, totalTurnos } = useMemo(() => {
    const m = new Map<string, Map<number, number>>();
    for (const t of turnos) {
      for (const fila of filasHeatmap) {
        if (!fila.match(t)) continue;
        const horasMap = m.get(fila.key) ?? new Map<number, number>();
        horasMap.set(t.hora, (horasMap.get(t.hora) ?? 0) + 1);
        m.set(fila.key, horasMap);
        break;
      }
    }
    let mx = 0;
    m.forEach((horas) => horas.forEach((c) => (mx = Math.max(mx, c))));
    return { matriz: m, maxCount: mx, totalTurnos: turnos.length };
  }, [turnos, filasHeatmap]);

  // 3. Ranking por box + serie diaria para sparkline.
  const ranking = useMemo(() => {
    const inicio = dayjs(rango.inicio).tz(ARG_TIMEZONE, true);
    const fechas = Array.from({ length: rango.dias }, (_, i) =>
      inicio.add(i, "day").format("YYYY-MM-DD"),
    );

    const data = boxes.map((b) => {
      const turnosBox = turnos.filter((t) => t.id_box === b.id_box);
      const porDia = new Map<string, number>(fechas.map((f) => [f, 0]));
      turnosBox.forEach((t) => porDia.set(t.fecha, (porDia.get(t.fecha) ?? 0) + 1));
      return {
        id_box: b.id_box,
        numeroBox: b.numeroBox,
        total: turnosBox.length,
        serie: Array.from(porDia.entries()).map(([fecha, count]) => ({ fecha, count })),
      };
    });

    data.sort((a, b) => b.total - a.total);
    const maxTotal = data[0]?.total ?? 0;
    return { data, maxTotal };
  }, [turnos, boxes, rango]);

  // Celda hovereada — alimenta el readout debajo del heatmap.
  const [hover, setHover] = useState<{ fila: string; hora: number; count: number } | null>(null);

  // 4. Hora pico (la hora con más turnos sumados sobre todos los boxes/días).
  const horaPico = useMemo<{ hora: number; count: number } | null>(() => {
    const porHora = new Map<number, number>();
    turnos.forEach((t) => porHora.set(t.hora, (porHora.get(t.hora) ?? 0) + 1));
    let best: { hora: number; count: number } | null = null;
    porHora.forEach((count, hora) => {
      if (!best || count > best.count) best = { hora, count };
    });
    return best;
  }, [turnos]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ocupación de boxes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (boxes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ocupación de boxes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No hay boxes activos"
            description="Agregá o activá un box desde la gestión de boxes."
            className="py-8"
          />
        </CardContent>
      </Card>
    );
  }

  const subtitulo =
    periodo === "hoy"
      ? "Boxes × hora del día"
      : periodo === "semana"
        ? "Días × hora — patrón semanal"
        : "Día de la semana × hora — patrón del mes";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupación de boxes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-info/10 border border-info/30 rounded-md p-3">
            <p className="text-xs text-info font-medium">Total turnos</p>
            <p className="text-2xl font-bold text-info">{totalTurnos}</p>
          </div>
          <div className="bg-success/10 border border-success/30 rounded-md p-3">
            <p className="text-xs text-success font-medium">Box más usado</p>
            <p className="text-2xl font-bold text-success">
              {ranking.data[0]?.total > 0 ? `Box ${ranking.data[0]?.numeroBox}` : "—"}
            </p>
          </div>
          <div className="bg-warning/10 border border-warning/30 rounded-md p-3">
            <p className="text-xs text-warning font-medium">Hora pico</p>
            <p className="text-2xl font-bold text-warning">
              {horaPico ? `${String(horaPico.hora).padStart(2, "0")}h` : "—"}
            </p>
          </div>
        </div>

        {/* Heatmap */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              {subtitulo}
            </h3>
            {/* Leyenda estilo GitHub */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Menos</span>
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((nivel) => (
                <span
                  key={nivel}
                  className="w-3 h-3 rounded-sm border border-border/40"
                  style={{
                    backgroundColor:
                      nivel === 0
                        ? "var(--muted)"
                        : `color-mix(in oklch, var(--brand) ${nivel * 100}%, transparent)`,
                  }}
                />
              ))}
              <span>Más</span>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <div
              className="inline-grid gap-[2px] text-[11px] min-w-full"
              style={{
                gridTemplateColumns: `minmax(60px, max-content) repeat(${HORAS.length}, minmax(16px, 1fr))`,
              }}
            >
              {/* Header de horas */}
              <div />
              {HORAS.map((h) => (
                <div
                  key={h}
                  className="text-center text-muted-foreground pb-1 font-medium"
                >
                  {String(h).padStart(2, "0")}
                </div>
              ))}

              {/* Filas */}
              {filasHeatmap.map((fila) => (
                <div key={fila.key} className="contents">
                  <div className="py-0.5 pr-2 text-muted-foreground truncate capitalize self-center">
                    {fila.label}
                  </div>
                  {HORAS.map((h) => {
                    const count = matriz.get(fila.key)?.get(h) ?? 0;
                    const activo = hover?.fila === fila.label && hover?.hora === h;
                    return (
                      <div
                        key={h}
                        onMouseEnter={() => setHover({ fila: fila.label, hora: h, count })}
                        onMouseLeave={() => setHover(null)}
                        className={cn(
                          "rounded-sm h-4 cursor-default transition-shadow",
                          activo && "ring-2 ring-foreground/40 ring-offset-1 ring-offset-background",
                        )}
                        style={{ backgroundColor: colorHeatmap(count, maxCount) }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Readout: se actualiza al hovear una celda */}
          <div
            aria-live="polite"
            className="mt-2 text-xs text-muted-foreground min-h-[18px]"
          >
            {hover ? (
              <span>
                <span className="capitalize font-medium text-foreground">
                  {hover.fila}
                </span>{" "}
                · {String(hover.hora).padStart(2, "0")}:00 —{" "}
                <span className="font-semibold text-foreground">
                  {hover.count}
                </span>{" "}
                turno{hover.count === 1 ? "" : "s"}
              </span>
            ) : (
              <span>Pasá el mouse sobre una celda para ver el detalle</span>
            )}
          </div>
        </div>

        {/* Ranking de boxes */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Uso por box
          </h3>
          <div className="space-y-2">
            {ranking.data.map((b) => {
              const pctRelativo = ranking.maxTotal > 0 ? (b.total / ranking.maxTotal) * 100 : 0;
              return (
                <div
                  key={b.id_box}
                  className="grid grid-cols-[80px_1fr_60px_80px] items-center gap-3"
                >
                  <span className="text-sm font-medium text-foreground">
                    Box {b.numeroBox}
                  </span>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${pctRelativo}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground text-right tabular-nums">
                    {b.total} turnos
                  </span>
                  <div className="h-8">
                    <ResponsiveContainer width="100%" height={32}>
                      <AreaChart data={b.serie}>
                        <defs>
                          <linearGradient id={`g-${b.id_box}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="var(--brand)"
                          strokeWidth={1.5}
                          fill={`url(#g-${b.id_box})`}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
          {periodo === "hoy" && (
            <p className="text-xs text-muted-foreground mt-2">
              Sparklines deshabilitadas para período "hoy" (1 punto).
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
