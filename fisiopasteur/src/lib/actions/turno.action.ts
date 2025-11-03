"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";
import { ROLES_ESPECIALISTAS } from "@/lib/constants/roles";

type Turno = Database["public"]["Tables"]["turno"]["Row"];
type TurnoInsert = Database["public"]["Tables"]["turno"]["Insert"];
type TurnoUpdate = Database["public"]["Tables"]["turno"]["Update"];

// =====================================
// 📋 FUNCIONES BÁSICAS DE TURNOS
// =====================================

// Obtener un turno específico por ID
export async function obtenerTurno(id: number) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(id_usuario, nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero)
      `)
      .eq("id_turno", id)
      .eq("id_organizacion", orgId) // ✅ Verificar que pertenece a esta org
      .single();

    if (error) {
      console.error("Error al obtener turno:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Obtener todos los turnos (con filtros básicos)
export async function obtenerTurnos(filtros?: {
  fecha?: string;
  especialista_id?: string;
  paciente_id?: number;
  estado?: string;
}) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    let query = supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(id_usuario, nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero)
      `)
      .eq("id_organizacion", orgId) // ✅ Filtrar por organización
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    // Aplicar filtros si existen
    if (filtros?.fecha) {
      query = query.eq("fecha", filtros.fecha);
    }
    if (typeof filtros?.especialista_id === "string" && filtros.especialista_id !== undefined) {
      query = query.eq("id_especialista", filtros.especialista_id);
    }
    if (typeof filtros?.paciente_id === "number") {
      query = query.eq("id_paciente", filtros.paciente_id);
    }
    if (typeof filtros?.estado === "string") {
      query = query.eq("estado", filtros.estado);
    }

    // Siempre excluir turnos de Pilates (id_especialidad = 4)
    query = query.neq("id_especialidad", 4);

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener turnos:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Obtener turnos con filtros avanzados (para la página principal)
export async function obtenerTurnosConFiltros(filtros?: {
  fecha_desde?: string;
  fecha_hasta?: string;
  especialista_id?: string;
  especialidad_id?: number;
  hora_desde?: string;
  hora_hasta?: string;
  estado?: string;
}) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    let query = supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(
          id_usuario, 
          nombre, 
          apellido, 
          color,
          especialidad:id_especialidad(id_especialidad, nombre)
        ),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero)
      `)
      .eq("id_organizacion", orgId) // ✅ Filtrar por organización
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    // Aplicar filtros de rango de fechas
    if (filtros?.fecha_desde) {
      query = query.gte("fecha", filtros.fecha_desde);
    }
    if (filtros?.fecha_hasta) {
      query = query.lte("fecha", filtros.fecha_hasta);
    }
    
    // Filtro por especialista específico
    if (typeof filtros?.especialista_id === "string") {
      query = query.eq("id_especialista", filtros.especialista_id);
    }
    
    // Filtro por especialidad del turno
    if (filtros?.especialidad_id) {
      query = query.eq("id_especialidad", filtros.especialidad_id);
    } else {
      // Si NO se especifica especialidad, EXCLUIR Pilates (id_especialidad = 4)
      query = query.neq("id_especialidad", 4);
    }
    
    // Filtros de horario
    if (filtros?.hora_desde) {
      query = query.gte("hora", filtros.hora_desde);
    }
    if (filtros?.hora_hasta) {
      query = query.lte("hora", filtros.hora_hasta);
    }
    
    // Filtro por estado
    if (filtros?.estado) {
      query = query.eq("estado", filtros.estado);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener turnos con filtros:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// ✏️ CRUD DE TURNOS
// =====================================

// Crear un nuevo turno
export async function crearTurno(
  datos: Omit<TurnoInsert, 'id_organizacion'> & { id_organizacion?: string; titulo_tratamiento?: string | null }, 
  recordatorios?: ('1h' | '2h' | '3h' | '1d' | '2d')[],
  enviarNotificacion: boolean = true,
  id_grupo_tratamiento?: string
) {

  try {
    const supabase = await createClient();
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // ============= CREAR GRUPO DE TRATAMIENTO SI HAY TÍTULO =============
    if (datos.titulo_tratamiento && !id_grupo_tratamiento && datos.id_paciente && datos.id_especialista) {
      const { data: grupo, error: errorGrupo } = await supabase
        .from('grupo_tratamiento')
        .insert({
          id_paciente: datos.id_paciente,
          id_especialista: datos.id_especialista,
          id_especialidad: datos.id_especialidad ?? undefined,
          id_organizacion: orgId,
          nombre: datos.titulo_tratamiento,
          fecha_inicio: datos.fecha,
          tipo_plan: datos.tipo_plan ?? 'particular',
        })
        .select('id_grupo')
        .single();

      if (errorGrupo) {
        console.error('Error creando grupo de tratamiento:', errorGrupo);
      } else if (grupo) {
        id_grupo_tratamiento = grupo.id_grupo;
      }
    }

    // ============= VERIFICAR DISPONIBILIDAD CON LÓGICA ESPECIAL PARA PILATES =============
    if (datos.fecha && datos.hora && datos.id_especialista) {
      const disponibilidad = await verificarDisponibilidad(
        datos.fecha,
        datos.hora,
        datos.id_especialista,
        datos.id_box || undefined,
        datos.id_especialidad ?? undefined
      );
      
      if (!disponibilidad.success || !disponibilidad.disponible) {
        if (datos.id_especialidad === 4) {
          return { 
            success: false, 
            error: `Clase de Pilates completa. Participantes: ${disponibilidad.participantes_actuales || disponibilidad.conflictos}/4` 
          };
        } else {
          return { 
            success: false, 
            error: `Horario no disponible. Conflictos: ${disponibilidad.conflictos || 0}` 
          };
        }
      }
    }

    // ✅ MULTI-ORG: Inyectar id_organizacion en los datos del turno
    const turnoConOrg = {
      ...datos,
      id_organizacion: orgId,
      ...(id_grupo_tratamiento && { id_grupo_tratamiento })
    };

    // ✅ AHORA datos es TurnoInsert puro, sin recordatorios
    const { data, error } = await supabase
      .from("turno")
      .insert(turnoConOrg)
      .select(`
        *,
        paciente:id_paciente(nombre, apellido, telefono, dni),
        especialista:id_especialista(nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(numero)
      `)
      .single();

    if (error) {
      console.error("Error al crear turno:", error);
      return { success: false, error: error.message };
    }

    // ===== 🤖 INTEGRACIÓN CON BOT DE WHATSAPP =====
    if (enviarNotificacion) {
      try {
        const { enviarConfirmacionTurno } = await import("@/lib/services/whatsapp-bot.service");
        const { 
          registrarNotificacionConfirmacion, 
          marcarNotificacionEnviada,
          marcarNotificacionFallida
        } = await import("@/lib/services/notificacion.service");

        if (data.paciente?.telefono) {
          const mensajeConfirmacion = `Turno confirmado para ${data.fecha} a las ${data.hora}`;
          const notifConfirmacion = await registrarNotificacionConfirmacion(
            data.id_turno,
            data.paciente.telefono,
            mensajeConfirmacion
          );

          if (notifConfirmacion.success && notifConfirmacion.data) {
            const turnoCompleto: any = {
              ...data,
              paciente: data.paciente ? {
                ...data.paciente,
                id_paciente: data.id_paciente || 0,
                email: null
              } : null,
              especialista: data.especialista ? {
                ...data.especialista,
                id_usuario: data.id_especialista || ''
              } : null
            };
            
            const resultadoBot = await enviarConfirmacionTurno(turnoCompleto);
            
            if (resultadoBot.status === 'success') {
              await marcarNotificacionEnviada(notifConfirmacion.data.id_notificacion);
            } else {
              await marcarNotificacionFallida(notifConfirmacion.data.id_notificacion);
            }
          }

          // Programar recordatorios
          const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");
          const { registrarNotificacionesRecordatorioFlexible } = await import("@/lib/services/notificacion.service");
          
          const tiposRecordatorio = recordatorios || ['1d', '2h'];
          const tiemposRecordatorio = calcularTiemposRecordatorio(data.fecha, data.hora, tiposRecordatorio);
          
          const recordatoriosValidos = Object.entries(tiemposRecordatorio)
            .filter(([_, fecha]) => fecha !== null)
            .reduce((acc, [tipo, fecha]) => {
              if (fecha) acc[tipo] = fecha;
              return acc;
            }, {} as Record<string, Date>);
          
          if (Object.keys(recordatoriosValidos).length > 0) {
            const mensajeRecordatorio = `Recordatorio: Tu turno es el ${data.fecha} a las ${data.hora}`;
            await registrarNotificacionesRecordatorioFlexible(
              data.id_turno,
              data.paciente.telefono,
              mensajeRecordatorio,
              recordatoriosValidos
            );
          }
        }
      } catch (botError) {
        console.error("Error en integración WhatsApp (turno creado exitosamente):", botError);
      }
    }

    revalidatePath("/turnos");
    revalidatePath("/pilates");
    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}


export async function actualizarTurno(id: number, datos: TurnoUpdate) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Si se cambia fecha/hora/especialista, verificar disponibilidad
    if (datos.fecha || datos.hora || datos.id_especialista || datos.id_box !== undefined) {
      const turnoActual = await supabase
        .from("turno")
        .select("fecha, hora, id_especialista, id_box, id_especialidad, id_organizacion")
        .eq("id_turno", id)
        .eq("id_organizacion", orgId) // ✅ Verificar que pertenece a esta org
        .single();

      if (turnoActual.data) {
        const nuevaFecha = datos.fecha || turnoActual.data.fecha;
        const nuevaHora = datos.hora || turnoActual.data.hora;
        const nuevoEspecialista = datos.id_especialista || turnoActual.data.id_especialista;
        const nuevoBox = datos.id_box !== undefined ? datos.id_box : turnoActual.data.id_box;
        const especialidadId = turnoActual.data.id_especialidad;

        // Solo verificar si cambió algo relevante Y si tenemos especialista
        const cambioRelevante = 
          datos.fecha !== turnoActual.data.fecha ||
          datos.hora !== turnoActual.data.hora ||
          datos.id_especialista !== turnoActual.data.id_especialista ||
          datos.id_box !== turnoActual.data.id_box;

        // Solo verificar disponibilidad si hay cambios relevantes Y tenemos especialista
        if (cambioRelevante && nuevoEspecialista && nuevaFecha && nuevaHora) {
          const disponibilidad = await verificarDisponibilidadParaActualizacion(
            nuevaFecha,
            nuevaHora,
            nuevoEspecialista,
            nuevoBox,
            id,
            especialidadId ?? undefined
          );
          
          if (!disponibilidad.success || !disponibilidad.disponible) {
            // Mensaje específico para Pilates
            if (especialidadId === 4) {
              return { 
                success: false, 
                error: `Clase de Pilates completa. Participantes: ${disponibilidad.participantes_actuales || disponibilidad.conflictos}/4` 
              };
            } else {
              return { 
                success: false, 
                error: `Horario no disponible. Conflictos: ${disponibilidad.conflictos || 0}` 
              };
            }
          }
        }
      } else {
        return { success: false, error: "Turno no encontrado o no pertenece a esta organización" };
      }
    }

    const { data, error } = await supabase
      .from("turno")
      .update({
        ...datos,
        updated_at: new Date().toISOString()
      })
      .eq("id_turno", id)
      .eq("id_organizacion", orgId) // ✅ Asegurar que solo actualiza de su org
      .select(`
        *,
        paciente:id_paciente(nombre, apellido, telefono, dni),
        especialista:id_especialista(nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(numero)
      `)
      .single();

    if (error) {
      console.error("Error al actualizar turno:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/turnos");
    revalidatePath("/pilates");
    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Mover un turno (Drag and Drop) - optimizado para cambio de fecha/hora
export async function moverTurno(id: number, nuevaFecha: string, nuevaHora: string) {
  'use server';
  
  const supabase = await createClient();
  
  try {
    // Obtener turno actual
    const { data: turnoActual, error: turnoError } = await supabase
      .from("turno")
      .select("*, especialista:usuario(*), especialidad:especialidad(*)")
      .eq("id_turno", id)
      .single();

    if (turnoError || !turnoActual) {
      return { success: false, error: "No se encontró el turno" };
    }

    // Verificar disponibilidad en el nuevo horario
    if (turnoActual.id_especialista) {
      const disponibilidad = await verificarDisponibilidadParaActualizacion(
        nuevaFecha,
        nuevaHora,
        turnoActual.id_especialista,
        turnoActual.id_box,
        id,
        turnoActual.id_especialidad ?? undefined
      );
      
      if (!disponibilidad.success || !disponibilidad.disponible) {
        // Mensaje específico para Pilates
        if (turnoActual.id_especialidad === 4) {
          return { 
            success: false, 
            error: `Clase de Pilates completa. Participantes: ${disponibilidad.participantes_actuales || disponibilidad.conflictos}/4` 
          };
        } else {
          return { 
            success: false, 
            error: `Horario no disponible. El especialista ya tiene un turno en ese horario` 
          };
        }
      }
    }

    // Actualizar solo fecha y hora
    const { data: turnoActualizado, error: updateError } = await supabase
      .from("turno")
      .update({ 
        fecha: nuevaFecha, 
        hora: nuevaHora,
        updated_at: new Date().toISOString()
      })
      .eq("id_turno", id)
      .select("*")
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, data: turnoActualizado };
  } catch (error: any) {
    console.error("Error al mover turno:", error);
    return { success: false, error: error.message || "Error inesperado" };
  }
}

// Eliminar un turno
export async function eliminarTurno(id: number) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Verificar que el turno pertenece a esta organización antes de eliminar
    const { data: turnoVerificado, error: errorVerificar } = await supabase
      .from("turno")
      .select("id_turno")
      .eq("id_turno", id)
      .eq("id_organizacion", orgId)
      .single();

    if (errorVerificar || !turnoVerificado) {
      return { success: false, error: "Turno no encontrado o no pertenece a esta organización" };
    }

    // Primero eliminar todas las notificaciones asociadas al turno
    const { error: notificacionesError } = await supabase
      .from("notificacion")
      .delete()
      .eq("id_turno", id)
      .eq("id_organizacion", orgId); // ✅ También filtrar notificaciones por org

    if (notificacionesError) {
      console.error("Error al eliminar notificaciones del turno:", notificacionesError);
      return { success: false, error: `Error eliminando notificaciones: ${notificacionesError.message}` };
    }

    // Luego eliminar el turno
    const { error: turnoError } = await supabase
      .from("turno")
      .delete()
      .eq("id_turno", id)
      .eq("id_organizacion", orgId); // ✅ Asegurar que solo elimina de su org

    if (turnoError) {
      console.error("Error al eliminar turno:", turnoError);
      return { success: false, error: turnoError.message };
    }

    revalidatePath("/turnos");
    revalidatePath("/pilates");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Cancelar (marcar como cancelado, sin borrar)
export async function cancelarTurno(id: number, motivo?: string) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("turno")
      .update({
        estado: "cancelado",
        updated_at: new Date().toISOString(),
      })
      .eq("id_turno", id)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/turnos");
    revalidatePath("/pilates");
    return { success: true, data };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function marcarComoAtendido(id_turno: number) {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('turno')
      .update({ 
        estado: 'atendido',
        updated_at: new Date().toISOString()
      })
      .eq('id_turno', id_turno);

    if (error) throw error;

    revalidatePath('/turnos');
    revalidatePath("/pilates");
    return { success: true };
  } catch (error) {
    console.error('Error al marcar turno como atendido:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// =====================================
// 📅 FUNCIONES DE AGENDA
// =====================================

// Obtener turnos por especialista y fecha (para vista de agenda)
export async function obtenerAgendaEspecialista(
  especialista_id: string,
  fecha: string
) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(nombre, apellido, dni, telefono, email),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(numero)
      `)
      .eq("id_especialista", especialista_id!)
      .eq("fecha", fecha)
      .neq("estado", "cancelado")
      .neq("id_especialidad", 4) // Excluir turnos de Pilates
      .order("hora", { ascending: true });

    if (error) {
      console.error("Error al obtener agenda:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// ✅ FUNCIONES DE DISPONIBILIDAD
// =====================================

/**
 * ✅ VERIFICACIÓN ESPECIAL PARA PILATES
 * En Pilates hay una sola sala, así que si cualquier especialista tiene clase a esa hora,
 * el horario está ocupado (sin importar el especialista)
 */
export async function verificarDisponibilidadPilates(
  fecha: string,
  hora: string
) {
  const supabase = await createClient();
  try {
    // Buscar CUALQUIER turno de Pilates (especialidad_id = 4) en esa fecha y hora
    const { data, error } = await supabase
      .from("turno")
      .select("id_turno, id_especialista, estado, hora")
      .eq("fecha", fecha)
      .eq("hora", hora)
      .eq("id_especialidad", 4)
      .neq("estado", "cancelado");

    if (error) {
      console.error("Error verificando disponibilidad Pilates:", error);
      return { success: false, error: error.message };
    }

    // Si hay algún turno, el horario está ocupado
    const ocupado = data.length > 0;

    return { 
      success: true, 
      disponible: !ocupado,
      conflictos: data.length,
      turnosExistentes: data
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function verificarDisponibilidad(
  fecha: string,
  hora: string,
  especialista_id?: string,
  box_id?: number,
  especialidad_id?: number
) {
  const supabase = await createClient();
  try {
    let query = supabase
      .from("turno")
      .select("id_turno, estado, hora, id_especialidad")
      .eq("fecha", fecha)
      .eq("id_especialista", especialista_id!)
      .eq("hora", hora)
      .neq("estado", "cancelado");

    if (box_id) {
      query = query.eq("id_box", box_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al verificar disponibilidad:", error);
      return { success: false, error: error.message };
    }

    // ============= LÓGICA ESPECIAL PARA PILATES =============
    if (especialidad_id === 4) {
      const pilatesTurnos = data.filter(t => t.id_especialidad === 4);
      const disponible = pilatesTurnos.length < 4;

      return {
        success: true, 
        disponible,
        conflictos: disponible ? 0 : pilatesTurnos.length,
        participantes_actuales: pilatesTurnos.length
      };
    }

    // ============= LÓGICA NORMAL PARA OTRAS ESPECIALIDADES =============
    return { 
      success: true, 
      disponible: data.length === 0,
      conflictos: data.length
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function verificarDisponibilidadParaActualizacion(
  fecha: string,
  hora: string,
  especialista_id: string,
  box_id: number | null | undefined,
  turno_excluir: number,
  especialidad_id?: number
) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from("turno")
      .select("id_turno, id_especialidad")
      .eq("fecha", fecha)
      .eq("id_especialista", especialista_id)
      .neq("estado", "cancelado")
      .neq("id_turno", turno_excluir)
      .eq("hora", hora);

    if (box_id !== null && box_id !== undefined) {
      query = query.eq("id_box", box_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al verificar disponibilidad para actualización:", error);
      return { success: false, error: error.message };
    }

    // ============= LÓGICA ESPECIAL PARA PILATES =============
    if (especialidad_id === 4) {
      const pilatesTurnos = data.filter(t => t.id_especialidad === 4);
      const disponible = pilatesTurnos.length < 4;
      
      return { 
        success: true, 
        disponible,
        conflictos: disponible ? 0 : pilatesTurnos.length,
        participantes_actuales: pilatesTurnos.length
      };
    }

    // ============= LÓGICA NORMAL =============
    return { 
      success: true, 
      disponible: data.length === 0,
      conflictos: data.length
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// 📊 FUNCIONES AUXILIARES
// =====================================

// Obtener próximo turno de un paciente por su teléfono
export async function obtenerProximoTurnoPorTelefono(telefono: string) {
  const supabase = await createClient();
  
  try {
    // Primero encontrar el paciente por teléfono
    const { data: paciente, error: pacienteError } = await supabase
      .from("paciente")
      .select("id_paciente")
      .eq("telefono", telefono)
      .single();

    if (pacienteError || !paciente) {
      return { success: true, data: null };
    }

    // Buscar el próximo turno (fecha >= hoy, ordenado por fecha y hora)
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(id_usuario, nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero)
      `)
      .eq("id_paciente", paciente.id_paciente)
      .gte("fecha", hoy)
      .neq("estado", "cancelado")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener próximo turno:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function obtenerEspecialistas() {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // ✅ NUEVO MODELO: Consultar usuario_organizacion con roles permitidos
    const { data: usuariosOrg, error: errorUsuarios } = await supabase
      .from("usuario_organizacion")
      .select(`
        id_usuario_organizacion,
        id_usuario,
        color_calendario,
        activo,
        usuario:id_usuario (
          id_usuario,
          nombre,
          apellido,
          email,
          telefono
        ),
        rol:id_rol (
          id,
          nombre,
          jerarquia
        )
      `)
      .eq("id_organizacion", orgId)
      .in("id_rol", ROLES_ESPECIALISTAS) // Solo Admin (1) y Especialistas (2), excluye Programadores (3)
      .eq("activo", true);

    if (errorUsuarios || !usuariosOrg) {
      console.error("Error al obtener usuarios:", errorUsuarios);
      return { success: false, error: errorUsuarios?.message || "No se encontraron usuarios" };
    }

    // ✅ NUEVO MODELO: Obtener especialidades por id_usuario_organizacion
    const idsUsuarioOrg = usuariosOrg.map(uo => uo.id_usuario_organizacion);
    
    const { data: usuarioEspecialidades, error: errorEspecialidades } = await supabase
      .from("usuario_especialidad")
      .select(`
        id_usuario_organizacion,
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      `)
      .in("id_usuario_organizacion", idsUsuarioOrg)
      .eq("activo", true);

    if (errorEspecialidades) {
      console.error("Error al obtener especialidades:", errorEspecialidades);
    }

    // Mapear especialidades por id_usuario_organizacion
    const especialidadesMap = new Map();
    usuarioEspecialidades?.forEach(item => {
      if (!especialidadesMap.has(item.id_usuario_organizacion)) {
        especialidadesMap.set(item.id_usuario_organizacion, []);
      }
      // @ts-ignore - especialidad es join
      if (item.especialidad) {
        especialidadesMap.get(item.id_usuario_organizacion).push({
          // @ts-ignore
          especialidad: item.especialidad
        });
      }
    });

    // ✅ Combinar usuarios con sus especialidades (nuevo formato)
    const especialistas = usuariosOrg.map(usuarioOrg => {
      // @ts-ignore - usuario y rol son joins
      const usuario = usuarioOrg.usuario;
      // @ts-ignore
      const rol = usuarioOrg.rol;
      
      return {
        id_usuario: usuarioOrg.id_usuario,
        id_usuario_organizacion: usuarioOrg.id_usuario_organizacion,
        nombre: usuario?.nombre,
        apellido: usuario?.apellido,
        color: usuarioOrg.color_calendario, // ✅ Ahora viene de usuario_organizacion
        email: usuario?.email,
        telefono: usuario?.telefono,
        activo: usuarioOrg.activo, // ✅ Ahora viene de usuario_organizacion
        id_rol: rol?.id,
        rol: rol,
        especialidad: null,
        usuario_especialidad: especialidadesMap.get(usuarioOrg.id_usuario_organizacion) || []
      };
    });

    return { success: true, data: especialistas };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function obtenerEspecialidades() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("especialidad")
      .select("*")
      .order("nombre");

    if (error) {
      console.error("Error al obtener especialidades:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function obtenerBoxes() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("box")
      .select("*")
      .eq("estado", "activo")
      .order("numero");

    if (error) {
      console.error("Error al obtener boxes:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function obtenerPrecioEspecialidad(
  especialista_id: string,
  especialidad_id: number,
  tipo_plan: 'particular' | 'obra_social'
) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('usuario_especialidad')
      .select('precio_particular, precio_obra_social, activo')
      .eq('id_usuario', especialista_id)
      .eq('id_especialidad', especialidad_id)
      .maybeSingle();

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      const faltanColumnas = msg.includes('column') && (msg.includes('precio_particular') || msg.includes('precio_obra_social'));
      if (faltanColumnas) {
        return {
          success: false,
          error: 'Faltan columnas precio_particular/precio_obra_social en usuario_especialidad.'
        } as const;
      }
      return { success: false, error: error.message } as const;
    }

    if (!data) return { success: true, precio: null } as const;
    const precio = tipo_plan === 'particular' ? data.precio_particular : data.precio_obra_social;
    return { success: true, precio: precio ?? null } as const;
  } catch (e) {
    return { success: false, error: 'Error inesperado al obtener precio' } as const;
  }
}

export async function obtenerPacientes(busqueda?: string) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from("paciente")
      .select("id_paciente, nombre, apellido, dni, telefono, email")
      .order("apellido")
      .order("nombre");

    if (busqueda && busqueda.length > 2) {
      query = query.or(`nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,dni.ilike.%${busqueda}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener pacientes:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// 📈 FUNCIONES DE ESTADÍSTICAS
// =====================================

export async function obtenerEstadisticasTurnos(fecha_desde?: string, fecha_hasta?: string) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from("turno")
      .select("estado, created_at, fecha, id_especialista");

    if (fecha_desde) {
      query = query.gte("fecha", fecha_desde);
    }
    if (fecha_hasta) {
      query = query.lte("fecha", fecha_hasta);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener estadísticas:", error);
      return { success: false, error: error.message };
    }

    const total = data.length;
    const porEstado = data.reduce((acc: any, turno) => {
      acc[turno.estado || 'sin_estado'] = (acc[turno.estado || 'sin_estado'] || 0) + 1;
      return acc;
    }, {});

    const porEspecialista = data.reduce((acc: any, turno) => {
      if (turno.id_especialista) {
        acc[turno.id_especialista] = (acc[turno.id_especialista] || 0) + 1;
      }
      return acc;
    }, {});

    return { 
      success: true, 
      data: {
        total,
        porEstado,
        porEspecialista,
        periodo: { fecha_desde, fecha_hasta }
      }
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// ...existing code...

// =====================================
// 📊 HISTORIAL CLÍNICO
// =====================================

/**
 * Obtener turnos de un paciente agrupados por tratamiento
 */
export async function obtenerHistorialClinicoPorPaciente(id_paciente: string | number) {
  const supabase = await createClient();
  
  try {
    // ✅ Normalizar a número (convertir si es string)
    const pacienteId = typeof id_paciente === 'string' ? parseInt(id_paciente, 10) : id_paciente;
    
    // 1️⃣ Primero obtener los turnos
    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        especialista:id_especialista(id_usuario, nombre, apellido),
        especialidad:id_especialidad(id_especialidad, nombre)
      `)
      .eq("id_paciente", pacienteId)
      .not("id_grupo_tratamiento", "is", null)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (error) {
      console.error("❌ Error obteniendo historial:", error);
      return { success: false, error: error.message };
    }

    // 2️⃣ Obtener los IDs únicos de grupos de tratamiento (filtrar nulls)
    const gruposIds = [...new Set(
      data?.map(t => t.id_grupo_tratamiento).filter((id): id is string => id !== null)
    )];
    
    // 3️⃣ Obtener información de los grupos de tratamiento
    const { data: gruposTratamiento, error: errorGrupos } = await supabase
      .from("grupo_tratamiento")
      .select("id_grupo, nombre")
      .in("id_grupo", gruposIds);
    
    if (errorGrupos) {
      console.warn("⚠️ No se pudieron obtener nombres de grupos:", errorGrupos);
    }
    
    // 4️⃣ Crear un mapa de grupos por ID para búsqueda rápida
    const gruposMap = new Map(
      gruposTratamiento?.map(g => [g.id_grupo, g.nombre]) || []
    );

    // 5️⃣ Agrupar turnos por id_grupo_tratamiento
    const gruposHistorial = new Map();
    
    data?.forEach(turno => {
      const grupoId = turno.id_grupo_tratamiento;
      if (!gruposHistorial.has(grupoId)) {
        gruposHistorial.set(grupoId, {
          id_grupo: grupoId,
          // ✅ PRIORIDAD: nombre del grupo de tratamiento > nombre de especialidad
          especialidad: (grupoId ? gruposMap.get(grupoId) : null) || turno.especialidad?.nombre || "Sin especialidad",
          especialista: turno.especialista,
          fecha_inicio: turno.fecha,
          tipo_plan: turno.tipo_plan,
          total_sesiones: 0,
          turnos: []
        });
      }
      
      const grupo = gruposHistorial.get(grupoId);
      grupo.turnos.push(turno);
      grupo.total_sesiones = grupo.turnos.length;
    });

    const grupos = Array.from(gruposHistorial.values()).sort((a, b) => 
      new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
    );

    return { success: true, data: grupos };
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Actualizar evolución clínica de un turno
 */
export async function actualizarEvolucionClinica(
  id_turno: number, 
  evolucion_clinica: string
) {
  const supabase = await createClient();
  
  try {
    // ✅ Obtener turno actual para validar tiempo de edición
    const { data: turnoActual, error: errorGet } = await supabase
      .from("turno")
      .select("evolucion_completada_en")
      .eq("id_turno", id_turno)
      .single();

    if (errorGet) {
      return { success: false, error: "Turno no encontrado" };
    }

    // ✅ Validar límite de 5 minutos si ya existe evolución
    if (turnoActual.evolucion_completada_en) {
      const tiempoTranscurrido = Date.now() - new Date(turnoActual.evolucion_completada_en).getTime();
      const cincoMinutos = 5 * 60 * 1000;
      
      if (tiempoTranscurrido > cincoMinutos) {
        return { 
          success: false, 
          error: "No se puede editar la evolución después de 5 minutos" 
        };
      }
    }

    // ✅ Actualizar evolución
    const { error } = await supabase
      .from("turno")
      .update({
        evolucion_clinica,
        evolucion_completada_en: new Date().toISOString()
      })
      .eq("id_turno", id_turno);

    if (error) {
      console.error("❌ Error actualizando evolución:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/pacientes");
    return { success: true };
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// 🔁 CREAR TURNOS EN LOTE (PILATES)
// =====================================

export async function crearTurnosEnLote(turnos: Array<{
  id_paciente: string;
  id_especialista: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  id_clase_pilates?: string;
  descripcion?: string;
  tipo?: string;
  estado?: string;
  dificultad?: 'principiante' | 'intermedio' | 'avanzado';
}>) {
  try {
    const supabase = await createClient();
    
    // ✅ Obtener id_organizacion del usuario actual
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    const turnosCreados = [];
    const errores = [];

    // Crear turnos uno por uno
    for (const turnoData of turnos) {
      try {
        // ✅ CORRECCIÓN: Agregar id_organizacion
        const { data: turno, error } = await supabase
          .from("turno")
          .insert({
            id_paciente: parseInt(turnoData.id_paciente),
            id_especialista: turnoData.id_especialista,
            fecha: turnoData.fecha,
            hora: turnoData.hora_inicio,
            id_especialidad: 4,
            estado: turnoData.estado || 'programado',
            tipo_plan: 'particular',
            dificultad: turnoData.dificultad || 'principiante',
            id_organizacion: orgId // ✅ Inyectar orgId
          })
          .select()
          .single();

        if (error) {
          errores.push({
            turno: turnoData,
            error: error.message
          });
          continue;
        }

        turnosCreados.push(turno);
        
        // Programar recordatorios individuales para cada turno
        try {
          const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");
          const { registrarNotificacionesRecordatorioFlexible } = await import("@/lib/services/notificacion.service");
          
          const tiposRecordatorio: ('1d' | '2h')[] = ['1d', '2h'];
          const tiemposRecordatorio = calcularTiemposRecordatorio(turno.fecha, turno.hora, tiposRecordatorio);
          
          if (turno.id_paciente) {
            const { data: pacienteData } = await supabase
              .from("paciente")
              .select("telefono, nombre")
              .eq("id_paciente", turno.id_paciente)
              .single();
            
            if (pacienteData?.telefono) {
              const mensaje = `Recordatorio: Tienes un turno de Pilates programado`;
              const tiemposValidos: Record<string, Date> = {};
              Object.entries(tiemposRecordatorio).forEach(([tipo, fecha]) => {
                if (fecha) {
                  tiemposValidos[tipo] = fecha;
                }
              });
              
              if (Object.keys(tiemposValidos).length > 0) {
                await registrarNotificacionesRecordatorioFlexible(
                  turno.id_turno,
                  pacienteData.telefono,
                  mensaje,
                  tiemposValidos
                );
              }
            }
          }
        } catch (recordatorioError) {
          console.warn(`⚠️ No se pudieron programar recordatorios para turno ${turno.id_turno}:`, recordatorioError);
        }
      } catch (error) {
        errores.push({
          turno: turnoData,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Procesar notificaciones agrupadas de confirmación
    if (turnosCreados.length > 0) {
      await procesarNotificacionesRepeticion(turnosCreados);
    }

    return {
      success: true,
      data: {
        turnosCreados,
        errores,
        total: turnos.length,
        exitosos: turnosCreados.length,
        fallidos: errores.length
      }
    };
  } catch (error) {
    console.error("Error al crear turnos en lote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

// =====================================
// 📱 NOTIFICACIONES AGRUPADAS
// =====================================

async function procesarNotificacionesRepeticion(turnos: any[]) {
  try {
    // Agrupar turnos por paciente
    const turnosPorPaciente = turnos.reduce((acc: Record<string, any[]>, turno) => {
      if (!acc[turno.id_paciente]) {
        acc[turno.id_paciente] = [];
      }
      acc[turno.id_paciente].push(turno);
      return acc;
    }, {});

    // Enviar notificación agrupada por cada paciente
    for (const [id_paciente, turnosPaciente] of Object.entries(turnosPorPaciente)) {
      await enviarNotificacionGrupal(id_paciente, turnosPaciente);
    }
  } catch (error) {
    console.error("Error al procesar notificaciones de repetición:", error);
  }
}

// ✅ FUNCIÓN SIMPLIFICADA - Solo delega al servicio de WhatsApp
async function enviarNotificacionGrupal(id_paciente: string, turnos: any[]) {
  try {
    const supabase = await createClient();
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();
    
    // 1. Obtener datos del paciente
    const { data: paciente } = await supabase
      .from("paciente")
      .select("nombre, telefono")
      .eq("id_paciente", parseInt(id_paciente))
      .eq("id_organizacion", orgId) // ✅ Verificar que pertenece a esta org
      .single();

    if (!paciente || !paciente.telefono) {
      console.error("No se pudieron obtener datos del paciente o no tiene teléfono");
      return;
    }

    // 2. Registrar notificación en BD - ✅ CORRECCIÓN: Agregar id_organizacion
    const { data: notificacion } = await supabase
      .from("notificacion")
      .insert({
        id_turno: turnos[0].id_turno,
        mensaje: `Confirmación de ${turnos.length} turnos de Pilates`,
        medio: "whatsapp",
        telefono: paciente.telefono,
        estado: "pendiente",
        id_organizacion: orgId // ✅ Inyectar orgId
      })
      .select()
      .single();

    // 3. Importar y llamar al servicio de WhatsApp (que tiene toda la lógica)
    const whatsappService = await import('../services/whatsapp-bot.service');
    const resultado = await whatsappService.enviarNotificacionGrupal(
      paciente.telefono,
      paciente.nombre,
      turnos
    );

    // 4. Actualizar estado según resultado
    if (resultado.status === 'success') {
      if (notificacion) {
        await supabase
          .from("notificacion")
          .update({ 
            estado: "enviada", 
            fecha_envio: new Date().toISOString() 
          })
          .eq("id_notificacion", notificacion.id_notificacion);
      }
    } else {
      console.error(`❌ Error enviando notificación agrupada: ${resultado.message}`);
      
      if (notificacion) {
        await supabase
          .from("notificacion")
          .update({ estado: "fallida" })
          .eq("id_notificacion", notificacion.id_notificacion);
      }
    }
  } catch (error) {
    console.error("Error al enviar notificación agrupada:", error);
  }
}

// =====================================
// ⏰ ACTUALIZAR TURNOS VENCIDOS
// =====================================

/**
 * ✅ Función para marcar como "vencido" los turnos programados cuya fecha/hora ya pasó
 * Se ejecuta automáticamente cada vez que se carga la página de turnos
 */
export async function actualizarTurnosVencidos() {
  const supabase = await createClient();
  
  try {
    const ahora = new Date();
    const fechaActual = ahora.toISOString().split('T')[0]; // yyyy-MM-dd
    const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 8); // HH:MM:SS
    // Obtener turnos "programado" que ya pasaron
    const { data: turnosProgramados, error: fetchError } = await supabase
      .from('turno')
      .select('id_turno, fecha, hora, id_paciente, id_especialista')
      .eq('estado', 'programado');

    if (fetchError) {
      console.error('❌ Error obteniendo turnos programados:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!turnosProgramados || turnosProgramados.length === 0) {
      return { success: true, data: [], mensaje: 'No hay turnos programados' };
    }

    // Filtrar los que ya pasaron
    const turnosVencidos = turnosProgramados.filter(turno => {
      const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora}`);
      return fechaHoraTurno < ahora;
    });

    if (turnosVencidos.length === 0) {
      return { success: true, data: [], mensaje: 'No hay turnos vencidos' };
    }

    // Actualizar a estado "vencido"
    const idsVencidos = turnosVencidos.map(t => t.id_turno);
    
    const { error: updateError } = await supabase
      .from('turno')
      .update({ 
        estado: 'vencido',
        updated_at: new Date().toISOString()
      })
      .in('id_turno', idsVencidos);

    if (updateError) {
      console.error('❌ Error actualizando turnos vencidos:', updateError);
      return { success: false, error: updateError.message };
    }    
    // Revalidar las rutas para que se actualice la UI
    revalidatePath('/turnos');
    revalidatePath('/inicio');
    
    return { 
      success: true, 
      data: turnosVencidos,
      mensaje: `${turnosVencidos.length} turno(s) actualizado(s) a vencido`
    };

  } catch (error) {
    console.error('❌ Error en actualizarTurnosVencidos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// =====================================
// 🏥 GRUPOS DE TRATAMIENTO
// =====================================

/**
 * Actualizar información de un grupo de tratamiento
 */
export async function actualizarGrupoTratamiento(
  id_grupo: string,
  datos: { nombre?: string }
) {
  const supabase = await createClient();
  
  try {
    console.log('📝 Actualizando grupo de tratamiento:', { id_grupo, datos });
    
    // Validar que el grupo existe
    const { data: grupoExistente, error: errorBusqueda } = await supabase
      .from('grupo_tratamiento')
      .select('id_grupo, nombre')
      .eq('id_grupo', id_grupo)
      .single();
    
    if (errorBusqueda) {
      console.error('❌ Error buscando grupo:', errorBusqueda);
      return { success: false, error: `Grupo no encontrado: ${errorBusqueda.message}` };
    }
    
    console.log('✅ Grupo encontrado:', grupoExistente);
    
    const { data, error } = await supabase
      .from('grupo_tratamiento')
      .update({
        nombre: datos.nombre,
        updated_at: new Date().toISOString()
      })
      .eq('id_grupo', id_grupo)
      .select();

    if (error) {
      console.error('❌ Error actualizando grupo de tratamiento:', error);
      return { success: false, error: error.message || 'Error al actualizar' };
    }

    console.log('✅ Grupo actualizado exitosamente:', data);
    revalidatePath('/pacientes');
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    return { success: false, error: error.message || 'Error inesperado' };
  }
}
