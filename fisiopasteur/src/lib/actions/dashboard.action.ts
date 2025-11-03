"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Turno = Database["public"]["Tables"]["turno"]["Row"];
type Box = Database["public"]["Tables"]["box"]["Row"];
type Notificacion = Database["public"]["Tables"]["notificacion"]["Row"];

export interface KPIsDashboard {
  turnosHoy: number;
  turnosCompletadosSemana: number;
  cancelacionesMes: number;
  notificacionesEnviadas: number;
}

export interface KPIHistorico {
  fecha: string;
  turnosHoy: number;
  turnosCompletados: number;
  cancelaciones: number;
  notificacionesEnviadas: number;
}

export type PeriodoFiltro = "hoy" | "semana" | "mes";

export interface ProximoTurno {
  id_turno: number;
  hora: string;
  nombrePaciente: string;
  apellidoPaciente: string;
  especialista: string;
  box: number | null;
  estado: string;
  telefono: string;
}

export interface OcupacionBox {
  id_box: number;
  numeroBox: number;
  porcentajeUso: number;
  turnosHoy: number;
  maxTurnosEstimados: number;
}

// ✅ Obtener KPIs por periodo con historial
export async function obtenerKPIsConHistorial(
  periodo: PeriodoFiltro
): Promise<{ datos: KPIHistorico[]; total: KPIsDashboard }> {
  const supabase = await createClient();

  try {
    const hoy = new Date();
    let fechaInicio = new Date();
    let fechaFin = new Date(hoy);
    let daysToGet = 1;

    // Calcular rango según período
    if (periodo === "semana") {
      // Obtener el domingo de la semana actual (0 = Sunday)
      const dayOfWeek = hoy.getDay();
      fechaInicio.setDate(hoy.getDate() - dayOfWeek);
      // Fin es el sábado de la misma semana
      fechaFin.setDate(fechaInicio.getDate() + 6);
      daysToGet = 7;
    } else if (periodo === "mes") {
      // Primer día del mes actual
      fechaInicio.setDate(1);
      // Último día del mes actual
      fechaFin.setDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate());
      daysToGet = fechaFin.getDate();
    }

    const fechaInicioStr = fechaInicio.toISOString().split("T")[0];
    const fechaFinStr = fechaFin.toISOString().split("T")[0];

    // Obtener turnos en el rango
    const { data: turnos, error: errorTurnos } = await supabase
      .from("turno")
      .select("fecha, estado, id_turno")
      .gte("fecha", fechaInicioStr)
      .lte("fecha", fechaFinStr)
    //   .neq("id_especialidad", 4); // EXCLUYE PILATES

    // Obtener notificaciones en el rango
    const { data: notificaciones, error: errorNotificaciones } = await supabase
      .from("notificacion")
      .select("fecha_envio, id_notificacion")
      .gte("fecha_envio", fechaInicioStr)
      .lte("fecha_envio", fechaFinStr)
      .eq("estado", "enviado");

    if (errorTurnos || errorNotificaciones) {
      throw new Error("Error al obtener datos históricos");
    }

    // Agrupar por fecha
    const datosMap = new Map<string, KPIHistorico>();

    // Inicializar todas las fechas del rango con 0
    for (let i = 0; i < daysToGet; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split("T")[0];
      datosMap.set(fechaStr, {
        fecha: fechaStr,
        turnosHoy: 0,
        turnosCompletados: 0,
        cancelaciones: 0,
        notificacionesEnviadas: 0,
      });
    }

    // Procesar turnos
    (turnos || []).forEach((turno: any) => {
      const fechaStr = turno.fecha;
      const dato = datosMap.get(fechaStr);
      if (dato) {
        dato.turnosHoy++;
        if (turno.estado === "completado") {
          dato.turnosCompletados++;
        } else if (turno.estado === "cancelado") {
          dato.cancelaciones++;
        }
      }
    });

    // Procesar notificaciones
    (notificaciones || []).forEach((notif: any) => {
      if (notif.fecha_envio) {
        const fechaStr = notif.fecha_envio.split("T")[0];
        const dato = datosMap.get(fechaStr);
        if (dato) {
          dato.notificacionesEnviadas++;
        }
      }
    });

    // Convertir a array y calcular totales
    const datos = Array.from(datosMap.values()).sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    const total: KPIsDashboard = {
      turnosHoy: datos.reduce((sum, d) => sum + d.turnosHoy, 0),
      turnosCompletadosSemana: datos.reduce((sum, d) => sum + d.turnosCompletados, 0),
      cancelacionesMes: datos.reduce((sum, d) => sum + d.cancelaciones, 0),
      notificacionesEnviadas: datos.reduce((sum, d) => sum + d.notificacionesEnviadas, 0),
    };

    return { datos, total };
  } catch (error) {
    console.error("❌ Error en obtenerKPIsConHistorial:", error);
    return {
      datos: [],
      total: {
        turnosHoy: 0,
        turnosCompletadosSemana: 0,
        cancelacionesMes: 0,
        notificacionesEnviadas: 0,
      },
    };
  }
}

