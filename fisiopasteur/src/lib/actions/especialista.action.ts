"use server";

import { createClient } from "@/lib/supabase/server";
const supabaseAdmin = require("@/lib/supabase/service-role").supabaseAdmin;
const { revalidatePath } = require("next/cache");
import type { ActionResult } from "@/lib/actions/action-result";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import { ROLES_ESPECIALISTAS } from "@/lib/constants/roles";

type Especialista = Tables<"usuario">;
type EspecialistaInsert = TablesInsert<"usuario">;
type EspecialistaUpdate = TablesUpdate<"usuario">;
type UsuarioEspecialidad = Tables<"usuario_especialidad">;

// Obtener todos los especialistas con sus especialidades
export async function getEspecialistas({ incluirInactivos = false } = {}): Promise<
  | { success: true; data: any[] }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("usuario")
      .select(`
        id_usuario,
        nombre,
        apellido,
        email,
        telefono,
        color,
        activo,
        id_rol,
        rol:id_rol(
          id,
          nombre
        )
      `)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .order("nombre", { ascending: true })
      .order("apellido", { ascending: true });

    if (!incluirInactivos) {
      query = query.eq("activo", true);
    }

    const { data: usuarios, error } = await query;

    if (error) {
      console.error("Error fetching especialistas:", error);
      return { success: false, error: "Error al obtener especialistas" };
    }

    if (!usuarios || usuarios.length === 0) {
      return { success: true, data: [] };
    }

    // Una sola query para obtener TODAS las especialidades de TODOS los especialistas
    const usuariosIds = usuarios.map((u: any) => u.id_usuario);

    const { data: todasEspecialidades } = await supabase
      .from("usuario_especialidad")
      .select(`
        id_usuario,
        precio_particular,
        precio_obra_social,
        activo,
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      `)
      .in("id_usuario", usuariosIds)
      .eq("activo", true);

    // Agrupar especialidades por id_usuario
    const especialidadesPorUsuario = (todasEspecialidades || []).reduce((acc, item: any) => {
      if (!acc[item.id_usuario]) {
        acc[item.id_usuario] = [];
      }
      acc[item.id_usuario].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const especialistasConEspecialidades = (usuarios as any[]).map((usuario: any) => {
      const especialidades = especialidadesPorUsuario[usuario.id_usuario] || [];

      return {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono,
        color: usuario.color,
        activo: usuario.activo,
        id_rol: usuario.id_rol,
        rol: usuario.rol,
        especialidades: especialidades.map((e: any) => ({
          ...e.especialidad,
          precio_particular: e.precio_particular,
          precio_obra_social: e.precio_obra_social
        })).filter((e: any) => e.id_especialidad),
        usuario_especialidad: especialidades
      };
    });

    return { success: true, data: especialistasConEspecialidades };
  } catch (error) {
    console.error('Error en getEspecialistas:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// Obtener un especialista por ID con sus especialidades
export async function getEspecialista(id: string): Promise<
  | { success: true; data: any }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const { data: usuario, error } = await supabase
      .from("usuario")
      .select(`
        id_usuario,
        nombre,
        apellido,
        email,
        telefono,
        color,
        activo,
        id_rol,
        rol:id_rol(
          id,
          nombre
        )
      `)
      .eq("id_usuario", id)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .single();

    if (error) {
      console.error("Error fetching especialista:", error);
      return { success: false, error: "Error al obtener especialista" };
    }

    const { data: especialidades } = await supabase
      .from("usuario_especialidad")
      .select(`
        precio_particular,
        precio_obra_social,
        activo,
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      `)
      .eq("id_usuario", id)
      .eq("activo", true);

    const especialistaConEspecialidades = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      color: usuario.color,
      activo: usuario.activo,
      id_rol: (usuario as any).id_rol,
      rol: (usuario as any).rol,
      especialidades: especialidades?.map((e: any) => ({
        ...e.especialidad,
        precio_particular: e.precio_particular,
        precio_obra_social: e.precio_obra_social
      })).filter((e: any) => e.id_especialidad) || [],
      usuario_especialidad: especialidades || []
    };

    return { success: true, data: especialistaConEspecialidades };
  } catch (error) {
    console.error('Error en getEspecialista:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// Crear especialista con múltiples especialidades
export async function createEspecialista(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const contraseña = formData.get("contraseña") as string;
    const color = formData.get("color") as string || null;

    // Validaciones básicas
    if (!email || !nombre || !apellido || !contraseña) {
      return {
        success: false,
        error: 'Por favor completa todos los campos obligatorios'
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
        error: authError?.message || 'No se pudo crear el usuario en el sistema de autenticación'
      };
    }

    // 2. Guardar en tabla usuario (con id_rol = 2 = Especialista)
    const especialistaData = {
      id_usuario: authUser.user.id,
      nombre,
      apellido,
      telefono: formData.get("telefono") as string || null,
      email,
      color,
      contraseña: '**AUTH**',
      id_rol: 2, // Rol Especialista
      activo: true,
    };

    const { data: nuevoUsuario, error: errorUsuario } = await supabase
      .from("usuario")
      .insert(especialistaData)
      .select()
      .single();

    if (errorUsuario) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error("Error creando especialista en tabla usuario:", errorUsuario);
      return {
        success: false,
        error: 'No se pudo guardar la información en la base de datos'
      };
    }

    // 3. Relacionar especialidades con id_usuario y precios
    const especialidadesSeleccionadas: number[] = [];
    const preciosPorEspecialidad: Record<number, { particular: number; obraSocial: number }> = {};

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('especialidades[')) {
        especialidadesSeleccionadas.push(Number(value));
      } else if (key.startsWith('precios[')) {
        const match = key.match(/precios\[(\d+)\]\[(particular|obraSocial)\]/);
        if (match) {
          const especialidadId = Number(match[1]);
          const tipo = match[2];
          if (!preciosPorEspecialidad[especialidadId]) {
            preciosPorEspecialidad[especialidadId] = { particular: 0, obraSocial: 0 };
          }
          preciosPorEspecialidad[especialidadId][tipo as 'particular' | 'obraSocial'] = Number(value) || 0;
        }
      }
    }

    if (especialidadesSeleccionadas.length > 0) {
      const relacionesEspecialidades = especialidadesSeleccionadas.map(idEspecialidad => {
        const precios = preciosPorEspecialidad[idEspecialidad] || { particular: 0, obraSocial: 0 };
        return {
          id_usuario: nuevoUsuario.id_usuario,
          id_especialidad: idEspecialidad,
          precio_particular: precios.particular,
          precio_obra_social: precios.obraSocial,
          activo: true
        };
      });

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
          error: 'No se pudieron asignar las especialidades seleccionadas'
        };
      }
    }

    revalidatePath("/especialista");
    revalidatePath("/especialistas");

    return {
      success: true
    };

  } catch (error) {
    console.error('Error en createEspecialista:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado. Intenta nuevamente.'
    };
  }
}

