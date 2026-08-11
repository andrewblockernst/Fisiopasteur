"use server";

import { createClient } from "@/lib/supabase/server";
import { dayjs, todayYmd, ARG_TIMEZONE, parseYmd } from "@/lib/dayjs";
import { ROLES } from "@/lib/constants/roles";
import { obtenerUsuarioActual } from "@/lib/auth/usuario-actual";

// Horario de atención usado para recortar el eje del gráfico "hoy".
// TODO: parametrizar por configuración del centro.
const HORA_INICIO_ATENCION = 7;
const HORA_FIN_ATENCION = 22; // exclusivo

export interface KPIsDashboard {
  Programados: number;
  Atendidos: number;
  Cancelaciones: number;
  Ingresos: number;
  /** Atendidos / (Atendidos + Cancelaciones). 0-100. null si no hubo turnos resueltos. */
  tasaAsistencia: number | null;
}

export interface KPIHistorico {
  fecha: string;
  hora?: string;
  Programados: number;
  Atendidos: number;
  Cancelaciones: number;
  Ingresos: number;
}

export type PeriodoFiltro = "hoy" | "semana" | "mes";

export interface ProximoTurno {
  id_turno: number;
  hora: string;
  nombrePaciente: string;
  apellidoPaciente: string;
  especialista: string;
  especialidad: string;
  colorEspecialista: string;
  box: number | null;
  telefono: string;
}

export interface OcupacionTurno {
  id_turno: number;
  fecha: string; // YYYY-MM-DD
  hora: number;  // 0-23
  id_box: number;
  numeroBox: number;
}

export interface OcupacionBoxResumen {
  id_box: number;
  numeroBox: number;
}

export interface OcupacionRango {
  inicio: string;
  fin: string;
  dias: number;
}

interface TurnoFila {
  fecha: string;
  hora?: string | null;
  estado: "programado" | "atendido" | "cancelado" | string;
  id_turno: number;
  precio: number | null;
}

interface RangoPeriodo {
  inicio: ReturnType<typeof dayjs>;
  fin: ReturnType<typeof dayjs>;
  daysToGet: number;
}

function calcularRango(
  periodo: PeriodoFiltro,
  ref: ReturnType<typeof dayjs> = dayjs().tz(ARG_TIMEZONE),
): RangoPeriodo {
  if (periodo === "semana") {
    const inicio = ref.subtract(ref.day(), "day");
    return { inicio, fin: inicio.add(6, "day"), daysToGet: 7 };
  }
  if (periodo === "mes") {
    const inicio = ref.startOf("month");
    const fin = ref.endOf("month");
    return { inicio, fin, daysToGet: fin.date() };
  }
  return { inicio: ref, fin: ref, daysToGet: 1 };
}

function rangoAnterior(
  periodo: PeriodoFiltro,
  ref: ReturnType<typeof dayjs> = dayjs().tz(ARG_TIMEZONE),
): RangoPeriodo {
  if (periodo === "hoy") return calcularRango("hoy", ref.subtract(1, "day"));
  if (periodo === "semana") return calcularRango("semana", ref.subtract(1, "week"));
  return calcularRango("mes", ref.subtract(1, "month"));
}

// "Programados" agrupa los turnos sin resolver: estado 'programado' (futuro)
// y 'pendiente' (hora pasada, nadie marcó atendido/cancelado — lo setea el cron).
function totalDesdeTurnos(turnos: TurnoFila[]): KPIsDashboard {
  const t: KPIsDashboard = {
    Programados: 0,
    Atendidos: 0,
    Cancelaciones: 0,
    Ingresos: 0,
    tasaAsistencia: null,
  };
  for (const turno of turnos) {
    if (turno.estado === "atendido") {
      t.Atendidos++;
      if (turno.precio) t.Ingresos += turno.precio;
    } else if (turno.estado === "cancelado") {
      t.Cancelaciones++;
    } else if (turno.estado === "programado" || turno.estado === "pendiente") {
      t.Programados++;
    }
  }
  const resueltos = t.Atendidos + t.Cancelaciones;
  t.tasaAsistencia = resueltos > 0 ? (t.Atendidos / resueltos) * 100 : null;
  return t;
}