// ✅ Obtener KPIs principales del dashboard
export async function obtenerKPIsDashboard(): Promise<KPIsDashboard> {
  const supabase = await createClient();

  try {
    const hoy = new Date().toISOString().split("T")[0];
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const finSemana = new Date();

    const inicioMes = new Date();
    inicioMes.setDate(1);

    // 1️⃣ Turnos de hoy
    const { data: turnosHoyData, error: errorTurnosHoy } = await supabase
      .from("turno")
      .select("id_turno", { count: "exact" })
      .eq("fecha", hoy)
    //   .neq("id_especialidad", 4); // Excluir Pilates

    // 2️⃣ Turnos completados esta semana
    const { data: completadosSemanaData, error: errorCompletados } = await supabase
      .from("turno")
      .select("id_turno", { count: "exact" })
      .gte("fecha", inicioSemana.toISOString().split("T")[0])
      .lte("fecha", finSemana.toISOString().split("T")[0])
      .eq("estado", "completado")
    //   .neq("id_especialidad", 4);

    // 3️⃣ Cancelaciones del mes
    const { data: cancelacionesMesData, error: errorCancelaciones } = await supabase
      .from("turno")
      .select("id_turno", { count: "exact" })
      .gte("fecha", inicioMes.toISOString().split("T")[0])
      .eq("estado", "cancelado")
    //   .neq("id_especialidad", 4);

    // 4️⃣ Notificaciones enviadas
    const { data: notificacionesData, error: errorNotificaciones } = await supabase
      .from("notificacion")
      .select("id_notificacion", { count: "exact" })
      .eq("estado", "enviado");

    if (errorTurnosHoy || errorCompletados || errorCancelaciones || errorNotificaciones) {
      console.error("Error al obtener KPIs:", {
        errorTurnosHoy,
        errorCompletados,
        errorCancelaciones,
        errorNotificaciones,
      });
      throw new Error("Error al obtener KPIs");
    }

    return {
      turnosHoy: turnosHoyData?.length || 0,
      turnosCompletadosSemana: completadosSemanaData?.length || 0,
      cancelacionesMes: cancelacionesMesData?.length || 0,
      notificacionesEnviadas: notificacionesData?.length || 0,
    };
  } catch (error) {
    console.error("❌ Error en obtenerKPIsDashboard:", error);
    return {
      turnosHoy: 0,
      turnosCompletadosSemana: 0,
      cancelacionesMes: 0,
      notificacionesEnviadas: 0,
    };
  }
}

// ✅ Obtener próximos turnos del día
export async function obtenerProximosTurnos(): Promise<ProximoTurno[]> {
  const supabase = await createClient();

  try {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("turno")
      .select(
        `
        id_turno,
        hora,
        estado,
        paciente:id_paciente(nombre, apellido, telefono),
        especialista:id_especialista(nombre, apellido),
        box:id_box(numero)
      `
      )
      .eq("fecha", hoy)
    //   .neq("id_especialidad", 4) // Excluir Pilates
      .order("hora", { ascending: true });

    if (error) {
      console.error("Error al obtener próximos turnos:", error);
      return [];
    }

    return (data || []).map((turno: any) => ({
      id_turno: turno.id_turno,
      hora: turno.hora.slice(0, 5), // Extraer solo HH:MM
      nombrePaciente: turno.paciente?.nombre || "Desconocido",
      apellidoPaciente: turno.paciente?.apellido || "",
      especialista: `${turno.especialista?.nombre || ""} ${turno.especialista?.apellido || ""}`,
      box: turno.box?.numero || null,
      estado: turno.estado,
      telefono: turno.paciente?.telefono || "",
    }));
  } catch (error) {
    console.error("❌ Error en obtenerProximosTurnos:", error);
    return [];
  }
}

// ✅ Obtener ocupación de boxes
export async function obtenerOcupacionBoxes(): Promise<OcupacionBox[]> {
  const supabase = await createClient();

  try {
    const hoy = new Date().toISOString().split("T")[0];

    // 1️⃣ Obtener todos los boxes
    const { data: boxes, error: errorBoxes } = await supabase
      .from("box")
      .select("id_box, numero");

    if (errorBoxes) throw errorBoxes;

    // 2️⃣ Obtener turnos de hoy por box
    const { data: turnos, error: errorTurnos } = await supabase
      .from("turno")
      .select("id_box, id_turno")
      .eq("fecha", hoy)
    //   .neq("id_especialidad", 4)
      .in("estado", ["programado", "completado"]);

    if (errorTurnos) throw errorTurnos;

    // 3️⃣ Contar turnos por box
    const turnosPorBox = new Map<number, number>();
    (turnos || []).forEach((turno: any) => {
      if (turno.id_box) {
        turnosPorBox.set(turno.id_box, (turnosPorBox.get(turno.id_box) || 0) + 1);
      }
    });

    // 4️⃣ Calcular porcentaje (asumiendo max 8 turnos por box por día)
    const maxTurnosEstimados = 8;

    return (boxes || []).map((box: any) => {
      const turnosBox = turnosPorBox.get(box.id_box) || 0;
      const porcentaje = (turnosBox / maxTurnosEstimados) * 100;

      return {
        id_box: box.id_box,
        numeroBox: box.numero,
        porcentajeUso: Math.min(porcentaje, 100), // Cap at 100%
        turnosHoy: turnosBox,
        maxTurnosEstimados,
      };
    });
  } catch (error) {
    console.error("❌ Error en obtenerOcupacionBoxes:", error);
    return [];
  }
}
