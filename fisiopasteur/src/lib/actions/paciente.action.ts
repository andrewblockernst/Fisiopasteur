'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import { normalizePhoneNumber } from "@/lib/utils/phone.utils";
import type { ActionResult } from "@/lib/actions/action-result";

type Paciente = Tables<"paciente">;
type PacienteInsert = TablesInsert<"paciente">;
type PacienteUpdate = TablesUpdate<"paciente">;

export type CreatePacienteResult =
  | { success: true; data: Paciente }
  | { success: false; error: string };

// Validacioens del servidor
function validatePacienteData(data: Partial<PacienteInsert | PacienteUpdate>): string[] {
    const errors: string[] = [];

    // Validaciones de campos requeridos
    if (!data.nombre?.trim()) errors.push("El nombre es requerido");
    if (!data.apellido?.trim()) errors.push("El apellido es requerido");
    // if (!data.email?.trim()) errors.push("El email es requerido");
    // if (!data.dni?.trim()) errors.push("El DNI es requerido");
    if (!data.telefono?.trim()) errors.push("El teléfono es requerido");

    // Validaciones de campos con formato
    if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
        errors.push("El email no tiene un formato válido");
    }


    // Validar fecha de nacimiento (no puede ser futura)
    if (data.fecha_nacimiento) {
        const fechaNac = new Date(data.fecha_nacimiento);
        const hoy = new Date();
        if (fechaNac > hoy) {
          errors.push("La fecha de nacimiento no puede ser futura");
        } else {
        }
    }

    return errors;
}

// Verificar si el email ya existe
async function checkEmailExists(email: string, excludeId?: number): Promise<boolean> {
    const supabase = await createClient();

    let query = supabase
    .from("paciente")
    .select("id_paciente")
    .eq("email", email);

    if (excludeId) {
    query = query.neq("id_paciente", excludeId);
  }

  const { data } = await query.single();
  return !!data;
}

// Verificar si el documento ya existe
async function checkDocumentoExists(documento: string, excludeId?: number): Promise<boolean> {
  const supabase = await createClient();
  
  let query = supabase
    .from("paciente")
    .select("id_paciente")
    .eq("dni", documento);

  if (excludeId) {
    query = query.neq("id_paciente", excludeId);
  }

  const { data } = await query.single();
  return !!data;
}

// Verificar si el teléfono ya existe
async function checkTelefonoExists(telefono: string, excludeId?: number): Promise<boolean> {
  const supabase = await createClient();
  
  let query = supabase
    .from("paciente")
    .select("id_paciente")
    .eq("telefono", telefono);

  if (excludeId) {
    query = query.neq("id_paciente", excludeId);
  }

  const { data } = await query.single();
  return !!data;
}

