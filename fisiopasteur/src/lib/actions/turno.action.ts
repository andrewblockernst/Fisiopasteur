// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";
import { ROLES_ESPECIALISTAS } from "@/lib/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/utils/auth-context";

type Turno = Database["public"]["Tables"]["turno"]["Row"];
type TurnoInsert = Database["public"]["Tables"]["turno"]["Insert"];
type TurnoUpdate = Database["public"]["Tables"]["turno"]["Update"];
type SupabaseClientType = SupabaseClient<Database>;

// =====================================
// 📋 FUNCIONES BÁSICAS DE TURNOS
// =====================================

// Obtener un turno específico por ID
export async function obtenerTurno(id: number): Promise<
  | { success: true; data: any }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
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
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
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
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
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
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
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
  especialista_ids?: string[];
  especialidad_ids?: string[];
  hora_desde?: string;
  hora_hasta?: string;
  estados?: string[];
}) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    let query = supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista!inner(
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
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    // Aplicar filtros de rango de fechas
    if (filtros?.fecha_desde) {
      query = query.gte("fecha", filtros.fecha_desde);
    }
    if (filtros?.fecha_hasta) {
      query = query.lte("fecha", filtros.fecha_hasta);
    }
    
    // Filtro por especialistas (múltiples valores)
    if (filtros?.especialista_ids && filtros.especialista_ids.length > 0) {
      query = query.in("id_especialista", filtros.especialista_ids);
    }
    
    // Filtro por especialidades (múltiples valores)
    if (filtros?.especialidad_ids && filtros.especialidad_ids.length > 0) {
      query = query.in("id_especialidad", filtros.especialidad_ids);
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
    
    // Filtro por estados (múltiples valores)
    if (filtros?.estados && filtros.estados.length > 0) {
      query = query.in("estado", filtros.estados);
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
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // ============= CREAR GRUPO DE TRATAMIENTO SI HAY TÍTULO =============
    if (datos.titulo_tratamiento && !id_grupo_tratamiento && datos.id_paciente && datos.id_especialista) {
      const nuevoGrupo: Database["public"]["Tables"]["grupo_tratamiento"]["Insert"] = {
        id_paciente: datos.id_paciente,
        id_especialista: datos.id_especialista,
        id_especialidad: datos.id_especialidad ?? undefined,
        id_organizacion: orgId,
        nombre: datos.titulo_tratamiento,
        fecha_inicio: datos.fecha,
        tipo_plan: datos.tipo_plan ?? 'particular',
      };

      const { data: grupo, error: errorGrupo } = await supabase
        .from('grupo_tratamiento')
        .insert(nuevoGrupo as any)
        .select('id_grupo')
        .single();

      if (errorGrupo) {
        console.error('Error creando grupo de tratamiento:', errorGrupo);
      } else if (grupo) {
        id_grupo_tratamiento = (grupo as any).id_grupo;
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
    const turnoConOrg: TurnoInsert = {
      ...datos,
      id_organizacion: orgId,
      ...(id_grupo_tratamiento && { id_grupo_tratamiento })
    };

    // ✅ AHORA datos es TurnoInsert puro, sin recordatorios
    const { data, error } = await supabase
      .from("turno")
      .insert(turnoConOrg as any)
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

    const turnoCreado = data as any;

    // ===== 🤖 INTEGRACIÓN CON BOT DE WHATSAPP =====
    if (enviarNotificacion) {
      // ⚡ Ejecutar notificaciones en segundo plano (no blocking)
      // Esto evita que un error o timeout en WhatsApp bloquee la creación del turno
      Promise.resolve().then(async () => {
        try {
          const { registrarNotificacionConfirmacion } = await import("@/lib/services/notificacion.service");

          if (turnoCreado.paciente?.telefono) {
            const mensajeConfirmacion = `Turno confirmado para ${turnoCreado.fecha} a las ${turnoCreado.hora}`;
            
            // ✅ Registrar confirmación para que el cron la procese
            // Timeout de 3 segundos para evitar bloqueos
            await Promise.race([
              registrarNotificacionConfirmacion(
                turnoCreado.id_turno,
                turnoCreado.paciente.telefono,
                mensajeConfirmacion
              ),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout registrando confirmación')), 3000)
              )
            ]);

            // Programar recordatorios
            const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");
            const { registrarNotificacionesRecordatorioFlexible } = await import("@/lib/services/notificacion.service");
            
            // ✅ Por defecto: 1 día antes, 2 horas antes Y 1 hora antes
            const tiposRecordatorio = recordatorios || ['1d', '2h', '1h'];
            const tiemposRecordatorio = calcularTiemposRecordatorio(turnoCreado.fecha, turnoCreado.hora, tiposRecordatorio);
            
            const recordatoriosValidos = Object.entries(tiemposRecordatorio)
              .filter(([_, fecha]) => fecha !== null)
              .reduce((acc, [tipo, fecha]) => {
                if (fecha) acc[tipo] = fecha;
                return acc;
              }, {} as Record<string, Date>);
            
            if (Object.keys(recordatoriosValidos).length > 0) {
              const mensajeRecordatorio = `Recordatorio: Tu turno es el ${turnoCreado.fecha} a las ${turnoCreado.hora}`;
              // Timeout de 3 segundos
              await Promise.race([
                registrarNotificacionesRecordatorioFlexible(
                  turnoCreado.id_turno,
                  turnoCreado.paciente.telefono,
                  mensajeRecordatorio,
                  recordatoriosValidos
                ),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout registrando recordatorios')), 3000)
                )
              ]);
            }
          }
        } catch (botError) {
          // Log del error pero no afecta el resultado de la creación
          console.error("Error en notificaciones WhatsApp (turno ya creado):", botError);
        }
      }).catch(err => {
        // Catch para evitar unhandled promise rejection
        console.error("Error crítico en proceso de notificaciones:", err);
      });
    }

    // ✅ Revalidar rutas pero sin esperar (non-blocking)
    Promise.resolve().then(async () => {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/turnos", "page");
      revalidatePath("/pilates", "page");
      revalidatePath("/calendario", "page");
    }).catch(() => {/* ignore revalidation errors */});

    return { success: true, data: turnoCreado };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}


export async function actualizarTurno(id: number, datos: TurnoUpdate) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Si se cambia fecha/hora/especialista, verificar disponibilidad
    if (datos.fecha || datos.hora || datos.id_especialista || datos.id_box !== undefined) {
      const turnoActual: any = await supabase
        .from("turno")
        .select("fecha, hora, id_especialista, id_box, id_especialidad, id_organizacion")
        .eq("id_turno", id)
        .eq("id_organizacion", orgId) // ✅ Verificar que pertenece a esta org
        .single();

      if (turnoActual.data) {
        const turnoData = turnoActual.data;
        const nuevaFecha = datos.fecha || turnoData.fecha;
        const nuevaHora = datos.hora || turnoData.hora;
        const nuevoEspecialista = datos.id_especialista || turnoData.id_especialista;
        const nuevoBox = datos.id_box !== undefined ? datos.id_box : turnoData.id_box;
        const especialidadId = turnoData.id_especialidad;

        // Solo verificar si cambió algo relevante Y si tenemos especialista
        const cambioRelevante = 
          datos.fecha !== turnoData.fecha ||
          datos.hora !== turnoData.hora ||
          datos.id_especialista !== turnoData.id_especialista ||
          datos.id_box !== turnoData.id_box;

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

    const datosUpdate: any = {
      ...datos,
      updated_at: new Date().toISOString()
    };

    // @ts-expect-error - Supabase typing issue after merge
    const { data, error } = await supabase
      .from("turno")
      .update(datosUpdate)
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
    revalidatePath("/pacientes");
    revalidatePath("/pacientes/HistorialClinico");
    revalidatePath("/inicio");
    
    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Eliminar un turno (soft delete - cambia estado a "eliminado")
export async function eliminarTurno(id: number) {
  const supabase = await createClient();
  
  try {
    // ✅ MULTI-ORG: Obtener contexto organizacional
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Verificar que el turno pertenece a esta organización antes de eliminar
    const { data: turnoVerificado, error: errorVerificar } = await supabase
      .from("turno")
      .select("id_turno, estado")
      .eq("id_turno", id)
      .eq("id_organizacion", orgId)
      .single();

    if (errorVerificar || !turnoVerificado) {
      return { success: false, error: "Turno no encontrado o no pertenece a esta organización" };
    }

    // ✅ SOFT DELETE: Cambiar estado a "eliminado" en lugar de borrar
    const { error: turnoError } = await supabase
      .from("turno")
      .update({ 
        estado: "eliminado",
        updated_at: new Date().toISOString()
      })
      .eq("id_turno", id)
      .eq("id_organizacion", orgId);

    if (turnoError) {
      console.error("Error al eliminar turno:", turnoError);
      return { success: false, error: turnoError.message };
    }

    console.log(`✅ Turno ${id} marcado como eliminado (soft delete)`);

    revalidatePath("/turnos");
    revalidatePath("/pilates");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function marcarComoAtendido(id_turno: number) {
  const supabase = await createClient();
  
  try {
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Verificar estado actual del turno
    const { data: turnoActual, error: errorGet } = await supabase
      .from('turno')
      .select('id_turno, estado, id_organizacion')
      .eq('id_turno', id_turno)
      .eq('id_organizacion', orgId)
      .single();

    if (errorGet || !turnoActual) {
      return { 
        success: false, 
        error: 'Turno no encontrado o no pertenece a esta organización' 
      };
    }

    // ✅ Permitir marcar como atendido desde programado o pendiente
    const estadosPermitidos = ['programado', 'pendiente'];
    if (!turnoActual.estado || !estadosPermitidos.includes(turnoActual.estado)) {
      return {
        success: false,
        error: `No se puede marcar como atendido un turno en estado: ${turnoActual.estado || 'desconocido'}`
      };
    }

    // Actualizar a atendido
    const { error } = await supabase
      .from('turno')
      .update({
        estado: 'atendido',
        updated_at: new Date().toISOString()
      })
      .eq('id_turno', id_turno)
      .eq('id_organizacion', orgId);

    if (error) {
      console.error('❌ Error al marcar turno como atendido:', error);
      return { 
        success: false, 
        error: error.message || 'Error al actualizar el turno'
      };
    }

    console.log(`✅ Turno ${id_turno} marcado como atendido (desde estado: ${turnoActual.estado})`);
    
    revalidatePath('/turnos');
    revalidatePath('/pilates');
    revalidatePath('/inicio');
    return { success: true };
  } catch (error) {
    console.error('❌ Error inesperado al marcar como atendido:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * ✅ Cancelar turno
 * Permite cambiar desde: programado o pendiente
 */
export async function cancelarTurno(id: number, motivo?: string) {
  const supabase = await createClient();
  
  try {
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Verificar estado actual del turno
    const { data: turnoActual, error: errorGet } = await supabase
      .from('turno')
      .select('id_turno, estado, id_organizacion')
      .eq('id_turno', id)
      .eq('id_organizacion', orgId)
      .single();

    if (errorGet || !turnoActual) {
      return { 
        success: false, 
        error: 'Turno no encontrado o no pertenece a esta organización' 
      };
    }

    // ✅ Permitir cancelar desde programado o pendiente
    const estadosPermitidos = ['programado', 'pendiente'];
    if (!turnoActual.estado || !estadosPermitidos.includes(turnoActual.estado)) {
      return {
        success: false,
        error: `No se puede cancelar un turno en estado: ${turnoActual.estado || 'desconocido'}`
      };
    }

    // Actualizar a cancelado
    const { data, error } = await supabase
      .from("turno")
      .update({
        estado: "cancelado",
        updated_at: new Date().toISOString(),
      })
      .eq("id_turno", id)
      .eq("id_organizacion", orgId)
      .select("*")
      .single();

    if (error) {
      console.error('❌ Error al cancelar turno:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Turno ${id} cancelado (desde estado: ${turnoActual.estado})`);
    
    revalidatePath("/turnos");
    revalidatePath("/pilates");
    revalidatePath('/inicio');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error inesperado al cancelar turno:', error);
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
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
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
      .neq("estado", "cancelado")
      .neq("estado", "eliminado"); // ✅ Excluir turnos eliminados

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
      .neq("estado", "cancelado")
      .neq("estado", "eliminado"); // ✅ Excluir turnos eliminados

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
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
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
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
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

// export async function obtenerEspecialistas() {
//   const supabase = await createClient();
  
//   try {
//     // ✅ MULTI-ORG: Obtener contexto organizacional
//     // const { getAuthContext } = await import("@/lib/utils/auth-context");
//     const { orgId } = await getAuthContext();

//     // ✅ NUEVO MODELO: Consultar usuario_organizacion con roles permitidos
//     const { data: usuariosOrg, error: errorUsuarios } = await supabase
//       .from("usuario_organizacion")
//       .select(`
//         id_usuario_organizacion,
//         id_usuario,
//         color_calendario,
//         activo,
//         usuario:id_usuario (
//           id_usuario,
//           nombre,
//           apellido,
//           email,
//           telefono
//         ),
//         rol:id_rol (
//           id,
//           nombre,
//           jerarquia
//         )
//       `)
//       .eq("id_organizacion", orgId)
//       .in("id_rol", ROLES_ESPECIALISTAS) // Solo Admin (1) y Especialistas (2), excluye Programadores (3)
//       .eq("activo", true);

//     if (errorUsuarios) {
//       console.error("❌ Error al obtener usuarios:", errorUsuarios);
//       return { success: false, error: errorUsuarios.message };
//     }

//     if (!usuariosOrg || usuariosOrg.length === 0) {
//       console.warn("⚠️ No se encontraron usuarios en la organización");
//       return { success: true, data: [] }; // ✅ Retornar array vacío en lugar de error
//     }

//     // ✅ NUEVO MODELO: Obtener especialidades por id_usuario_organizacion
//     const idsUsuarioOrg = usuariosOrg.map(uo => uo.id_usuario_organizacion);
    
//     const { data: usuarioEspecialidades, error: errorEspecialidades } = await supabase
//       .from("usuario_especialidad")
//       .select(`
//         id_usuario_organizacion,
//         especialidad:id_especialidad(
//           id_especialidad,
//           nombre
//         )
//       `)
//       .in("id_usuario_organizacion", idsUsuarioOrg)
//       .eq("activo", true);

//     if (errorEspecialidades) {
//       console.error("Error al obtener especialidades:", errorEspecialidades);
//     }

//     // Mapear especialidades por id_usuario_organizacion
//     const especialidadesMap = new Map();
//     usuarioEspecialidades?.forEach(item => {
//       if (!especialidadesMap.has(item.id_usuario_organizacion)) {
//         especialidadesMap.set(item.id_usuario_organizacion, []);
//       }
//       // @ts-ignore - especialidad es join
//       if (item.especialidad) {
//         especialidadesMap.get(item.id_usuario_organizacion).push({
//           // @ts-ignore
//           especialidad: item.especialidad
//         });
//       }
//     });

//     // ✅ Combinar usuarios con sus especialidades (nuevo formato)
//     const especialistas = usuariosOrg.map(usuarioOrg => {
//       // ✅ CORRECCIÓN: Los joins retornan arrays, acceder al primer elemento
//       const usuario = Array.isArray(usuarioOrg.usuario) ? usuarioOrg.usuario[0] : usuarioOrg.usuario;
//       const rol = Array.isArray(usuarioOrg.rol) ? usuarioOrg.rol[0] : usuarioOrg.rol;
      
//       return {
//         id_usuario: usuarioOrg.id_usuario,
//         id_usuario_organizacion: usuarioOrg.id_usuario_organizacion,
//         nombre: usuario?.nombre,
//         apellido: usuario?.apellido,
//         color: usuarioOrg.color_calendario, // ✅ Ahora viene de usuario_organizacion
//         email: usuario?.email,
//         telefono: usuario?.telefono,
//         activo: usuarioOrg.activo, // ✅ Ahora viene de usuario_organizacion
//         id_rol: rol?.id,
//         rol: rol,
//         especialidad: null,
//         usuario_especialidad: especialidadesMap.get(usuarioOrg.id_usuario_organizacion) || []
//       };
//     });

//     return { success: true, data: especialistas };
//   } catch (error) {
//     console.error("❌ Error inesperado en obtenerEspecialistas:", error);
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Error desconocido" 
//     };
//   }
// }

export async function obtenerEspecialistas() {
  const supabase = await createClient();
  
  try {
    const { orgId } = await getAuthContext();

    // Hacemos UNA sola consulta profunda
    const { data, error } = await supabase
      .from("usuario_organizacion")
      .select(`
        id_usuario_organizacion,
        id_usuario,
        color_calendario,
        activo,
        usuario:id_usuario!inner (
          nombre,
          apellido,
          email,
          telefono
        ),
        rol:id_rol (
          id,
          nombre,
          jerarquia
        ),
        usuario_especialidad (
          id_usuario_especialidad,
          activo,
          especialidad:id_especialidad (
            id_especialidad,
            nombre
          )
        )
      `)
      .eq("id_organizacion", orgId)
      .in("id_rol", ROLES_ESPECIALISTAS) 
      .eq("activo", true)
      // Filtramos también que las especialidades estén activas, si aplica
      .eq("usuario_especialidad.activo", true); 

    if (error) throw error;

    // ✅ Transformación para coincidir con EspecialistaWithSpecialties
    const especialistas = data.map((item) => ({
      id_usuario: item.id_usuario,
      // @ts-expect-error Supabase a veces retorna array u objeto, dependiendo de la relación
      nombre: item.usuario?.nombre,
      // @ts-expect-error
      apellido: item.usuario?.apellido,
      color: item.color_calendario,
      // @ts-expect-error
      email: item.usuario?.email,
      // @ts-expect-error
      telefono: item.usuario?.telefono,
      activo: item.activo,
      especialidad: null, // ✅ Requerido por EspecialistaWithSpecialties
      // ✅ Mapear correctamente las especialidades
      usuario_especialidad: (item.usuario_especialidad || []).map(ue => ({
        especialidad: {
          // @ts-expect-error
          id_especialidad: ue.especialidad?.id_especialidad,
          // @ts-expect-error
          nombre: ue.especialidad?.nombre
        }
      }))
    }));

    return { success: true, data: especialistas };

  } catch (error: any) {
    console.error("❌ Error en obtenerEspecialistas:", error.message);
    return { success: false, error: error.message };
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

export async function obtenerPacientes(busqueda?: string, limit: number = 10) {
  const supabase = await createClient();
  
  try {
    // 1. Obtener contexto (Necesario para pasar el orgId a la función)
    const { orgId } = await getAuthContext();

    let data;
    let error;

    // ⚡ ESTRATEGIA HÍBRIDA
    
    // CASO A: Hay búsqueda -> Usamos la función inteligente (RPC)
    if (busqueda && busqueda.length >= 2) {
      const result = await supabase.rpc('buscar_pacientes_smart', {
        search_term: busqueda,
        org_id: orgId,
        max_rows: limit
      });
      data = result.data;
      error = result.error;
    } 
    // CASO B: No hay búsqueda -> Traemos listado normal (Simple Select)
    else {
      const result = await supabase
        .from("paciente")
        .select("id_paciente, nombre, apellido, dni, telefono, email")
        .eq("id_organizacion", orgId) // ⚠️ No olvidar esto nunca
        .order("apellido")
        .order("nombre")
        .limit(limit);
      data = result.data;
      error = result.error;
    }

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
      .select("estado, created_at, fecha, id_especialista")
      .neq("estado", "eliminado"); // ✅ Excluir turnos eliminados

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
    
    // 1️⃣ Obtener TODOS los turnos del paciente (con y sin grupo)
    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        especialista:id_especialista(id_usuario, nombre, apellido),
        especialidad:id_especialidad(id_especialidad, nombre),
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, direccion, fecha_nacimiento)
      `)
      .eq("id_paciente", pacienteId)
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
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

    // 5️⃣ Agrupar turnos por id_grupo_tratamiento O generar grupos individuales
    const gruposHistorial = new Map();
    
    data?.forEach(turno => {
      const grupoId = turno.id_grupo_tratamiento || `individual-${turno.id_turno}`; // ✅ Crear ID único para turnos sin grupo
      
      if (!gruposHistorial.has(grupoId)) {
        gruposHistorial.set(grupoId, {
          id_grupo: grupoId,
          // ✅ PRIORIDAD: nombre del grupo > nombre de especialidad
          especialidad: turno.id_grupo_tratamiento 
            ? (gruposMap.get(turno.id_grupo_tratamiento) || turno.especialidad?.nombre || "Sin especialidad")
            : turno.especialidad?.nombre || "Sin especialidad", // Turnos individuales usan especialidad
          especialista: turno.especialista,
          paciente: turno.paciente,
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

    // ✅ Revalidar todas las rutas donde se muestra el historial clínico
    revalidatePath("/pacientes");
    revalidatePath("/pacientes/HistorialClinico");
    revalidatePath("/imprimir/historia-clinica");
    
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
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
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
          
          // ✅ Por defecto: 1 día antes, 2 horas antes Y 1 hora antes
          const tiposRecordatorio: ('1d' | '2h' | '1h')[] = ['1d', '2h', '1h'];
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
    // const { getAuthContext } = await import("@/lib/utils/auth-context");
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
    
    // ✅ Revalidar todas las rutas donde se muestra el historial clínico
    revalidatePath('/pacientes');
    revalidatePath('/pacientes/HistorialClinico');
    revalidatePath('/imprimir/historia-clinica');
    
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    return { success: false, error: error.message || 'Error inesperado' };
  }
}

// =====================================
// ⏰ ACTUALIZACIÓN AUTOMÁTICA DE ESTADOS
// =====================================

/**
 * Actualiza turnos programados que ya pasaron de fecha/hora a estado "pendiente"
 * Solo actualiza turnos en estado "programado"
 */
export async function actualizarTurnosPendientes() {
  const supabase = await createClient();
  
  try {
    const ahora = new Date();
    const fechaActual = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Buscar turnos programados que ya pasaron
    const { data: turnosPasados, error } = await supabase
      .from('turno')
      .select('id_turno, fecha, hora')
      .eq('estado', 'programado')
      .or(`fecha.lt.${fechaActual},and(fecha.eq.${fechaActual},hora.lt.${horaActual})`);

    if (error) {
      console.error('❌ Error buscando turnos pasados:', error);
      return { success: false, error: error.message };
    }

    if (!turnosPasados || turnosPasados.length === 0) {
      return { success: true, data: [], message: 'No hay turnos para actualizar' };
    }

    // Actualizar todos los turnos pasados a "pendiente"
    const { data: turnosActualizados, error: errorActualizar } = await supabase
      .from('turno')
      .update({ estado: 'pendiente' })
      .in('id_turno', turnosPasados.map(t => t.id_turno))
      .select();

    if (errorActualizar) {
      console.error('❌ Error actualizando turnos a pendiente:', errorActualizar);
      return { success: false, error: errorActualizar.message };
    }

    console.log(`✅ ${turnosActualizados?.length || 0} turnos actualizados a pendiente`);
    
    // Revalidar las rutas de turnos
    revalidatePath('/turnos');
    
    return { 
      success: true, 
      data: turnosActualizados,
      message: `${turnosActualizados?.length || 0} turnos actualizados a pendiente`
    };
  } catch (error: any) {
    console.error('❌ Error inesperado actualizando turnos pendientes:', error);
    return { success: false, error: error.message || 'Error inesperado' };
  }
}

// =====================================
// 📦 CREAR PAQUETE DE SESIONES (REPETICIÓN)
// =====================================

/**
 * Crea múltiples turnos en un patrón de repetición semanal
 * ✅ Optimizado: 1 sola llamada HTTP desde el cliente
 * ✅ Transaccional: todo o nada
 * ✅ Seguro: toda la lógica en el servidor
 */
export async function crearPaqueteSesiones(params: {
  fechaBase: string;
  horaBase: string;
  diasSeleccionados: number[]; // 1=Lunes, 2=Martes, etc.
  numeroSesiones: number;
  mantenerHorario: boolean;
  horariosPorDia: Record<number, string>;
  id_especialista: string;
  id_paciente: number;
  id_especialidad: number;
  id_box?: number;
  observaciones?: string;
  tipo_plan: 'particular' | 'obra_social';
  titulo_tratamiento?: string;
  recordatorios?: ('1h' | '2h' | '3h' | '1d' | '2d')[];
}) {
  try {
    const supabase = await createClient();
    const { orgId } = await getAuthContext();

    // ============= PASO 1: CREAR GRUPO DE TRATAMIENTO =============
    let id_grupo_tratamiento: string | undefined;

    if (params.titulo_tratamiento) {
      const nuevoGrupo: Database["public"]["Tables"]["grupo_tratamiento"]["Insert"] = {
        id_paciente: params.id_paciente,
        id_especialista: params.id_especialista,
        id_especialidad: params.id_especialidad,
        id_organizacion: orgId,
        nombre: params.titulo_tratamiento,
        fecha_inicio: params.fechaBase,
        tipo_plan: params.tipo_plan,
      };

      const { data: grupo, error: errorGrupo } = await supabase
        .from('grupo_tratamiento')
        .insert(nuevoGrupo as any)
        .select('id_grupo')
        .single();

      if (errorGrupo) {
        console.error('Error creando grupo de tratamiento:', errorGrupo);
        return {
          success: false,
          error: errorGrupo.message || 'No se pudo crear el grupo de tratamiento'
        };
      }

      if (grupo) {
        id_grupo_tratamiento = (grupo as any).id_grupo;
      }
    }

    // ============= PASO 2: GENERAR LISTA DE TURNOS =============
    const turnosParaCrear: TurnoInsert[] = [];
    const [year, month, day] = params.fechaBase.split('-').map(Number);
    const fechaBaseParsed = new Date(year, month - 1, day);
    const diaBaseNumeroJS = fechaBaseParsed.getDay();
    const diaBaseNumero = diaBaseNumeroJS === 0 ? 7 : diaBaseNumeroJS;

    // Helper: verificar si fecha/hora está en el pasado
    const esFechaHoraPasada = (fecha: string, hora: string): boolean => {
      try {
        const [y, m, d] = fecha.split('-').map(Number);
        const [h, min] = hora.split(':').map(Number);
        const fechaHoraTurno = new Date(y, m - 1, d, h, min);
        return fechaHoraTurno < new Date();
      } catch {
        return false;
      }
    };

    // PRIMERO: Agregar el turno inicial si no está en el pasado
    const esPasadoPrimerTurno = esFechaHoraPasada(params.fechaBase, params.horaBase);
    
    if (!esPasadoPrimerTurno) {
      turnosParaCrear.push({
        fecha: params.fechaBase,
        hora: params.horaBase + ':00',
        id_especialista: params.id_especialista,
        id_paciente: params.id_paciente,
        id_especialidad: params.id_especialidad,
        id_box: params.id_box || null,
        observaciones: params.observaciones || null,
        estado: "programado" as const,
        tipo_plan: params.tipo_plan,
        id_organizacion: orgId,
        ...(id_grupo_tratamiento && { id_grupo_tratamiento })
      });
    }

    // SEGUNDO: Generar turnos de repetición
    let sesionesCreadas = esPasadoPrimerTurno ? 0 : 1;
    let semanaActual = 0;

    while (sesionesCreadas < params.numeroSesiones && semanaActual < 52) {
      for (const diaSeleccionado of params.diasSeleccionados) {
        if (sesionesCreadas >= params.numeroSesiones) break;

        let diferenciaDias = diaSeleccionado - diaBaseNumero;
        if (diferenciaDias < 0) diferenciaDias += 7;

        const fechaTurno = new Date(fechaBaseParsed);
        const esPrimeraSemanaYDiaBase = semanaActual === 0 && diferenciaDias === 0;
        
        if (esPrimeraSemanaYDiaBase) continue; // Ya lo agregamos arriba

        fechaTurno.setDate(fechaTurno.getDate() + (semanaActual * 7) + diferenciaDias);
        
        const fechaFormateada = `${fechaTurno.getFullYear()}-${String(fechaTurno.getMonth() + 1).padStart(2, '0')}-${String(fechaTurno.getDate()).padStart(2, '0')}`;
        
        const horarioTurno = params.mantenerHorario 
          ? params.horaBase 
          : (params.horariosPorDia[diaSeleccionado] || '09:00');

        if (!esFechaHoraPasada(fechaFormateada, horarioTurno)) {
          turnosParaCrear.push({
            fecha: fechaFormateada,
            hora: horarioTurno + ':00',
            id_especialista: params.id_especialista,
            id_paciente: params.id_paciente,
            id_especialidad: params.id_especialidad,
            id_box: params.id_box || null,
            observaciones: params.observaciones || null,
            estado: "programado" as const,
            tipo_plan: params.tipo_plan,
            id_organizacion: orgId,
            ...(id_grupo_tratamiento && { id_grupo_tratamiento })
          });
          sesionesCreadas++;
        }
      }
      semanaActual++;
    }

    if (turnosParaCrear.length === 0) {
      return {
        success: false,
        error: 'Todos los horarios seleccionados ya pasaron'
      };
    }

    // ============= PASO 3: INSERTAR TODOS LOS TURNOS EN UNA TRANSACCIÓN =============
    const { data: turnosCreados, error: errorCrear } = await supabase
      .from('turno')
      .insert(turnosParaCrear as any)
      .select(`
        *,
        paciente:id_paciente(nombre, apellido, telefono),
        especialista:id_especialista(nombre, apellido)
      `);

    if (errorCrear) {
      console.error('Error creando turnos en lote:', errorCrear);
      return {
        success: false,
        error: errorCrear.message || 'No se pudieron crear los turnos'
      };
    }

    // ============= PASO 4: ENVIAR NOTIFICACIÓN GRUPAL =============
    if (turnosCreados && turnosCreados.length > 0) {
      // Ejecutar en background sin bloquear
      Promise.resolve().then(async () => {
        try {
          const { enviarNotificacionGrupalTurnos } = await import('@/lib/services/whatsapp-bot.service');
          
          const paciente = (turnosCreados[0] as any).paciente;
          const especialista = (turnosCreados[0] as any).especialista;
          
          if (paciente?.telefono && especialista) {
            await enviarNotificacionGrupalTurnos(
              paciente.telefono,
              paciente.nombre,
              turnosCreados,
              especialista.nombre
            );
          }
        } catch (error) {
          console.error('Error enviando notificación agrupada:', error);
          // No fallar la operación por error en notificación
        }
      });
    }

    // ============= PASO 5: REVALIDAR Y RETORNAR =============
    revalidatePath('/turnos');
    revalidatePath('/calendario');

    return {
      success: true,
      data: {
        turnosCreados: turnosCreados.length,
        turnos: turnosCreados,
        id_grupo_tratamiento
      },
      message: `${turnosCreados.length} sesiones creadas exitosamente`
    };

  } catch (error: any) {
    console.error('Error inesperado en crearPaqueteSesiones:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al crear el paquete de sesiones'
    };
  }
}
