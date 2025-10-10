"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";

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
    let query = supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(id_usuario, nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero)
      `)
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
    console.log('🔍 Filtros recibidos en obtenerTurnosConFiltros:', filtros);
    
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
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    // Aplicar filtros de rango de fechas
    if (filtros?.fecha_desde) {
      query = query.gte("fecha", filtros.fecha_desde);
      console.log('📅 Filtro fecha_desde aplicado:', filtros.fecha_desde);
    }
    if (filtros?.fecha_hasta) {
      query = query.lte("fecha", filtros.fecha_hasta);
      console.log('📅 Filtro fecha_hasta aplicado:', filtros.fecha_hasta);
    }
    
    // Filtro por especialista específico
    if (typeof filtros?.especialista_id === "string") {
      query = query.eq("id_especialista", filtros.especialista_id);
      console.log('👨‍⚕️ Filtro especialista aplicado:', filtros.especialista_id);
    }
    
    // Filtro por especialidad del turno
    if (filtros?.especialidad_id) {
      query = query.eq("id_especialidad", filtros.especialidad_id);
      console.log('🏥 Filtro especialidad aplicado:', filtros.especialidad_id);
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

    console.log('📊 Turnos encontrados en BD:', data?.length || 0);
    if (filtros?.especialidad_id === 4) {
      console.log('🧘‍♀️ Turnos de Pilates específicos:', data);
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
  datos: TurnoInsert, 
  recordatorios?: ('1h' | '2h' | '3h' | '1d' | '2d')[],
  enviarNotificacion: boolean = true // ✅ Nuevo parámetro para controlar notificaciones
) {
  const supabase = await createClient();
  
  try {
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
        // Mensaje más específico para Pilates
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

    // ✅ AHORA datos es TurnoInsert puro, sin recordatorios
    const { data, error } = await supabase
      .from("turno")
      .insert(datos)
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

    console.log("✅ Turno creado exitosamente:", data.id_turno);
    

    // ===== 🤖 INTEGRACIÓN CON BOT DE WHATSAPP =====
    // ✅ Solo enviar notificaciones si enviarNotificacion === true
    if (enviarNotificacion) {
      try {
      // Importar servicios de WhatsApp (solo si el turno se creó correctamente)
      const { enviarConfirmacionTurno } = await import("@/lib/services/whatsapp-bot.service");
      const { 
        registrarNotificacionConfirmacion, 
        registrarNotificacionesRecordatorio,
        marcarNotificacionEnviada,
        marcarNotificacionFallida
      } = await import("@/lib/services/notificacion.service");
      const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");

      // Verificar que el paciente tenga teléfono
      if (data.paciente?.telefono) {
        console.log(`📱 Procesando notificaciones WhatsApp para turno ${data.id_turno}...`);

        // 1. Registrar notificación de confirmación en BD
        const mensajeConfirmacion = `Turno confirmado para ${data.fecha} a las ${data.hora}`;
        const notifConfirmacion = await registrarNotificacionConfirmacion(
          data.id_turno,
          data.paciente.telefono,
          mensajeConfirmacion
        );

        // 2. Enviar confirmación inmediatamente por WhatsApp
        if (notifConfirmacion.success && notifConfirmacion.data) {
          // Convertir datos al formato esperado por TurnoWithRelations
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
            // Marcar como enviada exitosamente
            await marcarNotificacionEnviada(notifConfirmacion.data.id_notificacion);
            console.log(`✅ Confirmación WhatsApp enviada para turno ${data.id_turno}`);
          } else {
            // Marcar como fallida
            await marcarNotificacionFallida(notifConfirmacion.data.id_notificacion);
            console.log(`❌ Falló confirmación WhatsApp para turno ${data.id_turno}: ${resultadoBot.message}`);
          }
        }

        // 3. Programar recordatorios automáticos
        const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");
        const { registrarNotificacionesRecordatorioFlexible } = await import("@/lib/services/notificacion.service");
        
        // ✅ USAR recordatorios del parámetro o los por defecto
        const tiposRecordatorio = recordatorios || ['1d', '2h'];
        console.log(`🔍 Calculando recordatorios para turno ${data.id_turno}: tipos=[${tiposRecordatorio.join(', ')}], fecha=${data.fecha}, hora=${data.hora}`);
        
        const tiemposRecordatorio = calcularTiemposRecordatorio(data.fecha, data.hora, tiposRecordatorio);
        console.log(`🔍 Tiempos calculados:`, JSON.stringify(
          Object.fromEntries(
            Object.entries(tiemposRecordatorio).map(([k, v]) => [k, v?.toISOString() || 'null'])
          ), null, 2
        ));
        
        // Filtrar solo los recordatorios válidos (no null)
        const recordatoriosValidos = Object.entries(tiemposRecordatorio)
          .filter(([_, fecha]) => fecha !== null)
          .reduce((acc, [tipo, fecha]) => {
            if (fecha) acc[tipo] = fecha;
            return acc;
          }, {} as Record<string, Date>);
        
        console.log(`🔍 Recordatorios válidos a guardar: ${Object.keys(recordatoriosValidos).join(', ')}`);
        
        if (Object.keys(recordatoriosValidos).length > 0) {
          const mensajeRecordatorio = `Recordatorio: Tu turno es el ${data.fecha} a las ${data.hora}`;
          
          const resultadosNotif = await registrarNotificacionesRecordatorioFlexible(
            data.id_turno,
            data.paciente.telefono,
            mensajeRecordatorio,
            recordatoriosValidos
          );
          
          console.log(`🔍 Resultados de registro de notificaciones:`, JSON.stringify(resultadosNotif, null, 2));
          
          const tiposConfigurados = Object.keys(recordatoriosValidos).join(', ');
          console.log(`⏰ Recordatorios programados para turno ${data.id_turno}: ${tiposConfigurados}`);
          
          // 🚀 Trigger inmediato: disparar procesamiento de recordatorios sin esperar al polling
          try {
            const apiUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FISIOPASTEUR_API_URL || 'https://fisiopasteur.vercel.app';
            console.log(`🔥 Disparando procesamiento inmediato de recordatorios en ${apiUrl}`);
            
            const response = await fetch(`${apiUrl}/api/cron/recordatorios`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (response.ok) {
              const resultado = await response.json();
              console.log(`✅ Procesamiento inmediato completado:`, resultado);
            } else {
              console.log(`⚠️ Procesamiento inmediato respondió con status ${response.status} (se procesará en el próximo ciclo)`);
            }
          } catch (triggerError) {
            // No bloquear si falla, el polling cada 60s lo manejará
            console.log('⚠️ No se pudo disparar procesamiento inmediato (se procesará en el próximo ciclo):', triggerError);
          }
        } else {
          console.log(`⚠️ No hay recordatorios válidos para programar (todos están en el pasado)`);
        }
      } else {
        console.log(`⚠️ Turno ${data.id_turno} creado sin teléfono - no se enviarán notificaciones WhatsApp`);
      }
      } catch (botError) {
        // Si falla la integración con WhatsApp, no afectar la creación del turno
        console.error("Error en integración WhatsApp (turno creado exitosamente):", botError);
      }
    } else {
      console.log(`📭 Notificaciones deshabilitadas para este turno (creación en lote)`);
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
    // Si se cambia fecha/hora/especialista, verificar disponibilidad
    if (datos.fecha || datos.hora || datos.id_especialista || datos.id_box !== undefined) {
      const turnoActual = await supabase
        .from("turno")
        .select("fecha, hora, id_especialista, id_box, id_especialidad")
        .eq("id_turno", id)
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
      }
    }

    const { data, error } = await supabase
      .from("turno")
      .update({
        ...datos,
        updated_at: new Date().toISOString()
      })
      .eq("id_turno", id)
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

// Eliminar un turno
export async function eliminarTurno(id: number) {
  const supabase = await createClient();
  
  try {
    // Primero eliminar todas las notificaciones asociadas al turno
    const { error: notificacionesError } = await supabase
      .from("notificacion")
      .delete()
      .eq("id_turno", id);

    if (notificacionesError) {
      console.error("Error al eliminar notificaciones del turno:", notificacionesError);
      return { success: false, error: `Error eliminando notificaciones: ${notificacionesError.message}` };
    }

    // Luego eliminar el turno
    const { error: turnoError } = await supabase
      .from("turno")
      .delete()
      .eq("id_turno", id);

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
      console.log(`🧘‍♀️ Verificando disponibilidad Pilates: ${data.length} participantes actuales`);
      
      const pilatesTurnos = data.filter(t => t.id_especialidad === 4);
      const disponible = pilatesTurnos.length < 4;
      
      console.log(`🧘‍♀️ Pilates - Participantes: ${pilatesTurnos.length}/4, Disponible: ${disponible}`);
      
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
      console.log(`No se encontró paciente con teléfono: ${telefono}`);
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
    const { data, error } = await supabase
      .from("usuario_especialidad")
      .select(`
        id_usuario,
        activo,
        usuario!inner(
          id_usuario,
          nombre,
          apellido,
          color,
          email,
          telefono,
          activo,
          id_rol,
          rol:id_rol (
            id,
            nombre
          )
        ),
        especialidad!inner(
          id_especialidad,
          nombre
        )
      `)
      .eq("activo", true)
      .eq("usuario.activo", true);

    if (error) {
      console.error("Error al obtener especialistas:", error);
      return { success: false, error: error.message };
    }

    const especialistasMap = new Map();
    
    data?.forEach(item => {
      const usuario = item.usuario;
      const especialidad = item.especialidad;
      
      if (!especialistasMap.has(usuario.id_usuario)) {
        especialistasMap.set(usuario.id_usuario, {
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          color: usuario.color,
          email: usuario.email,
          telefono: usuario.telefono,
          activo: usuario.activo,
          id_rol: usuario.id_rol, 
          rol: usuario.rol,       
          especialidad: null,
          usuario_especialidad: []
        });
      }
      
      especialistasMap.get(usuario.id_usuario).usuario_especialidad.push({
        especialidad: especialidad
      });
    });

    const especialistas = Array.from(especialistasMap.values());

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
      .order("nombre")
      .limit(50);

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
    const turnosCreados = [];
    const errores = [];

    // Crear turnos uno por uno
    for (const turnoData of turnos) {
      try {
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
            dificultad: turnoData.dificultad || 'principiante'
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
    
    // 1. Obtener datos del paciente
    const { data: paciente } = await supabase
      .from("paciente")
      .select("nombre, telefono")
      .eq("id_paciente", parseInt(id_paciente))
      .single();

    if (!paciente || !paciente.telefono) {
      console.error("No se pudieron obtener datos del paciente o no tiene teléfono");
      return;
    }

    // 2. Registrar notificación en BD
    const { data: notificacion } = await supabase
      .from("notificacion")
      .insert({
        id_turno: turnos[0].id_turno,
        mensaje: `Confirmación de ${turnos.length} turnos de Pilates`,
        medio: "whatsapp",
        telefono: paciente.telefono,
        estado: "pendiente"
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
      console.log(`✅ Notificación agrupada enviada a ${paciente.telefono} para ${turnos.length} turnos`);
      
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