// Obtener todos los pacientes con paginación y filtros
export async function getPacientes(options?: {
  search?: string;
  orderBy?: keyof Paciente;
  orderDirection?: 'asc' | 'desc';
}) {
  const supabase = await createClient();
  
  const {  
    search = "",
    orderBy = "nombre",
    orderDirection = "asc"
  } = options || {};

  // ✅ Obtener pacientes
  
  let query = supabase
    .from("paciente")
    .select("*", { count: "exact" });

  // Filtro de búsqueda
  if (search.trim()) {
    query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%,documento.ilike.%${search}%`);
  }

  // Ordenamiento
  query = query.order(orderBy as string, { ascending: orderDirection === "asc" });



  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching pacientes:", error);
    return { success: false, error: error.message };
  }


  return {
    success: true,
    data: data || [],
    total: count || 0,
  } as any;
}

// Obtener un paciente por ID
export async function getPaciente(id: number): Promise<
  | { success: true; data: Paciente }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("paciente")
    .select("*")
    .eq("id_paciente", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: false, error: "Paciente no encontrado" };
    }
    console.error("Error fetching paciente:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// Buscar pacientes por término
export async function searchPacientes(searchTerm: string): Promise<
  | { success: true; data: any[] }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("paciente")
    .select("id_paciente, nombre, apellido, email, documento, telefono")
    .or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,documento.ilike.%${searchTerm}%`)
    .order("nombre")
    .limit(10);

  if (error) {
    console.error("Error searching pacientes:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

// Crear nuevo paciente
export async function createPaciente(formData: FormData): Promise<CreatePacienteResult> {
  const supabase = await createClient();

  // ✅ Normalizar número de teléfono al formato internacional
  const telefonoRaw = formData.get("telefono") as string;
  const telefonoNormalizado = normalizePhoneNumber(telefonoRaw);

  const pacienteData: Omit<PacienteInsert, 'id_paciente'> = {
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: formData.get("email") as string || null,
    dni: formData.get("dni") as string || null,
    telefono: telefonoNormalizado,
    fecha_nacimiento: formData.get("fecha_nacimiento") as string || null,
    direccion: formData.get("direccion") as string || null,
  };

  // Validaciones
  const validationErrors = validatePacienteData(pacienteData);
  if (validationErrors.length > 0) {
    return { success: false, error: `Errores de validación: ${validationErrors.join(", ")}` };
  }

  // Verificar email único
  if (pacienteData.email && await checkEmailExists(pacienteData.email)) {
    return { success: false, error: "Ya existe un paciente con este email" };
  }

  // Verificar DNI único
  if (pacienteData.dni && await checkDocumentoExists(pacienteData.dni)) {
    return { success: false, error: "Ya existe un paciente con este DNI" };
  }

  // Verificar teléfono único
  if (await checkTelefonoExists(telefonoNormalizado)) {
    return { success: false, error: "Ya existe un paciente con este número de teléfono" };
  }

  try {
    const { data, error } = await supabase
      .from("paciente")
      .insert(pacienteData)
      .select()
      .single();

    if (error) {
      console.error("Error creating paciente:", error);
      
      // Manejo específico de errores de constraint de Supabase
      if (error.code === "23505") { // Constraint violation
        if (error.details?.includes("email")) {
          return { success: false, error: "Ya existe un paciente con este email" };
        }
        if (error.details?.includes("dni")) {
          return { success: false, error: "Ya existe un paciente con este DNI" };
        }
        if (error.details?.includes("telefono")) {
          return { success: false, error: "Ya existe un paciente con este número de teléfono" };
        }
      }
      
      return { success: false, error: "Error al crear paciente: " + error.message };
    }

    // ✅ Revalidación no bloqueante para evitar problemas de loading
    Promise.resolve().then(() => {
      revalidatePath("/paciente");
    }).catch(err => console.error('Error revalidating path:', err));
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Error in createPaciente:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear paciente",
    };
  }
}


// Actualizar paciente
export async function updatePaciente(id: number, formData: FormData): Promise<ActionResult<Paciente>> {
  const supabase = await createClient();

  // ✅ Normalizar número de teléfono al formato internacional
  const telefonoRaw = formData.get("telefono") as string;
  const telefonoNormalizado = normalizePhoneNumber(telefonoRaw);

  const updateData: PacienteUpdate = {
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: formData.get("email") as string || null,
    dni: formData.get("dni") as string,
    telefono: telefonoNormalizado, // ✅ Guardar teléfono normalizado
    fecha_nacimiento: formData.get("fecha_nacimiento") as string || null,
    direccion: formData.get("direccion") as string || null,
    // estado: formData.get("estado") as string || "activo",
  };

  // Validaciones
  const validationErrors = validatePacienteData(updateData);
  if (validationErrors.length > 0) {
    return { success: false, error: `Errores de validación: ${validationErrors.join(", ")}` };
  }

  // Verificar email único (excluyendo el actual)
  if (updateData.email && await checkEmailExists(updateData.email, id)) {
    return { success: false, error: "Ya existe otro paciente con este email" };
  }

  // Verificar documento único (excluyendo el actual)
  if (updateData.dni && await checkDocumentoExists(updateData.dni, id)) {
    return { success: false, error: "Ya existe otro paciente con este DNI" };
  }

  // Verificar teléfono único (excluyendo el actual)
  if (await checkTelefonoExists(telefonoNormalizado, id)) {
    return { success: false, error: "Ya existe otro paciente con este número de teléfono" };
  }

  try {
    const { data, error } = await supabase
      .from("paciente")
      .update(updateData)
      .eq("id_paciente", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating paciente:", error);
      
      // Manejo específico de errores de constraint de Supabase
      if (error.code === "23505") {
        if (error.details?.includes("email")) {
          return { success: false, error: "Ya existe otro paciente con este email" };
        }
        if (error.details?.includes("dni")) {
          return { success: false, error: "Ya existe otro paciente con este DNI" };
        }
        if (error.details?.includes("telefono")) {
          return { success: false, error: "Ya existe otro paciente con este número de teléfono" };
        }
      }
      
      return { success: false, error: error.message || "Error al actualizar paciente" };
    }

    // ✅ Revalidación no bloqueante
    Promise.resolve().then(() => {
      revalidatePath("/pacients");
    }).catch(err => console.error('Error revalidating path:', err));
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Error in updatePaciente:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar paciente",
    };
  }
}

// Eliminar paciente (soft delete si tienes el campo, hard delete si no)
export async function deletePaciente(id: number): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // Verificar si el paciente tiene turnos asociados
    const { data: turnos } = await supabase
      .from("turno")
      .select("id_turno")
      .eq("id_paciente", id)
      .eq("estado", "pendiente")
      .limit(1);

    if (turnos && turnos.length > 0) {
      return { success: false, error: "No se puede eliminar el paciente porque tiene turnos asociados" };
    }

    const { error } = await supabase
      .from("paciente")
      .update({ activo: false })
      .eq("id_paciente", id);


    if (error) {
      console.error("Error deleting paciente:", error);
      return { success: false, error: "Error al eliminar paciente" };
    }

    revalidatePath("/paciente");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deletePaciente:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar paciente",
    };
  }
}

