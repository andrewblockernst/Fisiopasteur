"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";

type Especialidad = Database["public"]["Tables"]["especialidad"]["Row"];
type EspecialidadInsert = Database["public"]["Tables"]["especialidad"]["Insert"];
type EspecialidadUpdate = Database["public"]["Tables"]["especialidad"]["Update"];

// =====================================
// 📋 OBTENER ESPECIALIDADES
// =====================================

/**
 * Obtener todas las especialidades de la organización actual
 */
export async function getEspecialidades() {
  try {
    const supabase = await createClient();
    
    // Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    const { data, error } = await supabase
      .from("especialidad")
      .select("*")
      .eq("id_organizacion", orgId)
      .order("nombre");

    if (error) {
      console.error("Error fetching especialidades:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getEspecialidades:', error);
    return [];
  }
}

// =====================================
// ✏️ CREAR ESPECIALIDAD
// =====================================

/**
 * Crear una nueva especialidad
 */
export async function createEspecialidad(nombre: string) {
  const supabase = await createClient();
  
  try {
    // Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Validar que el nombre no esté vacío
    if (!nombre || nombre.trim().length === 0) {
      return {
        success: false,
        message: "Error de validación",
        description: "El nombre de la especialidad es requerido"
      };
    }

    // Verificar que no exista una especialidad con el mismo nombre en esta organización
    const { data: existente, error: errorCheck } = await supabase
      .from("especialidad")
      .select("id_especialidad")
      .eq("id_organizacion", orgId)
      .ilike("nombre", nombre.trim())
      .maybeSingle();

    if (errorCheck) {
      console.error("Error verificando especialidad:", errorCheck);
      return {
        success: false,
        message: "Error al verificar especialidad",
        description: errorCheck.message
      };
    }

    if (existente) {
      return {
        success: false,
        message: "Especialidad duplicada",
        description: "Ya existe una especialidad con ese nombre"
      };
    }

    // Crear la especialidad
    const nuevaEspecialidad: EspecialidadInsert = {
      nombre: nombre.trim(),
      id_organizacion: orgId
    };

    const { data, error } = await (supabase
      .from("especialidad") as any)
      .insert(nuevaEspecialidad)
      .select()
      .single();

    if (error) {
      console.error("Error creando especialidad:", error);
      return {
        success: false,
        message: "Error al crear especialidad",
        description: error.message
      };
    }

    revalidatePath("/especialistas");
    
    return {
      success: true,
      message: "Especialidad creada",
      description: `${nombre} ha sido agregada exitosamente`,
      data
    };
  } catch (error) {
    console.error("Error inesperado creando especialidad:", error);
    return {
      success: false,
      message: "Error inesperado",
      description: "Ocurrió un error al crear la especialidad"
    };
  }
}

// =====================================
// ✏️ ACTUALIZAR ESPECIALIDAD
// =====================================

/**
 * Actualizar una especialidad existente
 */
export async function updateEspecialidad(id: number, nombre: string) {
  const supabase = await createClient();
  
  try {
    // Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Validar que el nombre no esté vacío
    if (!nombre || nombre.trim().length === 0) {
      return {
        success: false,
        message: "Error de validación",
        description: "El nombre de la especialidad es requerido"
      };
    }

    // Verificar que la especialidad exista y pertenezca a esta organización
    const { data: especialidadActual, error: errorCheck } = await supabase
      .from("especialidad")
      .select("*")
      .eq("id_especialidad", id)
      .eq("id_organizacion", orgId)
      .single();

    if (errorCheck || !especialidadActual) {
      return {
        success: false,
        message: "Especialidad no encontrada",
        description: "La especialidad no existe o no pertenece a tu organización"
      };
    }

    // Verificar que no exista otra especialidad con el mismo nombre
    const { data: duplicado, error: errorDuplicado } = await supabase
      .from("especialidad")
      .select("id_especialidad")
      .eq("id_organizacion", orgId)
      .ilike("nombre", nombre.trim())
      .neq("id_especialidad", id)
      .maybeSingle();

    if (errorDuplicado) {
      console.error("Error verificando duplicado:", errorDuplicado);
      return {
        success: false,
        message: "Error al verificar especialidad",
        description: errorDuplicado.message
      };
    }

    if (duplicado) {
      return {
        success: false,
        message: "Especialidad duplicada",
        description: "Ya existe otra especialidad con ese nombre"
      };
    }

    // Actualizar la especialidad
    const { data, error } = await (supabase
      .from("especialidad") as any)
      .update({ nombre: nombre.trim() })
      .eq("id_especialidad", id)
      .eq("id_organizacion", orgId)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando especialidad:", error);
      return {
        success: false,
        message: "Error al actualizar especialidad",
        description: error.message
      };
    }

    revalidatePath("/especialistas");
    
    return {
      success: true,
      message: "Especialidad actualizada",
      description: `${nombre} ha sido actualizada exitosamente`,
      data
    };
  } catch (error) {
    console.error("Error inesperado actualizando especialidad:", error);
    return {
      success: false,
      message: "Error inesperado",
      description: "Ocurrió un error al actualizar la especialidad"
    };
  }
}

// =====================================
// 🗑️ ELIMINAR ESPECIALIDAD
// =====================================

/**
 * Eliminar una especialidad (solo si no está en uso)
 */
export async function deleteEspecialidad(id: number) {
  const supabase = await createClient();
  
  try {
    // Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Verificar que la especialidad exista y pertenezca a esta organización
    const { data: especialidad, error: errorCheck } = await supabase
      .from("especialidad")
      .select("nombre")
      .eq("id_especialidad", id)
      .eq("id_organizacion", orgId)
      .single();

    if (errorCheck || !especialidad) {
      return {
        success: false,
        message: "Especialidad no encontrada",
        description: "La especialidad no existe o no pertenece a tu organización"
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
        message: "Error al verificar uso",
        description: errorUso.message
      };
    }

    if (enUso) {
      return {
        success: false,
        message: "No se puede eliminar",
        description: "Esta especialidad está asignada a uno o más especialistas. Primero debes removerla de los especialistas."
      };
    }

    // Verificar que no haya turnos con esta especialidad
    const { data: turnosConEspecialidad, error: errorTurnos } = await supabase
      .from("turno")
      .select("id_turno")
      .eq("id_especialidad", id)
      .eq("id_organizacion", orgId)
      .limit(1)
      .maybeSingle();

    if (errorTurnos) {
      console.error("Error verificando turnos:", errorTurnos);
      return {
        success: false,
        message: "Error al verificar turnos",
        description: errorTurnos.message
      };
    }

    if (turnosConEspecialidad) {
      return {
        success: false,
        message: "No se puede eliminar",
        description: "Esta especialidad tiene turnos asociados. No se puede eliminar."
      };
    }

    // Eliminar la especialidad
    const { error } = await supabase
      .from("especialidad")
      .delete()
      .eq("id_especialidad", id)
      .eq("id_organizacion", orgId);

    if (error) {
      console.error("Error eliminando especialidad:", error);
      return {
        success: false,
        message: "Error al eliminar especialidad",
        description: error.message
      };
    }

    revalidatePath("/especialistas");
    
    return {
      success: true,
      message: "Especialidad eliminada",
      description: `${(especialidad as any).nombre} ha sido eliminada exitosamente`
    };
  } catch (error) {
    console.error("Error inesperado eliminando especialidad:", error);
    return {
      success: false,
      message: "Error inesperado",
      description: "Ocurrió un error al eliminar la especialidad"
    };
  }
}