async function fetchTurnosRango(
  rango: RangoPeriodo,
  filtroEspecialistaId: string | undefined,
  selectFields: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("turno")
    .select(selectFields)
    .gte("fecha", rango.inicio.format("YYYY-MM-DD"))
    .lte("fecha", rango.fin.format("YYYY-MM-DD"));

  if (filtroEspecialistaId) {
    query = query.eq("id_especialista", filtroEspecialistaId);
  }
  return await query;
}

interface SnapshotRow {
  scope: "actual" | "previo";
  programados: number;
  atendidos: number;
  cancelaciones: number;
  ingresos: number;
}

// Llama a la RPC que agrega ambos períodos en DB (1 round-trip).
async function fetchSnapshotsRPC(
  rango: RangoPeriodo,
  rangoPrev: RangoPeriodo,
  filtroEspecialistaId: string | undefined,
): Promise<{ actual: KPIsDashboard; previo: KPIsDashboard } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_kpis_snapshot", {
    p_inicio: rango.inicio.format("YYYY-MM-DD"),
    p_fin: rango.fin.format("YYYY-MM-DD"),
    p_inicio_prev: rangoPrev.inicio.format("YYYY-MM-DD"),
    p_fin_prev: rangoPrev.fin.format("YYYY-MM-DD"),
    p_id_especialista: filtroEspecialistaId ?? null,
  } as never);
  if (error || !data) return null;

  const rows = data as unknown as SnapshotRow[];
  const build = (scope: "actual" | "previo"): KPIsDashboard => {
    const row = rows.find((r) => r.scope === scope);
    const a = Number(row?.atendidos ?? 0);
    const c = Number(row?.cancelaciones ?? 0);
    const resueltos = a + c;
    return {
      Programados: Number(row?.programados ?? 0),
      Atendidos: a,
      Cancelaciones: c,
      Ingresos: Number(row?.ingresos ?? 0),
      tasaAsistencia: resueltos > 0 ? (a / resueltos) * 100 : null,
    };
  };
  return { actual: build("actual"), previo: build("previo") };
}

// ✅ Obtener KPIs por periodo con historial + comparativa con período anterior.
// `referencia` (YYYY-MM-DD) permite navegar a otro día/semana/mes; default = hoy.
export async function obtenerKPIsConHistorial(
  periodo: PeriodoFiltro,
  especialista_id?: string,
  referencia?: string,
): Promise<
  | { success: true; datos: KPIHistorico[]; total: KPIsDashboard; anterior: KPIsDashboard }
  | { success: false; error: string }
