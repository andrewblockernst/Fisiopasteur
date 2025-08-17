"use server";

import { supabaseAdmin } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type Especialista = Tables<"usuario">;
type EspecialistaInsert = TablesInsert<"usuario">;
type EspecialistaUpdate = TablesUpdate<"usuario">;
type UsuarioEspecialidad = Tables<"usuario_especialidad">;

// Obtener todos los especialistas con sus especialidades
export async function getEspecialistas() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("usuario")
    .select(`
      *,
      usuario_especialidad(
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      )
    `)
    .eq("id_rol", 2) // Solo especialistas
    .order("nombre");

  if (error) {
    console.error("Error fetching especialistas:", error);
    throw new Error("Error al obtener especialistas");
  }

  // Transformar los datos para que sea más fácil de usar
  const especialistasConEspecialidades = data.map(usuario => ({
    ...usuario,
    especialidades: usuario.usuario_especialidad?.map(ue => ue.especialidad).filter(Boolean) || []
  }));

  return especialistasConEspecialidades;
}

// Obtener un especialista por ID con sus especialidades
export async function getEspecialista(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("usuario")
    .select(`
      *,
      usuario_especialidad(
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      )
    `)
    .eq("id_usuario", id)
    .eq("id_rol", 2)
    .single();

  if (error) {
    console.error("Error fetching especialista:", error);
    throw new Error("Error al obtener especialista");
  }

  // Transformar los datos
  const especialistaConEspecialidades = {
    ...data,
    especialidades: data.usuario_especialidad?.map(ue => ue.especialidad).filter(Boolean) || []
  };

  return especialistaConEspecialidades;
}

// Crear especialista con múltiples especialidades
export async function createEspecialista(formData: FormData) {
  // 1. Crear usuario en Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.get("email") as string,
    password: formData.get("contraseña") as string,
    email_confirm: true,
    user_metadata: {
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido"),
      rol: "especialista",
    },
  });

  if (authError || !authUser) {
    console.error("Error creando user en Auth:", authError);
    throw new Error("No se pudo crear el usuario en Auth");
  }

  // 2. Guardar en tabla usuario
  const especialistaData = {
    id_usuario: authUser.user.id,
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    id_especialidad: null, 
    telefono: formData.get("telefono") as string || null,
    email: formData.get("email") as string, 
    usuario: formData.get("usuario") as string,
    contraseña: formData.get("contraseña") as string,
    color: formData.get("color") as string || null,
    id_rol: 2,
  };

  const supabase = await createClient();
  const { data: nuevoUsuario, error: errorUsuario } = await supabase
    .from("usuario")
    .insert(especialistaData)
    .select()
    .single();

  if (errorUsuario) {
    // Si falla, eliminar el usuario en Auth (rollback)
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    console.error("Error creando especialista en tabla:", errorUsuario);
    throw new Error("Error al crear especialista");
  }

  // 3. Relacionar especialidades
  const especialidadesSeleccionadas: number[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('especialidades[')) {
      especialidadesSeleccionadas.push(Number(value));
    }
  }

  if (especialidadesSeleccionadas.length > 0) {
    const relacionesEspecialidades = especialidadesSeleccionadas.map(idEspecialidad => ({
      id_usuario: nuevoUsuario.id_usuario,
      id_especialidad: idEspecialidad
    }));

    const { error: errorRelaciones } = await supabase
      .from("usuario_especialidad")
      .insert(relacionesEspecialidades);

    if (errorRelaciones) {
      // Si falla, eliminar el usuario creado
      await supabase.from("usuario").delete().eq("id_usuario", nuevoUsuario.id_usuario);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error("Error al asignar especialidades");
    }
  }

  revalidatePath("/especialista");
  redirect("/especialista");
}

// Actualizar especialista con múltiples especialidades
export async function updateEspecialista(id: string, formData: FormData) {
  const supabase = await createClient();

  // Obtener especialidades seleccionadas del FormData
  const especialidadesSeleccionadas: number[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('especialidades[')) {
      especialidadesSeleccionadas.push(Number(value));
    }
  }

  const updateData: EspecialistaUpdate = {
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: formData.get("email") as string,
    usuario: formData.get("usuario") as string,
    telefono: formData.get("telefono") as string || null,
    color: formData.get("color") as string || null,
  };

  // Solo actualizar contraseña si se proporciona
  const contraseña = formData.get("contraseña") as string;
  if (contraseña && contraseña.trim() !== "") {
    updateData.contraseña = contraseña;
  }

  // Actualizar el usuario
  const { error: errorUsuario } = await supabase
    .from("usuario")
    .update(updateData)
    .eq("id_usuario", id)
    .eq("id_rol", 2); // Solo especialistas

  if (errorUsuario) {
    console.error("Error updating especialista:", errorUsuario);
    throw new Error("Error al actualizar especialista");
  }

  // Eliminar relaciones existentes
  const { error: errorEliminar } = await supabase
    .from("usuario_especialidad")
    .delete()
    .eq("id_usuario", id);

  if (errorEliminar) {
    console.error("Error deleting existing relations:", errorEliminar);
    throw new Error("Error al actualizar especialidades");
  }

  // Crear nuevas relaciones
  if (especialidadesSeleccionadas.length > 0) {
    const relacionesEspecialidades = especialidadesSeleccionadas.map(idEspecialidad => ({
      id_usuario: id,
      id_especialidad: idEspecialidad
    }));

    const { error: errorRelaciones } = await supabase
      .from("usuario_especialidad")
      .insert(relacionesEspecialidades);

    if (errorRelaciones) {
      console.error("Error creating new relations:", errorRelaciones);
      throw new Error("Error al actualizar especialidades");
    }
  }

  revalidatePath("/especialista");
  redirect("/especialista");
}

// Eliminar especialista (las relaciones se eliminan automáticamente por CASCADE)
export async function deleteEspecialista(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("usuario")
    .delete()
    .eq("id_usuario", id)
    .eq("id_rol", 2); // Solo especialistas

  if (error) {
    console.error("Error deleting especialista:", error);
    throw new Error("Error al eliminar especialista");
  }

  revalidatePath("/especialista");
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

  return data || [];
}