// Obtener historia clínica de un paciente
export async function getHistorialClinico(idPaciente: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("paciente")
    .select("historia_clinica")
    .eq("id_paciente", idPaciente)
    .single();

  if (error) {
    console.error("Error fetching historia clínica:", error);
    return null;
  }
  return data?.historia_clinica || "";
}

// Agregar observación a la historia clínica
export async function agregarObservacion(idPaciente: number, observaciones: string): Promise<ActionResult<any>> {
  const supabase = await createClient();

  // 1. Buscar el último turno del paciente
  const { data: turnos, error: errorTurnos } = await supabase
    .from("turno")
    .select("id_turno")
    .eq("id_paciente", idPaciente)
    .order("fecha", { ascending: false })
    .limit(1);

  if (errorTurnos || !turnos || turnos.length === 0) {
    return { success: false, error: "No existe turno para este paciente" };
  }

  const idTurno = turnos[0].id_turno;

  // 2. Crear la evolución clínica vinculada al turno
  const { data, error } = await supabase
    .from("evolucion_clinica")
    .insert({
      id_turno: idTurno,
      observaciones,
    })
    .select()
    .single();

  if (error) {
    console.error("Error agregando observación:", error);
    return { success: false, error: "No se pudo agregar la observación" };
  }
  return { success: true, data };
}

// Editar observación (solo si está dentro de los 5 minutos)
export async function editarObservacion(idEvolucion: number, texto: string): Promise<ActionResult<any>> {
  const supabase = await createClient();

  // Buscar la evolución clínica en la tabla correcta
  const { data: evo } = await supabase
    .from("evolucion_clinica")
    .select("created_at")
    .eq("id_evolucion", idEvolucion)
    .single();

  if (!evo) return { success: false, error: "Observación no encontrada" };

  // Usar created_at para controlar el tiempo de edición
  const minutos = (Date.now() - new Date(evo.created_at ?? "").getTime()) / 60000;
  if (minutos > 5) return { success: false, error: "Solo se puede editar la observación durante los primeros 5 minutos" };

  const { data, error } = await supabase
    .from("evolucion_clinica")
    .update({ observaciones: texto })
    .eq("id_evolucion", idEvolucion)
    .select()
    .single();

  if (error) {
    console.error("Error editando observación:", error);
    return { success: false, error: "No se pudo editar la observación" };
  }
  return { success: true, data };
}

// Obtener evoluciones clínicas de un paciente
export async function getEvolucionesClinicas(idPaciente: number) {
  const supabase = await createClient();
  // 1. Buscar todos los turnos del paciente
  const { data: turnos, error: errorTurnos } = await supabase
    .from("turno")
    .select("id_turno")
    .eq("id_paciente", idPaciente);

  if (errorTurnos || !turnos) return [];

  const turnosIds = turnos.map(t => t.id_turno);

  // 2. Buscar todas las evoluciones clínicas de esos turnos
  const { data: evoluciones, error: errorEvo } = await supabase
    .from("evolucion_clinica")
    .select("*")
    .in("id_turno", turnosIds);

  if (errorEvo || !evoluciones) return [];

  return evoluciones;
}

// Agregar evolución clínica
export async function agregarEvolucionClinica(idTurno: number, observaciones: string): Promise<ActionResult<any>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("evolucion_clinica")
    .insert({
      id_turno: idTurno,
      observaciones,
    })
    .select()
    .single();

  if (error) {
    console.error("Error agregando evolución clínica:", error);
    return { success: false, error: "No se pudo agregar la evolución clínica" };
  }
  return { success: true, data };
}

// Activar paciente
export async function activarPaciente(idPaciente: number): Promise<ActionResult<Paciente>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("paciente")
    .update({ activo: true })
    .eq("id_paciente", idPaciente)
    .select()
    .single();

  if (error) {
    console.error("Error activando paciente:", error);
    return { success: false, error: "No se pudo activar el paciente" };
  }
  return { success: true, data };
}