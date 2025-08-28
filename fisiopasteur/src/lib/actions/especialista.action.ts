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

// Solo agregar el tipo de respuesta sin cambiar las funciones existentes
export interface ServerActionResponse {
  success: boolean;
  message: string;
  toastType: 'success' | 'error' | 'warning' | 'info';
  description?: string;
  redirect?: string;
}

// Obtener todos los especialistas con sus especialidades
export async function getEspecialistas() {
  try {
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
  } catch (error) {
    console.error('Error en getEspecialistas:', error);
    return [];
  }
}

// Obtener un especialista por ID con sus especialidades
export async function getEspecialista(id: string) {
  try {
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
  } catch (error) {
    console.error('Error en getEspecialista:', error);
    return null;
  }
}

// Crear especialista con múltiples especialidades
export async function createEspecialista(formData: FormData): Promise<ServerActionResponse> {
  try {
    const email = formData.get("email") as string;
    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const contraseña = formData.get("contraseña") as string;

    // Validaciones básicas
    if (!email || !nombre || !apellido || !contraseña) {
      return {
        success: false,
        message: 'Campos requeridos faltantes',
        toastType: 'error',
        description: 'Por favor completa todos los campos obligatorios'
      };
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: contraseña,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        rol: "especialista",
      },
    });

    if (authError || !authUser) {
      console.error("Error creando user en Auth:", authError);
      return {
        success: false,
        message: 'Error al crear usuario',
        toastType: 'error',
        description: authError?.message || 'No se pudo crear el usuario en el sistema de autenticación'
      };
    }

    // 2. Guardar en tabla usuario
    const especialistaData = {
      id_usuario: authUser.user.id,
      nombre,
      apellido,
      id_especialidad: null, 
      telefono: formData.get("telefono") as string || null,
      email,
      usuario: formData.get("usuario") as string,
      contraseña: contraseña,
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
      // Rollback: eliminar el usuario en Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error("Error creando especialista en tabla:", errorUsuario);
      return {
        success: false,
        message: 'Error al guardar especialista',
        toastType: 'error',
        description: 'No se pudo guardar la información en la base de datos'
      };
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
        // Rollback completo
        await supabase.from("usuario").delete().eq("id_usuario", nuevoUsuario.id_usuario);
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.error("Error asignando especialidades:", errorRelaciones);
        return {
          success: false,
          message: 'Error al asignar especialidades',
          toastType: 'error',
          description: 'No se pudieron asignar las especialidades seleccionadas'
        };
      }
    }

    revalidatePath("/especialista");
    
    return {
      success: true,
      message: 'Especialista creado exitosamente',
      toastType: 'success',
      description: `${nombre} ${apellido} ha sido agregado como especialista`
    };

  } catch (error) {
    console.error('Error en createEspecialista:', error);
    return {
      success: false,
      message: 'Error interno del servidor',
      toastType: 'error',
      description: 'Ocurrió un error inesperado. Intenta nuevamente.'
    };
  }
}

// Actualizar especialista con múltiples especialidades
export async function updateEspecialista(id: string, formData: FormData): Promise<ServerActionResponse> {
  try {
    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const email = formData.get("email") as string;

    // Validaciones básicas
    if (!nombre || !apellido || !email) {
      return {
        success: false,
        message: 'Campos requeridos faltantes',
        toastType: 'error',
        description: 'Por favor completa todos los campos obligatorios'
      };
    }

    const supabase = await createClient();

    // Verificar que el especialista existe
    const { data: especialistaExistente, error: errorVerificacion } = await supabase
      .from("usuario")
      .select("nombre, apellido")
      .eq("id_usuario", id)
      .eq("id_rol", 2)
      .single();

    if (errorVerificacion || !especialistaExistente) {
      return {
        success: false,
        message: 'Especialista no encontrado',
        toastType: 'error',
        description: 'El especialista que intentas actualizar no existe'
      };
    }

    // Obtener especialidades seleccionadas del FormData
    const especialidadesSeleccionadas: number[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('especialidades[')) {
        especialidadesSeleccionadas.push(Number(value));
      }
    }

    const updateData: EspecialistaUpdate = {
      nombre,
      apellido,
      email,
      usuario: formData.get("usuario") as string,
      telefono: formData.get("telefono") as string || null,
      color: formData.get("color") as string || null,
    };

    // Solo actualizar contraseña si se proporciona
    const contraseña = formData.get("contraseña") as string;
    if (contraseña && contraseña.trim() !== "") {
      updateData.contraseña = contraseña;
    }

    // Actualizar el usuario
    const { error: errorUsuario } = await supabase
      .from("usuario")
      .update(updateData)
      .eq("id_usuario", id)
      .eq("id_rol", 2);

    if (errorUsuario) {
      console.error("Error updating especialista:", errorUsuario);
      return {
        success: false,
        message: 'Error al actualizar especialista',
        toastType: 'error',
        description: 'No se pudo actualizar la información del especialista'
      };
    }

    // Eliminar relaciones existentes
    const { error: errorEliminar } = await supabase
      .from("usuario_especialidad")
      .delete()
      .eq("id_usuario", id);

    if (errorEliminar) {
      console.error("Error deleting existing relations:", errorEliminar);
      return {
        success: false,
        message: 'Error al actualizar especialidades',
        toastType: 'error',
        description: 'No se pudieron actualizar las especialidades'
      };
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
        return {
          success: false,
          message: 'Error al asignar especialidades',
          toastType: 'error',
          description: 'No se pudieron asignar las nuevas especialidades'
        };
      }
    }

    revalidatePath("/especialista");
    
    return {
      success: true,
      message: 'Especialista actualizado exitosamente',
      toastType: 'success',
      description: `Los datos de ${nombre} ${apellido} han sido actualizados`
    };

  } catch (error) {
    console.error('Error en updateEspecialista:', error);
    return {
      success: false,
      message: 'Error interno del servidor',
      toastType: 'error',
      description: 'Ocurrió un error inesperado. Intenta nuevamente.'
    };
  }
}

