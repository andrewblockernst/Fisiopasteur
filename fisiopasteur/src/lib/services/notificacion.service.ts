"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";

type NotificacionInsert = Database["public"]["Tables"]["notificacion"]["Insert"];
type NotificacionUpdate = Database["public"]["Tables"]["notificacion"]["Update"];
type NotificacionRow = Database["public"]["Tables"]["notificacion"]["Row"];

// =====================================
// 📧 GESTIÓN DE NOTIFICACIONES EN BD
// =====================================

/**
 * Crear registro de notificación en la base de datos
 */
export async function crearNotificacion(datos: NotificacionInsert) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("notificacion")
      .insert(datos)
      .select("*")
      .single();

    if (error) {
      console.error("Error creando notificación:", error);
      return { success: false, error: error.message };
    }

    console.log(`📧 Notificación registrada: ID ${data.id_notificacion}`);
    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado creando notificación:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Actualizar estado de una notificación
 */
export async function actualizarEstadoNotificacion(
  id: number, 
  estado: 'pendiente' | 'enviado' | 'fallido' | 'leido',
  fechaEnvio?: string
) {
  const supabase = await createClient();
  
  try {
    const updateData: NotificacionUpdate = {
      estado,
      ...(fechaEnvio && { fecha_envio: fechaEnvio })
    };

    const { data, error } = await supabase
      .from("notificacion")
      .update(updateData)
      .eq("id_notificacion", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error actualizando notificación:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado actualizando notificación:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Obtener notificaciones de un turno específico
 */
export async function obtenerNotificacionesTurno(idTurno: number) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("notificacion")
      .select("*")
      .eq("id_turno", idTurno)
      .order("fecha_programada", { ascending: true });

    if (error) {
      console.error("Error obteniendo notificaciones:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado obteniendo notificaciones:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Obtener notificaciones pendientes de enviar
 */
export async function obtenerNotificacionesPendientes() {
  const supabase = await createClient();
  
  try {
    const ahora = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("notificacion")
      .select(`
        *,
        turno:id_turno(
          *,
          paciente:id_paciente(nombre, apellido, telefono),
          especialista:id_especialista(nombre, apellido),
          especialidad:id_especialidad(nombre)
        )
      `)
      .eq("estado", "pendiente")
      .lte("fecha_programada", ahora)
      .order("fecha_programada", { ascending: true });

    if (error) {
      console.error("Error obteniendo notificaciones pendientes:", error);
      return { success: false, error: error.message };
    }

    console.log(`📋 Notificaciones pendientes encontradas: ${data?.length || 0}`);
    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado obteniendo notificaciones pendientes:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// 🤖 FUNCIONES DE INTEGRACIÓN CON BOT
// =====================================

/**
 * Registrar notificación de confirmación para un turno
 */
export async function registrarNotificacionConfirmacion(
  idTurno: number, 
  telefono: string, 
  mensaje: string
) {
  const notificacion: NotificacionInsert = {
    id_turno: idTurno,
    medio: 'whatsapp',
    mensaje: mensaje,
    telefono: telefono,
    estado: 'pendiente',
    fecha_programada: new Date().toISOString(),
  };

  return await crearNotificacion(notificacion);
}

/**
 * Registrar notificaciones de recordatorio para un turno (versión flexible)
 */
export async function registrarNotificacionesRecordatorioFlexible(
  idTurno: number,
  telefono: string,
  mensaje: string,
  fechasRecordatorio: Record<string, Date>
) {
  const resultados = [];
  
  console.log(`📝 Iniciando registro de ${Object.keys(fechasRecordatorio).length} notificaciones para turno ${idTurno}`);
  
  for (const [tipo, fecha] of Object.entries(fechasRecordatorio)) {
    if (fecha) {
      const notificacionRecordatorio: NotificacionInsert = {
        id_turno: idTurno,
        medio: 'whatsapp',
        mensaje: `[RECORDATORIO ${tipo.toUpperCase()}] ${mensaje}`,
        telefono: telefono,
        estado: 'pendiente',
        fecha_programada: fecha.toISOString(),
      };
      
      console.log(`  💾 Guardando notificación ${tipo}: fecha_programada=${fecha.toISOString()}, telefono=${telefono}`);
      const resultado = await crearNotificacion(notificacionRecordatorio);
      console.log(`  ${resultado.success ? '✅' : '❌'} Resultado para ${tipo}:`, resultado.success ? 'OK' : resultado.error);
      resultados.push({ tipo, resultado });
    }
  }
  
  console.log(`📝 Registro completado: ${resultados.length} notificaciones procesadas`);
  return resultados;
}

/**
 * Registrar notificaciones de recordatorio para un turno (versión legacy)
 */
export async function registrarNotificacionesRecordatorio(
  idTurno: number,
  telefono: string,
  mensaje: string,
  fechasRecordatorio: { recordatorio24h?: Date; recordatorio2h?: Date }
) {
  const resultados = [];
  
  // Recordatorio 24h antes
  if (fechasRecordatorio.recordatorio24h) {
    const notificacion24h: NotificacionInsert = {
      id_turno: idTurno,
      medio: 'whatsapp',
      mensaje: `[RECORDATORIO 24H] ${mensaje}`,
      telefono: telefono,
      estado: 'pendiente',
      fecha_programada: fechasRecordatorio.recordatorio24h.toISOString(),
    };
    
    const resultado24h = await crearNotificacion(notificacion24h);
    resultados.push({ tipo: '24h', resultado: resultado24h });
  }
  
  // Recordatorio 2h antes
  if (fechasRecordatorio.recordatorio2h) {
    const notificacion2h: NotificacionInsert = {
      id_turno: idTurno,
      medio: 'whatsapp',
      mensaje: `[RECORDATORIO 2H] ${mensaje}`,
      telefono: telefono,
      estado: 'pendiente',
      fecha_programada: fechasRecordatorio.recordatorio2h.toISOString(),
    };
    
    const resultado2h = await crearNotificacion(notificacion2h);
    resultados.push({ tipo: '2h', resultado: resultado2h });
  }
  
  return resultados;
}

/**
 * Marcar notificación como enviada exitosamente
 */
export async function marcarNotificacionEnviada(
  idNotificacion: number, 
  fechaEnvio?: Date
) {
  const fecha = fechaEnvio || new Date();
  return await actualizarEstadoNotificacion(
    idNotificacion, 
    'enviado', 
    fecha.toISOString()
  );
}

/**
 * Marcar notificación como fallida
 */
export async function marcarNotificacionFallida(idNotificacion: number) {
  return await actualizarEstadoNotificacion(idNotificacion, 'fallido');
}

/**
 * Obtener estadísticas de notificaciones
 */
export async function obtenerEstadisticasNotificaciones(fechaDesde?: string, fechaHasta?: string) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from("notificacion")
      .select("estado, medio, fecha_envio, fecha_programada");

    if (fechaDesde) {
      query = query.gte("fecha_programada", fechaDesde);
    }
    if (fechaHasta) {
      query = query.lte("fecha_programada", fechaHasta);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error obteniendo estadísticas:", error);
      return { success: false, error: error.message };
    }

    // Procesar estadísticas
    const total = data.length;
    const porEstado = data.reduce((acc: Record<string, number>, notif) => {
      if (notif.estado) {
        acc[notif.estado] = (acc[notif.estado] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const porMedio = data.reduce((acc: Record<string, number>, notif) => {
      acc[notif.medio] = (acc[notif.medio] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const estadisticas = {
      total,
      porEstado,
      porMedio,
      tasaExito: total > 0 ? ((porEstado.enviado || 0) / total * 100).toFixed(1) : '0.0'
    };

    return { success: true, data: estadisticas };
  } catch (error) {
    console.error("Error inesperado obteniendo estadísticas:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Limpiar notificaciones antiguas (más de 30 días)
 */
export async function limpiarNotificacionesAntiguas() {
  const supabase = await createClient();
  
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    
    const { error, count } = await supabase
      .from("notificacion")
      .delete({ count: 'exact' })
      .lt("fecha_programada", fechaLimite.toISOString());

    if (error) {
      console.error("Error limpiando notificaciones:", error);
      return { success: false, error: error.message };
    }

    console.log(`🧹 Limpieza completada: ${count || 0} notificaciones eliminadas`);
    return { success: true, data: { eliminadas: count || 0 } };
  } catch (error) {
    console.error("Error inesperado limpiando notificaciones:", error);
    return { success: false, error: "Error inesperado" };
  }
}