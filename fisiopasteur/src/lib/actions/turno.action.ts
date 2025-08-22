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
export async function crearTurno(datos: TurnoInsert) {
  const supabase = await createClient();
  
  try {
    // Primero verificar disponibilidad
    if (datos.fecha && datos.hora && datos.id_especialista) {
      const disponibilidad = await verificarDisponibilidad(
        datos.fecha,
        datos.hora,
        datos.id_especialista,
        datos.id_box || undefined
      );
      
      if (!disponibilidad.success || !disponibilidad.disponible) {
        return { 
          success: false, 
          error: `Horario no disponible. Conflictos: ${disponibilidad.conflictos || 0}` 
        };
      }
    }

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

    revalidatePath("/turnos");
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
        .select("fecha, hora, id_especialista, id_box")
        .eq("id_turno", id)
        .single();

      if (turnoActual.data) {
        const nuevaFecha = datos.fecha || turnoActual.data.fecha;
        const nuevaHora = datos.hora || turnoActual.data.hora;
        const nuevoEspecialista = datos.id_especialista || turnoActual.data.id_especialista;
        const nuevoBox = datos.id_box !== undefined ? datos.id_box : turnoActual.data.id_box;

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
            id // excluir el turno actual de la verificación
          );
          
          if (!disponibilidad.success || !disponibilidad.disponible) {
            return { 
              success: false, 
              error: `Horario no disponible. Conflictos: ${disponibilidad.conflictos || 0}` 
            };
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
    const { error } = await supabase
      .from("turno")
      .delete()
      .eq("id_turno", id);

    if (error) {
      console.error("Error al eliminar turno:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/turnos");
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

// Verificar disponibilidad de horario (para nuevos turnos)
export async function verificarDisponibilidad(
  fecha: string,
  hora: string,
  especialista_id?: string,
  box_id?: number
) {
  const supabase = await createClient();
  try {
    let query = supabase
      .from("turno")
      .select("id_turno, estado, hora")
      .eq("fecha", fecha)
      .eq("id_especialista", especialista_id!)
      .eq("hora", hora) // <-- SOLO la hora exacta
      .neq("estado", "cancelado");

    if (box_id) {
      query = query.eq("id_box", box_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al verificar disponibilidad:", error);
      return { success: false, error: error.message };
    }

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

// Verificar disponibilidad excluyendo un turno específico (para actualizaciones)
export async function verificarDisponibilidadParaActualizacion(
  fecha: string,
  hora: string,
  especialista_id: string,
  box_id: number | null | undefined,
  turno_excluir: number
) {
  const supabase = await createClient();
  
  try {
    // Calcular hora final (hora + 1)
    const [h, m] = hora.split(":");
    const horaFin = `${String(Number(h) + 1).padStart(2, "0")}:${m}`;
    let query = supabase
      .from("turno")
      .select("id_turno")
      .eq("fecha", fecha)
      .eq("id_especialista", especialista_id)
      .neq("estado", "cancelado")
      .neq("id_turno", turno_excluir)
      .gte("hora", hora)
      .lt("hora", horaFin);

    if (box_id !== null && box_id !== undefined) {
      query = query.eq("id_box", box_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al verificar disponibilidad para actualización:", error);
      return { success: false, error: error.message };
    }

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

// Obtener especialistas activos con sus especialidades
export async function obtenerEspecialistas() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("usuario")
      .select(`
        id_usuario,
        nombre,
        apellido,
        color,
        email,
        especialidad:id_especialidad(id_especialidad, nombre),
        usuario_especialidad(
          especialidad:id_especialidad(id_especialidad, nombre)
        )
      `)
      .eq("id_rol", 2) // Asumiendo que rol 2 es especialista
      .order("nombre");

    if (error) {
      console.error("Error al obtener especialistas:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Obtener todas las especialidades
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

// Obtener boxes/consultorios disponibles
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

// Obtener pacientes (para el selector de pacientes)
export async function obtenerPacientes(busqueda?: string) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from("paciente")
      .select("id_paciente, nombre, apellido, dni, telefono, email")
      .order("apellido")
      .order("nombre")
      .limit(50); // Limitar para performance

    // Si hay búsqueda, filtrar por nombre, apellido o DNI
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

// Obtener estadísticas de turnos para dashboard
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

    // Procesar estadísticas
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