// Actualizar especialista con múltiples especialidades
export async function updateEspecialista(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const email = formData.get("email") as string;
    const color = formData.get("color") as string || null;

    // Validaciones básicas
    if (!nombre || !apellido || !email) {
      return {
        success: false,
        error: 'Por favor completa todos los campos obligatorios'
      };
    }

    // Obtener especialidades seleccionadas y precios del FormData
    const especialidadesSeleccionadas: number[] = [];
    const preciosPorEspecialidad: Record<number, { particular: number; obraSocial: number }> = {};

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('especialidades[')) {
        especialidadesSeleccionadas.push(Number(value));
      } else if (key.startsWith('precios[')) {
        const match = key.match(/precios\[(\d+)\]\[(particular|obraSocial)\]/);
        if (match) {
          const especialidadId = Number(match[1]);
          const tipo = match[2];
          if (!preciosPorEspecialidad[especialidadId]) {
            preciosPorEspecialidad[especialidadId] = { particular: 0, obraSocial: 0 };
          }
          preciosPorEspecialidad[especialidadId][tipo as 'particular' | 'obraSocial'] = Number(value) || 0;
        }
      }
    }

    console.log("Especialidades seleccionadas:", especialidadesSeleccionadas);
    console.log("Precios por especialidad:", preciosPorEspecialidad);

    const updateData: EspecialistaUpdate = {
      nombre,
      apellido,
      email,
      telefono: formData.get("telefono") as string || null,
      color,
    };

    // Si se proporciona una nueva contraseña, actualizarla en Supabase Auth primero
    const contraseña = formData.get("contraseña") as string;
    if (contraseña && contraseña.trim() !== "") {
      const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);

      if (getUserError || !authUser) {
        console.error("Usuario no encontrado en Auth:", getUserError);
        console.log("Continuando con actualización solo en tabla usuario");
      } else {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          { password: contraseña }
        );

        if (authError) {
          console.error("Error updating password in Auth:", authError);
          return {
            success: false,
            error: 'No se pudo actualizar la contraseña en el sistema de autenticación'
          };
        }
      }
    }

    // Actualizar el usuario en la tabla
    const { error: errorUsuario } = await supabase
      .from("usuario")
      .update(updateData)
      .eq("id_usuario", id);

    if (errorUsuario) {
      console.error("Error updating especialista:", errorUsuario);

      if (errorUsuario.code === '23505' || errorUsuario.message?.includes('duplicate') || errorUsuario.message?.includes('email')) {
        return {
          success: false,
          error: 'El email ya está en uso. Por favor, usa otro correo electrónico.'
        };
      }

      return {
        success: false,
        error: 'No se pudo actualizar la información del especialista'
      };
    }

    // Obtener especialidades actuales del usuario
    const { data: especialidadesActuales, error: errorConsulta } = await supabase
      .from("usuario_especialidad")
      .select("id_especialidad")
      .eq("id_usuario", id)
      .eq("activo", true);

    if (errorConsulta) {
      console.error("Error consultando especialidades actuales:", errorConsulta);
      return {
        success: false,
        error: 'No se pudieron consultar las especialidades actuales'
      };
    }

    const idsActuales = (especialidadesActuales || []).map((e: any) => e.id_especialidad);
    const idsNuevos = especialidadesSeleccionadas;

    // Calcular diferencias
    const idsAEliminar = idsActuales.filter((id: number) => !idsNuevos.includes(id));
    const idsAAgregar = idsNuevos.filter((id: number) => !idsActuales.includes(id));

    console.log("Especialidades a eliminar:", idsAEliminar);
    console.log("Especialidades a agregar:", idsAAgregar);

    // Eliminar solo las especialidades que fueron removidas
    if (idsAEliminar.length > 0) {
      const { error: errorEliminar } = await supabase
        .from("usuario_especialidad")
        .delete()
        .eq("id_usuario", id)
        .in("id_especialidad", idsAEliminar);

      if (errorEliminar) {
        console.error("Error eliminando especialidades:", errorEliminar);
        return {
          success: false,
          error: 'No se pudieron eliminar las especialidades removidas'
        };
      }
    }

    // Agregar solo las especialidades nuevas
    if (idsAAgregar.length > 0) {
      const relacionesNuevas = idsAAgregar.map(idEspecialidad => {
        const precios = preciosPorEspecialidad[idEspecialidad] || { particular: 0, obraSocial: 0 };
        return {
          id_usuario: id,
          id_especialidad: idEspecialidad,
          precio_particular: precios.particular,
          precio_obra_social: precios.obraSocial,
          activo: true
        };
      });

      const { error: errorAgregar } = await supabase
        .from("usuario_especialidad")
        .insert(relacionesNuevas);

      if (errorAgregar) {
        console.error("Error agregando especialidades:", errorAgregar);
        return {
          success: false,
          error: 'No se pudieron agregar las nuevas especialidades'
        };
      }
    }

    revalidatePath("/especialistas");
    revalidatePath("/especialista");

    return {
      success: true
    };

  } catch (error) {
    console.error('Error en updateEspecialista:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado. Intenta nuevamente.'
    };
  }
}

