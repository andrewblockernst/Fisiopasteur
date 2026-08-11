"use server";

import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/auth/usuario-actual";
import { esAdmin } from "@/lib/constants/roles";
import { dayjs, now } from "@/lib/dayjs";

export interface NotificacionPendiente {
  id: number;
  tipo: "recordatorio" | "confirmacion";
  paciente: string;
  telefono: string;
  turno_fecha: string | null;
  turno_hora: string | null;
  especialista: string | null;
  programado_para: string | null;
  minutos_restantes: number | null;
  vencida: boolean;
}

export interface NotificacionReciente {
  id: number;
  estado: string;
  tipo: "recordatorio" | "confirmacion";
  paciente: string;
  telefono: string;
  programado_para: string | null;
  enviado_en: string | null;
}

export interface EstadoNotificaciones {
  esAdmin: boolean;
  resumen: {
    pendientes_total: number;
    vencidas: number;
    proximas: number;
    enviadas_semana: number;
    fallidas_semana: number;
  };
  vencidas: NotificacionPendiente[];
  proximas: NotificacionPendiente[];
  recientes: NotificacionReciente[];
}

type Resultado =
  | { ok: true; data: EstadoNotificaciones }
  | { ok: false; error: string };

const tipoDe = (mensaje: string | null): "recordatorio" | "confirmacion" =>
  mensaje?.includes("[RECORDATORIO") ? "recordatorio" : "confirmacion";

const nombrePaciente = (p: any): string =>
  p ? `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || "Sin datos" : "Sin datos";

const nombreEspecialista = (e: any): string | null =>
  e ? `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim() || null : null;

/**
 * Estado de las notificaciones de WhatsApp para el panel.
 * - Admin/Programador: ve todas.
 * - Especialista: solo las de sus turnos (y por ende sus pacientes).
 */
export async function obtenerEstadoNotificaciones(): Promise<Resultado> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return { ok: false, error: "No autorizado" };

  const admin = esAdmin(usuario.id_rol);
  const supabase = await createClient();
  const ahora = now();
  const hace7d = ahora.subtract(7, "day").toISOString();
  const en7d = ahora.add(7, "day").toISOString();

  // Especialista → inner join filtrando por su id; admin → embedding normal (incluye sin turno).
  const turnoSelect = admin
    ? `turno:id_turno(
         fecha, hora,
         paciente:id_paciente(nombre, apellido, telefono),
         especialista:id_especialista(nombre, apellido)
       )`
    : `turno:id_turno!inner(
         fecha, hora, id_especialista,
         paciente:id_paciente(nombre, apellido, telefono),
         especialista:id_especialista(nombre, apellido)
       )`;

  let pendientesQuery = supabase
    .from("notificacion")
    .select(`id_notificacion, mensaje, telefono, fecha_programada, ${turnoSelect}`)
    .eq("estado", "pendiente")
    // Solo recordatorios: las confirmaciones son un trigger, no un registro que se procese/monitoree.
    .ilike("mensaje", "%[RECORDATORIO%")
    // Vencidas (pasado) + próximas hasta 7 días adelante; el resto queda fuera para no saturar.
    .lte("fecha_programada", en7d)
    .order("fecha_programada", { ascending: true });

  let recientesQuery = supabase
    .from("notificacion")
    .select(`id_notificacion, estado, mensaje, telefono, fecha_programada, fecha_envio, ${turnoSelect}`)
    .in("estado", ["enviado", "fallido"])
    .ilike("mensaje", "%[RECORDATORIO%")
    .gte("fecha_envio", hace7d)
    .order("fecha_envio", { ascending: false })
    // ponytail: cap de 500; paginación es client-side. Subir o pasar a server-side si un centro supera esto por semana.
    .limit(500);

  if (!admin) {
    pendientesQuery = pendientesQuery.eq("turno.id_especialista", usuario.id_usuario);
    recientesQuery = recientesQuery.eq("turno.id_especialista", usuario.id_usuario);
  }

  const [{ data: pendientes, error: errP }, { data: recientes, error: errR }] =
    await Promise.all([pendientesQuery, recientesQuery]);

  if (errP || errR) {
    return { ok: false, error: (errP || errR)?.message ?? "Error consultando notificaciones" };
  }

  const pendientesFmt: NotificacionPendiente[] = (pendientes ?? []).map((n: any) => {
    const minutos = dayjs(n.fecha_programada).diff(ahora, "minute");
    return {
      id: n.id_notificacion,
      tipo: tipoDe(n.mensaje),
      paciente: nombrePaciente(n.turno?.paciente),
      telefono: n.turno?.paciente?.telefono || n.telefono || "Sin teléfono",
      turno_fecha: n.turno?.fecha ?? null,
      turno_hora: n.turno?.hora ? String(n.turno.hora).slice(0, 5) : null,
      especialista: nombreEspecialista(n.turno?.especialista),
      programado_para: n.fecha_programada,
      minutos_restantes: minutos,
      vencida: minutos <= 0,
    };
  });

  const recientesFmt: NotificacionReciente[] = (recientes ?? []).map((n: any) => ({
    id: n.id_notificacion,
    estado: n.estado,
    tipo: tipoDe(n.mensaje),
    paciente: nombrePaciente(n.turno?.paciente),
    telefono: n.turno?.paciente?.telefono || n.telefono || "Sin teléfono",
    programado_para: n.fecha_programada,
    enviado_en: n.fecha_envio,
  }));

  const vencidas = pendientesFmt.filter((n) => n.vencida);
  const proximas = pendientesFmt.filter((n) => !n.vencida);

  return {
    ok: true,
    data: {
      esAdmin: admin,
      resumen: {
        pendientes_total: pendientesFmt.length,
        vencidas: vencidas.length,
        proximas: proximas.length,
        enviadas_semana: recientesFmt.filter((r) => r.estado === "enviado").length,
        fallidas_semana: recientesFmt.filter((r) => r.estado === "fallido").length,
      },
      vencidas,
      proximas,
      recientes: recientesFmt,
    },
  };
}
