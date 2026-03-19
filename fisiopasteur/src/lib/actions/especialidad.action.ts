"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";
import type { ActionResult } from "@/lib/actions/action-result";

type Especialidad = Database["public"]["Tables"]["especialidad"]["Row"];
type EspecialidadInsert = Database["public"]["Tables"]["especialidad"]["Insert"];
type EspecialidadUpdate = Database["public"]["Tables"]["especialidad"]["Update"];

// =====================================
// 📋 OBTENER ESPECIALIDADES
// =====================================

/**
 * Obtener todas las especialidades de la organización actual
 */
export async function getEspecialidades(): Promise<
  // | { success: true; data: any[] }
  // | { success: false; error: string }
  ActionResult
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("especialidad")
      .select("*")
      .order("nombre");

    if (error) {
      console.error("Error fetching especialidades:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error en getEspecialidades:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// =====================================
// ✏️ CREAR ESPECIALIDAD
// =====================================

/**
 * Crear una nueva especialidad
 */
export async function createEspecialidad(nombre: string): Promise<ActionResult> {
  const supabase = await createClient();
  
  try {
    // Validar que el nombre no esté vacío
    if (!nombre || nombre.trim().length === 0) {
      return {
        success: false,
        error : "El nombre de la especialidad es requerido"
      };
    }

    // Verificar que no exista una especialidad con el mismo nombre
    // const { data: existente, error: errorCheck } = await supabase
    //   .from("especialidad")
    //   .select("id_especialidad")
    //   .ilike("nombre", nombre.trim())
    //   .maybeSingle();

    // if (errorCheck) {
    //   console.error("Error verificando especialidad:", errorCheck);
    //   return {
    //     success: false,
    //     message: "Error al verificar especialidad",
    //     description: errorCheck.message
    //   };
    // }

    // if (existente) {
    //   return {
    //     success: false,
    //     message: "Especialidad duplicada",
    //     description: "Ya existe una especialidad con ese nombre"
    //   };
    // }

    const nombreLimpio = nombre.trim();

    // Crear la especialidad
    const nuevaEspecialidad: EspecialidadInsert = {
      nombre: nombreLimpio,
    };

    const { data, error } = await (supabase
      .from("especialidad") as any)
      .insert({ nombre: nombreLimpio })
      .select()
      .single();

    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate key value violates unique constraint")) {
        console.error("Error creating especialidad - duplicate name:", error);
        return {
          success: false,
          error: "Ya existe una especialidad con ese nombre"
        };
      }

      console.error("Error creando especialidad:", error);
      return {
        success: false,
        error: error.message
      };
    }

    revalidatePath("/especialistas");
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error inesperado creando especialidad:", error);
    return {
      success: false,
      error: "Ocurrió un error al crear la especialidad"
    };
  }
}

// =====================================
// ✏️ ACTUALIZAR ESPECIALIDAD
// =====================================

/**
 * Actualizar una especialidad existente
 */
export async function updateEspecialidad(id: number, nombre: string): Promise<ActionResult> {
  const supabase = await createClient();
  
  try {
    // Validar que el nombre no esté vacío
    if (!nombre || nombre.trim().length === 0) {
      return {
        success: false,
        error : "El nombre de la especialidad es requerido"
      };
    }

    // Verificar que la especialidad exista
    // const { data: especialidadActual, error: errorCheck } = await supabase
    //   .from("especialidad")
    //   .select("*")
    //   .eq("id_especialidad", id)
    //   .single();

    // if (errorCheck || !especialidadActual) {
    //   return {
    //     success: false,
    //     message: "Especialidad no encontrada",
    //     description: "La especialidad no existe"
    //   };
    // }

    // // Verificar que no exista otra especialidad con el mismo nombre
    // const { data: duplicado, error: errorDuplicado } = await supabase
    //   .from("especialidad")
    //   .select("id_especialidad")
    //   .ilike("nombre", nombre.trim())
    //   .neq("id_especialidad", id)
    //   .maybeSingle();

    // if (errorDuplicado) {
    //   console.error("Error verificando duplicado:", errorDuplicado);
    //   return {
    //     success: false,
    //     message: "Error al verificar especialidad",
    //     description: errorDuplicado.message
    //   };
    // }

    // if (duplicado) {
    //   return {
    //     success: false,
    //     message: "Especialidad duplicada",
    //     description: "Ya existe otra especialidad con ese nombre"
    //   };
    // }
    const nombreLimpio = nombre.trim();

    // Actualizar la especialidad
    const { data, error } = await (supabase
      .from("especialidad") as any)
      .update({ nombre: nombreLimpio })
      .eq("id_especialidad", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate key value violates unique constraint")) {
        console.error("Error updating especialidad - duplicate name:", error);
        return {
          success: false,
          error: "Ya existe otra especialidad con ese nombre"
        };
      }

      if (error.code === 'PGRST116') {
        console.error("Error updating especialidad - not found:", error);
        return {
          success: false,
          error: "La especialidad que intentas editar ya no existe o fue eliminada."
        };
      }

      console.error("Error actualizando especialidad:", error);
      return {
        success: false,
        error: error.message
      };
    }

    revalidatePath("/especialistas");
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error inesperado actualizando especialidad:", error);
    return {
      success: false,
      error: "Ocurrió un error al actualizar la especialidad"
    };
  }
}

// =====================================
// 🗑️ ELIMINAR ESPECIALIDAD
// =====================================

/**
 * Eliminar una especialidad (solo si no está en uso)
 */
export async function deleteEspecialidad(id: number): Promise<ActionResult> {
  const supabase = await createClient();
  
  try {
    // Verificar que la especialidad exista
    const { data: especialidad, error: errorCheck } = await supabase
      .from("especialidad")
      .select("nombre")
      .eq("id_especialidad", id)
      .single();

    if (errorCheck || !especialidad) {
      return {
        success: false,
        error: "La especialidad no existe"
      };
    }

    // Verificar que no esté en uso por especialistas
    const { data: enUso, error: errorUso } = await supabase
      .from("usuario_especialidad")
      .select("id_usuario")
      .eq("id_especialidad", id)
      .limit(1)
      .maybeSingle();

    if (errorUso) {
      console.error("Error verificando uso:", errorUso);
      return {
        success: false,
        error: errorUso.message
      };
    }

    if (enUso) {
      return {
        success: false,
        error: "Esta especialidad está asignada a uno o más especialistas. Primero debes removerla de los especialistas."
      };
    }

    // Verificar que no haya turnos con esta especialidad
    const { data: turnosConEspecialidad, error: errorTurnos } = await supabase
      .from("turno")
      .select("id_turno")
      .eq("id_especialidad", id)
      .limit(1)
      .maybeSingle();

    if (errorTurnos) {
      console.error("Error verificando turnos:", errorTurnos);
      return {
        success: false,
        error: errorTurnos.message
      };
    }

    if (turnosConEspecialidad) {
      return {
        success: false,
        error: "Esta especialidad tiene turnos asociados. No se puede eliminar."
      };
    }

    // Eliminar la especialidad
    const { error } = await supabase
      .from("especialidad")
      .delete()
      .eq("id_especialidad", id);

    if (error) {
      console.error("Error eliminando especialidad:", error);
      return {
        success: false,
        error: error.message
      };
    }

    revalidatePath("/especialistas");
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error inesperado eliminando especialidad:", error);
    return {
      success: false,
      error: "Ocurrió un error al eliminar la especialidad"
    };
  }
}