// Eliminar especialista
export async function deleteEspecialista(id: string): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient();

    // Verificar que el especialista existe y obtener su información
    const { data: especialista, error: errorVerificacion } = await supabase
      .from("usuario")
      .select("nombre, apellido, email")
      .eq("id_usuario", id)
      .eq("id_rol", 2)
      .single();

    if (errorVerificacion || !especialista) {
      return {
        success: false,
        message: 'Especialista no encontrado',
        toastType: 'error',
        description: 'El especialista que intentas eliminar no existe'
      };
    }

    const { error } = await supabase
      .from("usuario")
      .delete()
      .eq("id_usuario", id)
      .eq("id_rol", 2);

    if (error) {
      console.error("Error deleting especialista:", error);
      return {
        success: false,
        message: 'Error al eliminar especialista',
        toastType: 'error',
        description: 'No se pudo eliminar el especialista de la base de datos'
      };
    }

    revalidatePath("/especialista");
    
    return {
      success: true,
      message: 'Especialista eliminado exitosamente',
      toastType: 'success',
      description: `${especialista.nombre} ${especialista.apellido} ha sido eliminado del sistema`
    };

  } catch (error) {
    console.error('Error en deleteEspecialista:', error);
    return {
      success: false,
      message: 'Error interno del servidor',
      toastType: 'error',
      description: 'Ocurrió un error inesperado. Intenta nuevamente.'
    };
  }
}

// Obtener especialidades para el formulario
export async function getEspecialidades() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("especialidad")
      .select("*")
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

// Función auxiliar para toggle activo/inactivo
export async function toggleEspecialistaActivo(id: string, activo: boolean): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient();

    const { data: especialista, error: errorVerificacion } = await supabase
      .from("usuario")
      .select("nombre, apellido")
      .eq("id_usuario", id)
      .eq("id_rol", 2)
      .single();

    if (errorVerificacion || !especialista) {
      return {
        success: false,
        message: 'Especialista no encontrado',
        toastType: 'error',
        description: 'El especialista que intentas modificar no existe'
      };
    }

    const { error } = await supabase
      .from("usuario")
      .update({ activo })
      .eq("id_usuario", id)
      .eq("id_rol", 2);

    if (error) {
      console.error("Error toggling especialista status:", error);
      return {
        success: false,
        message: 'Error al cambiar estado',
        toastType: 'error',
        description: 'No se pudo cambiar el estado del especialista'
      };
    }

    revalidatePath("/especialista");
    
    return {
      success: true,
      message: `Especialista ${activo ? 'activado' : 'desactivado'} exitosamente`,
      toastType: 'success',
      description: `${especialista.nombre} ${especialista.apellido} ahora está ${activo ? 'activo' : 'inactivo'}`
    };

  } catch (error) {
    console.error('Error en toggleEspecialistaActivo:', error);
    return {
      success: false,
      message: 'Error interno del servidor',
      toastType: 'error',
      description: 'Ocurrió un error inesperado. Intenta nuevamente.'
    };
  }
}