> {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return { success: false, error: "No autorizado" };
    let filtroEspecialistaId = especialista_id;
    if (usuario.id_rol === ROLES.ESPECIALISTA) {
      filtroEspecialistaId = usuario.id_usuario;
    }

    const ref = referencia ? parseYmd(referencia) : dayjs().tz(ARG_TIMEZONE);
    const rango = calcularRango(periodo, ref);
    const rangoPrev = rangoAnterior(periodo, ref);
    const selectFields =
      periodo === "hoy"
        ? "fecha, hora, estado, id_turno, precio"
        : "fecha, estado, id_turno, precio";

    // Datos actuales (necesarios para el chart) + snapshot agregado (totales actual + previo) en paralelo.
    const [actual, snapshot] = await Promise.all([
      fetchTurnosRango(rango, filtroEspecialistaId, selectFields),
      fetchSnapshotsRPC(rango, rangoPrev, filtroEspecialistaId),
    ]);

    if (actual.error) {
      return { success: false, error: "Error al obtener datos históricos" };
    }

    const turnos = (actual.data as unknown as TurnoFila[]) || [];

    const datosMap = new Map<string, KPIHistorico>();
    const fechaInicioStr = rango.inicio.format("YYYY-MM-DD");

    if (periodo === "hoy") {
      // Solo horas dentro del horario de atención.
      for (let hora = HORA_INICIO_ATENCION; hora < HORA_FIN_ATENCION; hora++) {
        const horaStr = String(hora).padStart(2, "0");
        datosMap.set(`${fechaInicioStr}T${horaStr}`, {
          fecha: horaStr,
          hora: `${horaStr}:00`,
          Programados: 0,
          Atendidos: 0,
          Cancelaciones: 0,
          Ingresos: 0,
        });
      }

      for (const turno of turnos) {
        if (!turno.hora) continue;
        const hora = String(turno.hora).split(":")[0];
        const dato = datosMap.get(`${turno.fecha}T${hora}`);
        if (!dato) continue;
        acumularTurno(dato, { estado: turno.estado, precio: turno.precio });
      }
    } else {
      for (let i = 0; i < rango.daysToGet; i++) {
        const fechaStr = rango.inicio.add(i, "day").format("YYYY-MM-DD");
        datosMap.set(fechaStr, {
          fecha: fechaStr,
          Programados: 0,
          Atendidos: 0,
          Cancelaciones: 0,
          Ingresos: 0,
        });
      }
      for (const turno of turnos) {
        const dato = datosMap.get(turno.fecha);
        if (!dato) continue;
        acumularTurno(dato, { estado: turno.estado, precio: turno.precio });
      }
    }

    const datos = Array.from(datosMap.values()).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );

    // Si la RPC está disponible, usamos sus totales (agregado en DB).
    // Si no, calculamos `total` en JS desde los rows ya traídos y traemos `anterior`
    // como query adicional (fallback transparente hasta que la migración corra).
    let total: KPIsDashboard;
    let anterior: KPIsDashboard;
    if (snapshot) {
      total = snapshot.actual;
      anterior = snapshot.previo;
    } else {
      total = totalDesdeTurnos(turnos);
      const previo = await fetchTurnosRango(
        rangoPrev,
        filtroEspecialistaId,
        "fecha, estado, precio, id_turno",
      );
      anterior = totalDesdeTurnos((previo.data as unknown as TurnoFila[]) || []);
    }

    return { success: true, datos, total, anterior };
  } catch (error) {
    console.error("❌ Error en obtenerKPIsConHistorial:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Ingresos cuentan SOLO turnos atendidos.
// "Programados" incluye estado 'programado' y 'pendiente' (sin resolver).
function acumularTurno(dato: KPIHistorico, turno: { estado: string; precio: number | null }) {
  if (turno.estado === "atendido") {
    dato.Atendidos++;
    if (turno.precio) dato.Ingresos += turno.precio;
  } else if (turno.estado === "cancelado") {
    dato.Cancelaciones++;
  } else if (turno.estado === "programado" || turno.estado === "pendiente") {
    dato.Programados++;
  }
}

// ✅ Próximos turnos del día — un especialista solo ve los suyos.
export async function obtenerProximosTurnos(): Promise<ProximoTurno[]> {
  const supabase = await createClient();

  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return [];
    const hoy = todayYmd();
    const ahora = dayjs().tz(ARG_TIMEZONE).format("HH:mm:ss");

    let query = supabase
      .from("turno")
      .select(
        `
        id_turno,
        hora,
        paciente:id_paciente(nombre, apellido, telefono),
        especialista:id_especialista(nombre, apellido, color),
        especialidad:id_especialidad(nombre),
        box:id_box(numero)
      `
      )
      .eq("fecha", hoy)
      .eq("estado", "programado")
      .gt("hora", ahora)
      .order("hora", { ascending: true });

    if (usuario?.id_rol === ROLES.ESPECIALISTA) {
      query = query.eq("id_especialista", usuario.id_usuario);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener próximos turnos:", error);
      return [];
    }

    type TurnoConJoins = {
      id_turno: number;
      hora: string;
      paciente: { nombre: string | null; apellido: string | null; telefono: string | null } | null;
      especialista: { nombre: string | null; apellido: string | null; color: string | null } | null;
      especialidad: { nombre: string | null } | null;
      box: { numero: number | null } | null;
    };
    return ((data as unknown as TurnoConJoins[]) || []).map((turno) => ({
      id_turno: turno.id_turno,
      hora: turno.hora.slice(0, 5),
      nombrePaciente: turno.paciente?.nombre || "Desconocido",
      apellidoPaciente: turno.paciente?.apellido || "",
      especialista: `${turno.especialista?.nombre || ""} ${turno.especialista?.apellido || ""}`,
      especialidad: turno.especialidad?.nombre || "Desconocida",
      colorEspecialista: turno.especialista?.color || "#6B7280",
      box: turno.box?.numero || null,
      telefono: turno.paciente?.telefono || "",
    }));
  } catch (error) {
    console.error("❌ Error en obtenerProximosTurnos:", error);
    return [];
  }
}

// ✅ Ocupación de boxes — devuelve datos crudos para construir visualizaciones
// honestas (heatmap, ranking, sparkline) sin asumir capacidad diaria fija.
// El componente cliente agrega/pivotea según necesite.
export async function obtenerOcupacionBoxes(
  periodo: PeriodoFiltro = "hoy",
): Promise<
  | {
      success: true;
      periodo: PeriodoFiltro;
      rango: OcupacionRango;
      boxes: OcupacionBoxResumen[];
      turnos: OcupacionTurno[];
    }
  | { success: false; error: string }
> {
  const supabase = await createClient();

  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) {
      return { success: false, error: "No autorizado" };
    }

    const rango = calcularRango(periodo);
    const inicioStr = rango.inicio.format("YYYY-MM-DD");
    const finStr = rango.fin.format("YYYY-MM-DD");

    // 1. Boxes activos (los inactivos no se grafican).
    const { data: boxesRaw, error: errorBoxes } = await supabase
      .from("box")
      .select("id_box, numero")
      .eq("estado", "activo")
      .order("numero");

    if (errorBoxes) return { success: false, error: errorBoxes.message };

    const boxes = (boxesRaw as { id_box: number; numero: number }[] | null) ?? [];
    const idsActivos = new Set(boxes.map((b) => b.id_box));
    const numeroByBox = new Map(boxes.map((b) => [b.id_box, b.numero]));

    // 2. Turnos del rango que ocupan box (con hora).
    const { data: turnosRaw, error: errorTurnos } = await supabase
      .from("turno")
      .select("id_turno, fecha, hora, id_box")
      .gte("fecha", inicioStr)
      .lte("fecha", finStr)
      .in("estado", ["programado", "pendiente", "atendido"])
      .not("id_box", "is", null);

    if (errorTurnos) return { success: false, error: errorTurnos.message };

    type TurnoRaw = { id_turno: number; fecha: string; hora: string | null; id_box: number };
    const turnos: OcupacionTurno[] = ((turnosRaw as TurnoRaw[] | null) ?? [])
      .filter((t) => idsActivos.has(t.id_box) && t.hora)
      .map((t) => ({
        id_turno: t.id_turno,
        fecha: t.fecha,
        hora: parseInt(t.hora!.slice(0, 2), 10),
        id_box: t.id_box,
        numeroBox: numeroByBox.get(t.id_box) ?? 0,
      }));

    return {
      success: true,
      periodo,
      rango: { inicio: inicioStr, fin: finStr, dias: rango.daysToGet },
      boxes: boxes.map((b) => ({ id_box: b.id_box, numeroBox: b.numero })),
      turnos,
    };
  } catch (error) {
    console.error("❌ Error en obtenerOcupacionBoxes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
