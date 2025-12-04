'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Obtener todos los boxes de la organización
export async function obtenerBoxes() {
  const supabase = await createClient();
  
  // ✅ MULTI-ORG: Obtener contexto organizacional
  const { getAuthContext } = await import("@/lib/utils/auth-context");
  const { orgId } = await getAuthContext();

  const { data, error } = await supabase
    .from("box")
    .select("*")
    .eq("id_organizacion", orgId)
    .eq("estado", "activo")
    .order("numero", { ascending: true });

  if (error) {
    console.error("Error fetching boxes:", error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data || [] };
}

// Crear un nuevo box
export async function crearBox(formData: FormData) {
  const supabase = await createClient();

  // ✅ MULTI-ORG: Obtener contexto organizacional
  const { getAuthContext } = await import("@/lib/utils/auth-context");
  const { orgId } = await getAuthContext();

  const numero = parseInt(formData.get("numero") as string);
  const nombre = (formData.get("nombre") as string).trim();

  // Validaciones
  if (!numero || numero < 1) {
    throw new Error("El número del box debe ser mayor a 0");
  }

  if (!nombre) {
    throw new Error("El nombre del box es requerido");
  }

  // Verificar que el número no esté en uso
  const { data: existente } = await supabase
    .from("box")
    .select("id_box")
    .eq("id_organizacion", orgId)
    .eq("numero", numero)
    .eq("estado", "activo")
    .single();

  if (existente) {
    throw new Error(`Ya existe un box con el número ${numero}`);
  }

  // Crear el box
  const { data, error } = await supabase
    .from("box")
    .insert({
      numero,
      nombre,
      estado: "activo",
      id_organizacion: orgId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating box:", error);
    throw new Error("Error al crear el box: " + error.message);
  }

  // ✅ Revalidación no bloqueante
  Promise.resolve().then(() => {
    revalidatePath("/especialistas");
    revalidatePath("/turnos");
  }).catch(err => console.error('Error revalidating path:', err));

  return data;
}

// Actualizar un box
export async function actualizarBox(id: number, formData: FormData) {
  const supabase = await createClient();

  // ✅ MULTI-ORG: Obtener contexto organizacional
  const { getAuthContext } = await import("@/lib/utils/auth-context");
  const { orgId } = await getAuthContext();

  const numero = parseInt(formData.get("numero") as string);
  const nombre = (formData.get("nombre") as string).trim();

  // Validaciones
  if (!numero || numero < 1) {
    throw new Error("El número del box debe ser mayor a 0");
  }

  if (!nombre) {
    throw new Error("El nombre del box es requerido");
  }

  // Verificar que el número no esté en uso por otro box
  const { data: existente } = await supabase
    .from("box")
    .select("id_box")
    .eq("id_organizacion", orgId)
    .eq("numero", numero)
    .eq("estado", "activo")
    .neq("id_box", id)
    .single();

  if (existente) {
    throw new Error(`Ya existe otro box con el número ${numero}`);
  }

  // Actualizar el box
  const { data, error } = await supabase
    .from("box")
    .update({
      numero,
      nombre,
      updated_at: new Date().toISOString(),
    })
    .eq("id_box", id)
    .eq("id_organizacion", orgId)
    .select()
    .single();

  if (error) {
    console.error("Error updating box:", error);
    throw new Error("Error al actualizar el box: " + error.message);
  }

  // ✅ Revalidación no bloqueante
  Promise.resolve().then(() => {
    revalidatePath("/especialistas");
    revalidatePath("/turnos");
  }).catch(err => console.error('Error revalidating path:', err));

  return data;
}

// Eliminar (desactivar) un box
export async function eliminarBox(id: number) {
  const supabase = await createClient();

  // ✅ MULTI-ORG: Obtener contexto organizacional
  const { getAuthContext } = await import("@/lib/utils/auth-context");
  const { orgId } = await getAuthContext();

  // Verificar si hay turnos asociados al box
  const { count } = await supabase
    .from("turno")
    .select("id_turno", { count: "exact", head: true })
    .eq("id_box", id)
    .eq("id_organizacion", orgId)
    .neq("estado", "cancelado");

  if (count && count > 0) {
    throw new Error(
      `No se puede eliminar el box porque tiene ${count} turno(s) asociado(s). Primero cancela o reasigna los turnos.`
    );
  }

  // Desactivar el box (soft delete)
  const { data, error } = await supabase
    .from("box")
    .update({
      estado: "inactivo",
      updated_at: new Date().toISOString(),
    })
    .eq("id_box", id)
    .eq("id_organizacion", orgId)
    .select()
    .single();

  if (error) {
    console.error("Error deleting box:", error);
    throw new Error("Error al eliminar el box: " + error.message);
  }

  // ✅ Revalidación no bloqueante
  Promise.resolve().then(() => {
    revalidatePath("/especialistas");
    revalidatePath("/turnos");
  }).catch(err => console.error('Error revalidating path:', err));

  return data;
}
