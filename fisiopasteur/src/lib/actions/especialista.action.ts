"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type Especialista = Tables<"usuario">;
type EspecialistaInsert = TablesInsert<"usuario">;
type EspecialistaUpdate = TablesUpdate<"usuario">;

// Obtener todos los especialistas
export async function getEspecialistas() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("usuario")
    .select(`
      *,
      especialidad:id_especialidad(
        id_especialidad,
        nombre
      )
    `)
    .eq("id_rol", "2") // Solo especialistas
    .order("nombre");

  if (error) {
    console.error("Error fetching especialistas:", error);
    throw new Error("Error al obtener especialistas");
  }

  return data;
}

// Obtener un especialista por ID
export async function getEspecialista(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("usuario")
    .select(`
      *,
      especialidad:id_especialidad(
        id_especialidad,
        nombre
      )
    `)
    .eq("id_usuario", id)
    .eq("id_rol", "2")
    .single();

  if (error) {
    console.error("Error fetching especialista:", error);
    throw new Error("Error al obtener especialista");
  }

  return data;
}

// Crear especialista
// Crear especialista
export async function createEspecialista(formData: FormData) {
  const supabase = await createClient();

  const especialistaData: Omit<EspecialistaInsert, 'id_usuario'> = {
    // No incluir id_usuario, dejar que la base de datos lo genere
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: formData.get("email") as string,
    usuario: formData.get("usuario") as string,
    contraseña: formData.get("contraseña") as string,
    telefono: formData.get("telefono") as string || null,
    id_especialidad: formData.get("id_especialidad") ? Number(formData.get("id_especialidad")) : null,
    id_rol: "2", // Siempre especialista
    color: formData.get("color") as string || null,
  };

  const { data, error } = await supabase
    .from("usuario")
    .insert(especialistaData)
    .select()
    .single();

  if (error) {
    console.error("Error creating especialista:", error);
    throw new Error("Error al crear especialista");
  }

  revalidatePath("/especialista");
  redirect("/especialista");
}

// Actualizar especialista
export async function updateEspecialista(id: string, formData: FormData) {
  const supabase = await createClient();

  const updateData: EspecialistaUpdate = {
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: formData.get("email") as string,
    usuario: formData.get("usuario") as string,
    telefono: formData.get("telefono") as string || null,
    id_especialidad: formData.get("id_especialidad") ? Number(formData.get("id_especialidad")) : null,
    color: formData.get("color") as string || null,
  };

  // Solo actualizar contraseña si se proporciona
  const contraseña = formData.get("contraseña") as string;
  if (contraseña && contraseña.trim() !== "") {
    updateData.contraseña = contraseña;
  }

  const { data, error } = await supabase
    .from("usuario")
    .update(updateData)
    .eq("id_usuario", id)
    .eq("id_rol", "2") // Solo especialistas
    .select()
    .single();

  if (error) {
    console.error("Error updating especialista:", error);
    throw new Error("Error al actualizar especialista");
  }

  revalidatePath("/admin/especialistas");
  redirect("/admin/especialistas");
}

// Eliminar especialista
export async function deleteEspecialista(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("usuario")
    .delete()
    .eq("id_usuario", id)
    .eq("id_rol", "2"); // Solo especialistas

  if (error) {
    console.error("Error deleting especialista:", error);
    throw new Error("Error al eliminar especialista");
  }

  revalidatePath("/admin/especialistas");
}

// Obtener especialidades para el formulario
export async function getEspecialidades() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("especialidad")
    .select("*")
    .order("nombre");

  if (error) {
    console.error("Error fetching especialidades:", error);
    throw new Error("Error al obtener especialidades");
  }
  return data;
}