// Función auxiliar para toggle activo/inactivo
export async function toggleEspecialistaActivo(id: string, activo: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: usuario, error: errorVerificacion } = await supabase
      .from("usuario")
      .select("id_usuario, nombre, apellido")
      .eq("id_usuario", id)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .single();

    if (errorVerificacion || !usuario) {
      return {
        success: false,
        error: 'El especialista que intentas modificar no existe'
      };
    }

    const { error } = await supabase
      .from("usuario")
      .update({ activo })
      .eq("id_usuario", id);

    if (error) {
      console.error("Error toggling especialista status:", error);
      return {
        success: false,
        error: 'No se pudo cambiar el estado del especialista'
      };
    }

    revalidatePath("/especialistas");

    return {
      success: true
    };

  } catch (error) {
    console.error('Error en toggleEspecialistaActivo:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado. Intenta nuevamente.'
    };
  }
}

// DEPRECADO: Usar getEspecialidades de especialidad.action.ts
export async function getEspecialidadesLegacy() {
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

import { PerfilCompleto } from "./perfil.action";

// obtener perfil de especialista
export async function getPerfilEspecialista(id_especialista: string): Promise<
  | { success: true; data: PerfilCompleto }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const { data: usuario, error: userError } = await supabase
      .from('usuario')
      .select(`
        id_usuario,
        nombre,
        apellido,
        email,
        telefono,
        color,
        activo,
        id_rol,
        rol:id_rol(
          id,
          nombre,
          jerarquia
        )
      `)
      .eq('id_usuario', id_especialista)
      .single();

    if (userError || !usuario) {
      console.error('Error consultando usuario:', userError);
      return { success: false, error: `No se pudo obtener el perfil: ${userError?.message || 'Usuario no encontrado'}` };
    }

    const { data: especialidadesData, error: especialidadesError } = await supabase
      .from('usuario_especialidad')
      .select(`
        precio_particular,
        precio_obra_social,
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      `)
      .eq('id_usuario', id_especialista)
      .eq('activo', true);

    const especialidadesAdicionales = especialidadesError
      ? []
      : (especialidadesData || [])
          .map((item: any) => ({
            id_especialidad: item.especialidad?.id_especialidad,
            nombre: item.especialidad?.nombre,
            precio_particular: item.precio_particular,
            precio_obra_social: item.precio_obra_social
          }))
          .filter(esp => esp.id_especialidad);

    const especialidadPrincipalConPrecios = especialidadesAdicionales[0] || null;

    const rol = (usuario as any).rol;

    const perfil: PerfilCompleto = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      color: usuario.color,
      rol: {
        id: rol?.id || 1,
        nombre: rol?.nombre || 'usuario',
        jerarquia: rol?.jerarquia || 1
      },
      especialidad_principal: especialidadPrincipalConPrecios,
      especialidades_adicionales: especialidadesAdicionales
    };

    return { success: true, data: perfil };

  } catch (error) {
    console.error('Error en getPerfilEspecialista:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}
