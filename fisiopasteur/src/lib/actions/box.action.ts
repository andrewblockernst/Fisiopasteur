'use server'

import { createClient } from "@/lib/supabase/server";
import { nowIso } from "@/lib/dayjs";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/action-result";
import type { Database, TablesInsert } from "@/lib/database.types";
import { boxSchema } from "@/lib/schemas/box.schema";
import { requireAdmin } from "@/lib/auth/guards";

type BoxInsert = Database["public"]["Tables"]["box"]["Insert"];

// Obtener todos los boxes
export async function obtenerBoxes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("box")
    .select("*")
    .eq("estado", "activo")
    .order("numero", { ascending: true });

  if (error) {
    console.error("Error fetching boxes:", error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data || [] };
}

// Crear un nuevo box
export async function crearBox(formData: FormData): Promise<ActionResult<any>> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: 'No autorizado. Se requieren permisos de administrador.' };

  const supabase = await createClient();

  const parsed = boxSchema.safeParse({
    numero: parseInt(formData.get("numero") as string),
    nombre: ((formData.get("nombre") as string) || "").trim(),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const { numero, nombre } = parsed.data;

  const payload: BoxInsert = {
    numero,
    nombre,
    estado: "activo"
  } ;

  // Crear el box
  const { data, error } = await supabase
    .from("box")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate key value violates unique constraint")) {
      console.error("Error creating box - duplicate number:", error);
      return { success: false, error: `Ya existe un box con el número ${numero}` };
    } else {
      console.error("Error creating box:", error);
      return { success: false, error: "Error al crear el box: " + error.message };
    }
  }

  // ✅ Revalidación no bloqueante
  Promise.resolve().then(() => {
    revalidatePath("/especialistas");
    revalidatePath("/turnos");
  }).catch(err => console.error('Error revalidating path:', err));

  return { success: true, data };
}

// Actualizar un box
export async function actualizarBox(id: number, formData: FormData): Promise<ActionResult<any>> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: 'No autorizado. Se requieren permisos de administrador.' };

  const supabase = await createClient();

  const parsed = boxSchema.safeParse({
    numero: parseInt(formData.get("numero") as string),
    nombre: ((formData.get("nombre") as string) || "").trim(),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const { numero, nombre } = parsed.data;

  // Actualizar el box
  const { data, error } = await supabase
    .from("box")
    .update({
      numero,
      nombre,
      updated_at: nowIso(),
    })
    .eq("id_box", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate key value violates unique constraint")) {
      console.error("Error updating box - duplicate number:", error);
      return { success: false, error: `Ya existe otro box con el número ${numero}` };
    } else {
      console.error("Error updating box:", error);
      return { success: false, error: "Error al actualizar el box: " + error.message };
    }
  }

  // ✅ Revalidación no bloqueante
  Promise.resolve().then(() => {
    revalidatePath("/especialistas");
    revalidatePath("/turnos");
  }).catch(err => console.error('Error revalidating path:', err));

  return { success: true, data };
}

// Eliminar (desactivar) un box
export async function eliminarBox(id: number): Promise<ActionResult<any>> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: 'No autorizado. Se requieren permisos de administrador.' };

  const supabase = await createClient();

  // Verificar si hay turnos asociados al box
  const { count } = await supabase
    .from("turno")
    .select("id_turno", { count: "exact", head: true })
    .eq("id_box", id)
    .neq("estado", "cancelado")
    .neq("estado", "eliminado");

  if (count && count > 0) {
    return {
      success: false,
      error: `No se puede eliminar el box porque tiene ${count} turno(s) asociado(s). Primero cancela o reasigna los turnos.`
    };
  }

  // Desactivar el box (soft delete)
  const { data, error } = await supabase
    .from("box")
    .update({
      estado: "inactivo",
      updated_at: nowIso(),
    })
    .eq("id_box", id)
    .select()
    .single();

  if (error) {
    console.error("Error deleting box:", error);
    return { success: false, error: "Error al eliminar el box: " + error.message };
  }

  // ✅ Revalidación no bloqueante
  Promise.resolve().then(() => {
    revalidatePath("/especialistas");
    revalidatePath("/turnos");
  }).catch(err => console.error('Error revalidating path:', err));

  return { success: true, data };
}
