"use server";

import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database.types";

type Turno = Tables<"turno">;

export interface AnalisisNoShows {
    totalTurnos: number;
    turnosAtendidos: number;
    turnosCancelados: number;
    turnosProgramados: number;
    tasaCancelacion: number;
    tasaAsistencia: number;
}

export interface NoShowsPorEspecialista {
    id_especialista: string;
    nombre: string;
    apellido: string;
    totalTurnos: number;
    programados: number;
    cancelados: number;
    atendidos: number;
    tasaCancelacion: number;
}

export interface NoShowsPorHorario {
    horario: string;
    totalTurnos: number;
    programados: number;
    cancelados: number;
    atendidos: number;
}

export interface NoShowsPorDia {
    dia: string;
    diaNumero: number;
    totalTurnos: number;
    programados: number;
    cancelados: number;
    atendidos: number;
}

export interface TendenciaNoShows {
    semana: string;
    programados: number;
    cancelados: number;
    atendidos: number;
    totalTurnos: number;
}

// ✅ Funciones normales SIN caché (el caché está en React Query + HTTP headers)

export async function getAnalisisNoShows(
    fechaInicio?: string,
    fechaFin?: string
): Promise<AnalisisNoShows> {
    if (!fechaInicio || !fechaFin) {
        throw new Error("Parámetros de fecha requeridos");
    }

    const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fechaInicio) || !regexFecha.test(fechaFin)) {
        throw new Error("Formato de fecha inválido (debe ser YYYY-MM-DD)");
    }

    console.log("🧮 Consultando análisis general...", fechaInicio, fechaFin);
    const inicio = performance.now();

    const supabase = await createClient();
    const { data: turnos, error } = await supabase
        .from("turno")
        .select("*")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin);

    const duracion = performance.now() - inicio;
    console.log(`⏱️ Consulta tardó ${duracion.toFixed(2)}ms`);

    if (error) {
        console.error("Error consultando turnos:", error);
        throw new Error(`Error en BD: ${error.message}`);
    }

    const totalTurnos = turnos?.length || 0;
    const turnosAtendidos = turnos?.filter((t: any) => t.estado === "atendido").length || 0;
    const turnosCancelados = turnos?.filter((t: any) => t.estado === "cancelado").length || 0;
    const turnosProgramados = turnos?.filter((t: any) => t.estado === "programado").length || 0;

    const tasaCancelacion = totalTurnos > 0 ? (turnosCancelados / totalTurnos) * 100 : 0;
    const tasaAsistencia = totalTurnos > 0 ? (turnosAtendidos / totalTurnos) * 100 : 0;

    return {
        totalTurnos,
        turnosAtendidos,
        turnosCancelados,
        turnosProgramados,
        tasaCancelacion,
        tasaAsistencia,
    };
}

export async function getNoShowsPorEspecialista(
    fechaInicio?: string,
    fechaFin?: string
): Promise<NoShowsPorEspecialista[]> {
    if (!fechaInicio || !fechaFin) {
        throw new Error("Parámetros de fecha requeridos");
    }

    console.log("👥 Consultando especialistas...", fechaInicio, fechaFin);

    const supabase = await createClient();
    const { data: turnos, error } = await supabase
        .from("turno")
        .select(`
      id_turno,
      estado,
      usuario:id_especialista (
        id_usuario,
        nombre,
        apellido
      )
    `)
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin);

    if (error) {
        console.error("Error consultando especialistas:", error);
        throw new Error(`Error en BD: ${error.message}`);
    }

    const especialistasMap = new Map<string, {
        id_especialista: string;
        nombre: string;
        apellido: string;
        total: number;
        programados: number;
        atendidos: number;
        cancelados: number;
    }>();

    turnos?.forEach((turno: any) => {
        const id = turno.usuario?.id_usuario;
        if (!id) return;

        if (!especialistasMap.has(id)) {
            especialistasMap.set(id, {
                id_especialista: id,
                nombre: turno.usuario?.nombre || "",
                apellido: turno.usuario?.apellido || "",
                total: 0,
                programados: 0,
                atendidos: 0,
                cancelados: 0,
            });
        }

        const especialista = especialistasMap.get(id)!;
        especialista.total++;

        if (turno.estado === "programado") especialista.programados++;
        else if (turno.estado === "atendido") especialista.atendidos++;
        else if (turno.estado === "cancelado") especialista.cancelados++;
    });

    return Array.from(especialistasMap.values()).map((esp) => ({
        id_especialista: esp.id_especialista,
        nombre: esp.nombre,
        apellido: esp.apellido,
        totalTurnos: esp.total,
        programados: esp.programados,
        atendidos: esp.atendidos,
        cancelados: esp.cancelados,
        tasaCancelacion: esp.total > 0 ? (esp.cancelados / esp.total) * 100 : 0,
    }));
}

