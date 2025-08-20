'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type Paciente = Tables<"paciente">;
type PacienteInsert = TablesInsert<"paciente">;
type PacienteUpdate = TablesUpdate<"paciente">;

// Validacioens del servidor
function validatePacienteData(data: Partial<PacienteInsert | PacienteUpdate>): string[] {
    const errors: string[] = [];

    // Validaciones de campos requeridos
    if (!data.nombre?.trim()) errors.push("El nombre es requerido");
    if (!data.apellido?.trim()) errors.push("El apellido es requerido");
    // if (!data.email?.trim()) errors.push("El email es requerido");
    if (!data.dni?.trim()) errors.push("El DNI es requerido");
    // if (!data.telefono?.trim()) errors.push("El teléfono es requerido");

    // Validaciones de campos con formato
    if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
        errors.push("El email no tiene un formato válido");
    }
    if (data.dni && !/^\d{8}[A-Z]$/.test(data.dni)) {
        errors.push("El DNI no tiene un formato válido");
    }

    // Validar fecha de nacimiento (no puede ser futura)
    if (data.fecha_nacimiento) {
        const fechaNac = new Date(data.fecha_nacimiento);
        const hoy = new Date();
        if (fechaNac > hoy) {
        errors.push("La fecha de nacimiento no puede ser futura");
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
    .eq("documento", documento);

  if (excludeId) {
    query = query.neq("id_paciente", excludeId);
  }

  const { data } = await query.single();
  return !!data;
}

// Obtener todos los pacientes con paginación y filtros
export async function getPacientes(options?: {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: keyof Paciente;
  orderDirection?: 'asc' | 'desc';
}) {
  const supabase = await createClient();
  
  const {
    page = 1,
    limit = 20,
    search = "",
    orderBy = "nombre",
    orderDirection = "asc"
  } = options || {};

  let query = supabase
    .from("paciente")
    .select("*", { count: "exact" });

  // Filtro de búsqueda
  if (search.trim()) {
    query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%,documento.ilike.%${search}%`);
  }

  // Ordenamiento
  query = query.order(orderBy, { ascending: orderDirection === "asc" });

  // Paginación
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching pacientes:", error);
    throw new Error("Error al obtener pacientes");
  }

  console.log("Pacientes fetched:", data, "\nCount:", count);

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

// Obtener un paciente por ID
export async function getPaciente(id: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("paciente")
    .select("*")
    .eq("id_paciente", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Paciente no encontrado");
    }
    console.error("Error fetching paciente:", error);
    throw new Error("Error al obtener paciente");
  }

  return data;
}

// Buscar pacientes por término
export async function searchPacientes(searchTerm: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("paciente")
    .select("id_paciente, nombre, apellido, email, documento, telefono")
    .or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,documento.ilike.%${searchTerm}%`)
    .order("nombre")
    .limit(10);

  if (error) {
    console.error("Error searching pacientes:", error);
    throw new Error("Error al buscar pacientes");
  }

  return data || [];
}

// Crear nuevo paciente
export async function createPaciente(formData: FormData) {
  const supabase = await createClient();

  const pacienteData: Omit<PacienteInsert, 'id_paciente'> = {
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: formData.get("email") as string || null,
    dni: formData.get("dni") as string,
    telefono: formData.get("telefono") as string,
    fecha_nacimiento: formData.get("fecha_nacimiento") as string || null,
    direccion: formData.get("direccion") as string || null,
  };

  // Validaciones
  const validationErrors = validatePacienteData(pacienteData);
  if (validationErrors.length > 0) {
    throw new Error(`Errores de validación: ${validationErrors.join(", ")}`);
  }

  // Verificar email único
  if (await checkEmailExists(pacienteData.email!)) {
    throw new Error("Ya existe un paciente con este email");
  }

  // Verificar DNI único
  if (await checkDocumentoExists(pacienteData.dni!)) {
    throw new Error("Ya existe un paciente con este DNI");
  }

  try {
    const { data, error } = await supabase
      .from("paciente")
      .insert(pacienteData)
      .select()
      .single();

    if (error) {
      console.error("Error creating paciente:", error);
      throw new Error("Error al crear paciente");
    }

    revalidatePath("/paciente");
    return data;
  } catch (error: any) {
    console.error("Error in createPaciente:", error);
    
    // Manejo específico de errores de Supabase
    if (error?.code === "23505") { // Constraint violation
      if (error.details?.includes("email")) {
        throw new Error("Ya existe un paciente con este email");
      }
      if (error.details?.includes("dni")) {
        throw new Error("Ya existe un paciente con este DNI");
      }
    }
    
    throw error instanceof Error ? error : new Error("Error al crear paciente");
  }
}


// Actualizar paciente
export async function updatePaciente(id: number, formData: FormData) {
  const supabase = await createClient();

  const updateData: PacienteUpdate = {
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: formData.get("email") as string || null,
    dni: formData.get("dni") as string,
    telefono: formData.get("telefono") as string,
    fecha_nacimiento: formData.get("fecha_nacimiento") as string || null,
    direccion: formData.get("direccion") as string || null,
    //estado: "activo", // Si tienes un campo de estado
  };

  // Validaciones
  const validationErrors = validatePacienteData(updateData);
  if (validationErrors.length > 0) {
    throw new Error(`Errores de validación: ${validationErrors.join(", ")}`);
  }

  // Verificar email único (excluyendo el actual)
  if (await checkEmailExists(updateData.email!, id)) {
    throw new Error("Ya existe otro paciente con este email");
  }

  // Verificar documento único (excluyendo el actual)
  if (await checkDocumentoExists(updateData.dni!, id)) {
    throw new Error("Ya existe otro paciente con este DNI");
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
      throw new Error("Error al actualizar paciente");
    }

    revalidatePath("/pacients");
    return data;
  } catch (error: any) {
    console.error("Error in updatePaciente:", error);
    
    // Manejo específico de errores
    if (error?.code === "23505") {
      if (error.details?.includes("email")) {
        throw new Error("Ya existe otro paciente con este email");
      }
      if (error.details?.includes("dni")) {
        throw new Error("Ya existe otro paciente con este DNI");
      }
    }
    
    throw error instanceof Error ? error : new Error("Error al actualizar paciente");
  }
}

// Eliminar paciente (soft delete si tienes el campo, hard delete si no)
export async function deletePaciente(id: number) {
  const supabase = await createClient();

  try {
    // Verificar si el paciente tiene turnos asociados
    const { data: turnos } = await supabase
      .from("turno")
      .select("id_turno")
      .eq("id_paciente", id)
      .limit(1);

    if (turnos && turnos.length > 0) {
      throw new Error("No se puede eliminar el paciente porque tiene turnos asociados");
    }

    const { error } = await supabase
      .from("paciente")
      .delete()
      .eq("id_paciente", id);

    if (error) {
      console.error("Error deleting paciente:", error);
      throw new Error("Error al eliminar paciente");
    }

    revalidatePath("/paciente");
  } catch (error: any) {
    console.error("Error in deletePaciente:", error);
    throw error instanceof Error ? error : new Error("Error al eliminar paciente");
  }
}