export async function getNoShowsPorHorario(
    fechaInicio?: string,
    fechaFin?: string
): Promise<NoShowsPorHorario[]> {
    if (!fechaInicio || !fechaFin) {
        throw new Error("Parámetros de fecha requeridos");
    }

    console.log("⏰ Consultando horarios...", fechaInicio, fechaFin);

    const supabase = await createClient();
    const { data: turnos, error } = await supabase
        .from("turno")
        .select("estado, hora")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin);

    if (error) throw new Error(`Error en BD: ${error.message}`);

    const horarios: { [key: string]: { programados: number; atendidos: number; cancelados: number } } = {
        mañana: { programados: 0, atendidos: 0, cancelados: 0 },
        tarde: { programados: 0, atendidos: 0, cancelados: 0 },
        noche: { programados: 0, atendidos: 0, cancelados: 0 },
    };

    turnos?.forEach((turno: any) => {
        const hora = parseInt(turno.hora?.split(":")[0] || "9");
        let franjaHoraria = hora < 12 ? "mañana" : hora < 17 ? "tarde" : "noche";

        if (turno.estado === "programado") horarios[franjaHoraria].programados++;
        else if (turno.estado === "atendido") horarios[franjaHoraria].atendidos++;
        else if (turno.estado === "cancelado") horarios[franjaHoraria].cancelados++;
    });

    return Object.entries(horarios).map(([horario, data]) => {
        const total = data.programados + data.atendidos + data.cancelados;
        return {
            horario: horario.charAt(0).toUpperCase() + horario.slice(1),
            totalTurnos: total,
            programados: data.programados,
            atendidos: data.atendidos,
            cancelados: data.cancelados,
        };
    });
}

export async function getNoShowsPorDia(
    fechaInicio?: string,
    fechaFin?: string
): Promise<NoShowsPorDia[]> {
    if (!fechaInicio || !fechaFin) {
        throw new Error("Parámetros de fecha requeridos");
    }

    console.log("📅 Consultando días...", fechaInicio, fechaFin);

    const supabase = await createClient();
    const { data: turnos, error } = await supabase
        .from("turno")
        .select("estado, fecha")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin);

    if (error) throw new Error(`Error en BD: ${error.message}`);

    const diasMap = new Map<string, { programados: number; atendidos: number; cancelados: number }>();
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    turnos?.forEach((turno: any) => {
        const fecha = new Date(turno.fecha);
        const diaSemana = diasSemana[fecha.getDay()];

        if (!diasMap.has(diaSemana)) {
            diasMap.set(diaSemana, { programados: 0, atendidos: 0, cancelados: 0 });
        }

        const dia = diasMap.get(diaSemana)!;
        if (turno.estado === "programado") dia.programados++;
        else if (turno.estado === "atendido") dia.atendidos++;
        else if (turno.estado === "cancelado") dia.cancelados++;
    });

    return diasSemana.map((dia) => {
        const data = diasMap.get(dia) || { programados: 0, atendidos: 0, cancelados: 0 };
        const total = data.programados + data.atendidos + data.cancelados;
        return {
            dia,
            diaNumero: diasSemana.indexOf(dia),
            totalTurnos: total,
            programados: data.programados,
            atendidos: data.atendidos,
            cancelados: data.cancelados,
        };
    });
}

export async function getTendenciaNoShows(
    fechaInicio?: string,
    fechaFin?: string
): Promise<TendenciaNoShows[]> {
    if (!fechaInicio || !fechaFin) {
        throw new Error("Parámetros de fecha requeridos");
    }

    console.log("📈 Consultando tendencia...", fechaInicio, fechaFin);

    const supabase = await createClient();
    const { data: turnos, error } = await supabase
        .from("turno")
        .select("estado, fecha")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin);

    if (error) throw new Error(`Error en BD: ${error.message}`);

    const tendenciaMap = new Map<string, { programados: number; atendidos: number; cancelados: number }>();

    turnos?.forEach((turno: any) => {
        const fecha = turno.fecha;
        if (!tendenciaMap.has(fecha)) {
            tendenciaMap.set(fecha, { programados: 0, atendidos: 0, cancelados: 0 });
        }

        const dia = tendenciaMap.get(fecha)!;
        if (turno.estado === "programado") dia.programados++;
        else if (turno.estado === "atendido") dia.atendidos++;
        else if (turno.estado === "cancelado") dia.cancelados++;
    });

    return Array.from(tendenciaMap.entries())
        .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
        .map(([fecha, data]) => ({
            semana: fecha,
            programados: data.programados,
            atendidos: data.atendidos,
            cancelados: data.cancelados,
            totalTurnos: data.programados + data.atendidos + data.cancelados,
        }));
}

export async function invalidarCacheAnalytics() {
    console.log("♻️ Caché invalidado (será manejado por React Query)");
}