"use server";

import { supabaseAdmin } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import { ROLES_ESPECIALISTAS } from "@/lib/constants/roles";

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
export async function getEspecialistas({ incluirInactivos = false } = {}) {
  try {
    const supabase = await createClient();
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // ✅ NUEVO MODELO: Consultar usuario_organizacion en lugar de usuario directamente
    let query = supabase
      .from("usuario_organizacion")
      .select(`
        id_usuario_organizacion,
        color_calendario,
        activo,
        usuario:id_usuario(
          id_usuario,
          nombre,
          apellido,
          email,
          telefono,
          color
        ),
        rol:id_rol(
          id,
          nombre
        )
      `)
      .eq("id_organizacion", orgId)
      .in("id_rol", ROLES_ESPECIALISTAS); // Admin (1) y Especialistas (2)

    if (!incluirInactivos) {
      query = query.eq("activo", true);
    }

    const { data: usuariosOrg, error } = await query;

    if (error) {
      console.error("Error fetching especialistas:", error);
      throw new Error("Error al obtener especialistas");
    }

    // Obtener especialidades de cada usuario EN ESTA ORGANIZACIÓN
    const especialistasConEspecialidades = await Promise.all(
      (usuariosOrg || []).map(async (usuarioOrg) => {
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
          .eq("id_usuario_organizacion", usuarioOrg.id_usuario_organizacion)
          .eq("activo", true);

        return {
          id_usuario: usuarioOrg.usuario?.id_usuario,
          id_usuario_organizacion: usuarioOrg.id_usuario_organizacion,
          nombre: usuarioOrg.usuario?.nombre,
          apellido: usuarioOrg.usuario?.apellido,
          email: usuarioOrg.usuario?.email,
          telefono: usuarioOrg.usuario?.telefono,
          color: usuarioOrg.usuario?.color, // ✅ Color del especialista individual, no de la org
          activo: usuarioOrg.activo,
          id_rol: usuarioOrg.rol?.id,
          rol: usuarioOrg.rol,
          especialidades: especialidades?.map(e => ({
            ...e.especialidad,
            precio_particular: e.precio_particular,
            precio_obra_social: e.precio_obra_social
          })).filter(e => e.id_especialidad) || [],
          usuario_especialidad: especialidades || []
        };
      })
    );

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
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();
    
    // ✅ NUEVO MODELO: Buscar en usuario_organizacion
    const { data: usuarioOrg, error } = await supabase
      .from("usuario_organizacion")
      .select(`
        id_usuario_organizacion,
        color_calendario,
        activo,
        usuario:id_usuario(
          id_usuario,
          nombre,
          apellido,
          email,
          telefono,
          color
        ),
        rol:id_rol(
          id,
          nombre
        )
      `)
      .eq("id_usuario", id)
      .eq("id_organizacion", orgId)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .single();

    if (error) {
      console.error("Error fetching especialista:", error);
      throw new Error("Error al obtener especialista");
    }

    // Obtener especialidades de este usuario EN ESTA ORGANIZACIÓN
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
      .eq("id_usuario_organizacion", usuarioOrg.id_usuario_organizacion)
      .eq("activo", true);

    // Transformar los datos incluyendo precios
    const especialistaConEspecialidades = {
      id_usuario: usuarioOrg.usuario?.id_usuario,
      id_usuario_organizacion: usuarioOrg.id_usuario_organizacion,
      nombre: usuarioOrg.usuario?.nombre,
      apellido: usuarioOrg.usuario?.apellido,
      email: usuarioOrg.usuario?.email,
      telefono: usuarioOrg.usuario?.telefono,
      color: usuarioOrg.usuario?.color, // ✅ Color del especialista individual
      activo: usuarioOrg.activo,
      id_rol: usuarioOrg.rol?.id,
      rol: usuarioOrg.rol,
      especialidades: especialidades?.map(e => ({
        ...e.especialidad,
        precio_particular: e.precio_particular,
        precio_obra_social: e.precio_obra_social
      })).filter(e => e.id_especialidad) || [],
      usuario_especialidad: especialidades || []
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
    const supabase = await createClient();
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    const email = formData.get("email") as string;
    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const contraseña = formData.get("contraseña") as string;
    const color = formData.get("color") as string || null;

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

    // 2. Guardar en tabla usuario (incluyendo color)
    const especialistaData = {
      id_usuario: authUser.user.id,
      nombre,
      apellido,
      telefono: formData.get("telefono") as string || null,
      email,
      color, // ✅ Guardar color del especialista
      contraseña: '**AUTH**', // Placeholder, usa Supabase Auth
    };

    const { data: nuevoUsuario, error: errorUsuario } = await supabase
      .from("usuario")
      .insert(especialistaData)
      .select()
      .single();

    if (errorUsuario) {
      // Rollback: eliminar el usuario en Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error("Error creando especialista en tabla usuario:", errorUsuario);
      return {
        success: false,
        message: 'Error al guardar especialista',
        toastType: 'error',
        description: 'No se pudo guardar la información en la base de datos'
      };
    }

    // ✅ 3. NUEVO MODELO: Crear relación en usuario_organizacion
    const { data: usuarioOrg, error: errorUsuarioOrg } = await supabase
      .from("usuario_organizacion")
      .insert({
        id_usuario: nuevoUsuario.id_usuario,
        id_organizacion: orgId,
        id_rol: 2, // Rol Especialista
        activo: true,
        color_calendario: color
      })
      .select()
      .single();

    if (errorUsuarioOrg || !usuarioOrg) {
      // Rollback: eliminar usuario y auth
      await supabase.from("usuario").delete().eq("id_usuario", nuevoUsuario.id_usuario);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error("Error creando relación usuario_organizacion:", errorUsuarioOrg);
      return {
        success: false,
        message: 'Error al vincular con organización',
        toastType: 'error',
        description: 'No se pudo vincular el especialista con la organización'
      };
    }

    // ✅ 4. NUEVO MODELO: Relacionar especialidades con id_usuario_organizacion y precios
    const especialidadesSeleccionadas: number[] = [];
    const preciosPorEspecialidad: Record<number, { particular: number; obraSocial: number }> = {};
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('especialidades[')) {
        especialidadesSeleccionadas.push(Number(value));
      } else if (key.startsWith('precios[')) {
        // Extraer: precios[1][particular] o precios[1][obraSocial]
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
          id_usuario_organizacion: usuarioOrg.id_usuario_organizacion, // ✅ CLAVE
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
        await supabase.from("usuario_organizacion").delete().eq("id_usuario_organizacion", usuarioOrg.id_usuario_organizacion);
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
    revalidatePath("/especialistas");
    
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
    const supabase = await createClient();
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const email = formData.get("email") as string;
    const color = formData.get("color") as string || null;

    // Validaciones básicas
    if (!nombre || !apellido || !email) {
      return {
        success: false,
        message: 'Campos requeridos faltantes',
        toastType: 'error',
        description: 'Por favor completa todos los campos obligatorios'
      };
    }

    // ✅ NUEVO MODELO: Verificar que el especialista existe en la organización
    const { data: usuarioOrg, error: errorVerificacion } = await supabase
      .from("usuario_organizacion")
      .select("id_usuario_organizacion, usuario:id_usuario(nombre, apellido)")
      .eq("id_usuario", id)
      .eq("id_organizacion", orgId)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .single();

    if (errorVerificacion || !usuarioOrg) {
      return {
        success: false,
        message: 'Especialista no encontrado',
        toastType: 'error',
        description: 'El especialista que intentas actualizar no existe en esta organización'
      };
    }

    // Obtener especialidades seleccionadas y precios del FormData
    const especialidadesSeleccionadas: number[] = [];
    const preciosPorEspecialidad: Record<number, { particular: number; obraSocial: number }> = {};
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('especialidades[')) {
        especialidadesSeleccionadas.push(Number(value));
      } else if (key.startsWith('precios[')) {
        // Extraer: precios[1][particular] o precios[1][obraSocial]
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

    const updateData: EspecialistaUpdate = {
      nombre,
      apellido,
      email,
      telefono: formData.get("telefono") as string || null,
      color, // ✅ Actualizar color del especialista
    };

    // Solo actualizar contraseña si se proporciona
    const contraseña = formData.get("contraseña") as string;
    const passwordPatch = contraseña && contraseña.trim() !== "" ? { contraseña: '**AUTH**' } : {}; // Placeholder

    // Si se proporciona una nueva contraseña, actualizarla en Supabase Auth primero
    if (contraseña && contraseña.trim() !== "") {
      // Verificar si el usuario existe en Auth
      const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);
      
      if (getUserError || !authUser) {
        console.error("Usuario no encontrado en Auth:", getUserError);
        // El usuario no existe en Auth, pero continuamos actualizando solo en la tabla
        console.log("Continuando con actualización solo en tabla usuario (usuario no existe en Auth)");
      } else {
        // Usuario existe en Auth, actualizar contraseña
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          { password: contraseña }
        );

        if (authError) {
          console.error("Error updating password in Auth:", authError);
          return {
            success: false,
            message: 'Error al actualizar contraseña',
            toastType: 'error',
            description: 'No se pudo actualizar la contraseña en el sistema de autenticación'
          };
        }
      }
    }

    // Actualizar el usuario en la tabla
    const { error: errorUsuario } = await supabase
      .from("usuario")
      .update({ ...updateData, ...passwordPatch })
      .eq("id_usuario", id);

    if (errorUsuario) {
      console.error("Error updating especialista:", errorUsuario);
      return {
        success: false,
        message: 'Error al actualizar especialista',
        toastType: 'error',
        description: 'No se pudo actualizar la información del especialista'
      };
    }

    // ✅ NUEVO MODELO: Actualizar color en usuario_organizacion
    if (color) {
      const { error: errorColor } = await supabase
        .from("usuario_organizacion")
        .update({ color_calendario: color })
        .eq("id_usuario_organizacion", usuarioOrg.id_usuario_organizacion);

      if (errorColor) {
        console.error("Error updating calendar color:", errorColor);
        // No es crítico, continuar
      }
    }

    // ✅ NUEVO MODELO: Eliminar relaciones existentes por id_usuario_organizacion
    const { error: errorEliminar } = await supabase
      .from("usuario_especialidad")
      .delete()
      .eq("id_usuario_organizacion", usuarioOrg.id_usuario_organizacion);

    if (errorEliminar) {
      console.error("Error deleting existing relations:", errorEliminar);
      return {
        success: false,
        message: 'Error al actualizar especialidades',
        toastType: 'error',
        description: 'No se pudieron actualizar las especialidades'
      };
    }

    // ✅ NUEVO MODELO: Crear nuevas relaciones con id_usuario_organizacion y precios
    if (especialidadesSeleccionadas.length > 0) {
      const relacionesEspecialidades = especialidadesSeleccionadas.map(idEspecialidad => {
        const precios = preciosPorEspecialidad[idEspecialidad] || { particular: 0, obraSocial: 0 };
        return {
          id_usuario: id,
          id_usuario_organizacion: usuarioOrg.id_usuario_organizacion, // ✅ CLAVE
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
        console.error("Error creating new relations:", errorRelaciones);
        return {
          success: false,
          message: 'Error al asignar especialidades',
          toastType: 'error',
          description: 'No se pudieron asignar las nuevas especialidades'
        };
      }
    }

    revalidatePath("/especialistas");
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

// Función auxiliar para toggle activo/inactivo
export async function toggleEspecialistaActivo(id: string, activo: boolean): Promise<ServerActionResponse> {
  try {
    const supabase = await createClient();
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // ✅ NUEVO MODELO: Verificar que existe en la organización
    const { data: usuarioOrg, error: errorVerificacion } = await supabase
      .from("usuario_organizacion")
      .select("id_usuario_organizacion, usuario:id_usuario(nombre, apellido)")
      .eq("id_usuario", id)
      .eq("id_organizacion", orgId)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .single();

    if (errorVerificacion || !usuarioOrg) {
      return {
        success: false,
        message: 'Especialista no encontrado',
        toastType: 'error',
        description: 'El especialista que intentas modificar no existe en esta organización'
      };
    }

    // ✅ NUEVO MODELO: Actualizar estado en usuario_organizacion (no en usuario)
    const { error } = await supabase
      .from("usuario_organizacion")
      .update({ activo })
      .eq("id_usuario_organizacion", usuarioOrg.id_usuario_organizacion);

    if (error) {
      console.error("Error toggling especialista status:", error);
      return {
        success: false,
        message: 'Error al cambiar estado',
        toastType: 'error',
        description: 'No se pudo cambiar el estado del especialista'
      };
    }

    revalidatePath("/especialistas");
    
    // @ts-ignore - usuarioOrg.usuario es el join con nombre/apellido
    const usuario = usuarioOrg.usuario;
    
    return {
      success: true,
      message: `Especialista ${activo ? 'activado' : 'inactivado'} exitosamente`,
      toastType: 'success',
      description: `${usuario?.nombre || ''} ${usuario?.apellido || ''} ahora está ${activo ? 'activo' : 'inactivo'}`
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

// interface PerfilCompleto {
//   id_usuario: string;
//   nombre: string;
//   apellido: string;
//   email: string;
//   telefono: string | null;
//   color: string | null;
//   rol: {
//     id: number;
//     nombre: string;
//     jerarquia: number;
//   };
//   especialidad_principal: {
//     id_especialidad: number;
//     nombre: string;
//     precio_particular?: number | null;
//     precio_obra_social?: number | null;
    
//   } | null;
//   especialidades_adicionales: Array<{
//     id_especialidad: number;
//     nombre: string;
//     precio_particular?: number | null;
//     precio_obra_social?: number | null;
//   }>;
// }

import { PerfilCompleto } from "./perfil.action";

// obtener perfil de especialista
export async function getPerfilEspecialista(id_especialista: string): Promise<PerfilCompleto | null> {
  try {
    const supabase = await createClient();
    
    // ✅ MULTI-ORG: Obtener contexto organizacional
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // ✅ 1. NUEVO MODELO: Obtener usuario_organizacion con rol y color
    const { data: usuarioOrg, error: userOrgError } = await supabase
      .from('usuario_organizacion')
      .select(`
        id_usuario_organizacion,
        color_calendario,
        usuario:id_usuario (
          id_usuario,
          nombre,
          apellido,
          email,
          telefono
        ),
        rol:id_rol (
          id,
          nombre,
          jerarquia
        )
      `)
      .eq('id_usuario', id_especialista)
      .eq('id_organizacion', orgId)
      .single();

      if (userOrgError || !usuarioOrg) {
        console.error('Error consultando usuario_organizacion:', userOrgError);
        throw new Error(`No se pudo obtener el perfil: ${userOrgError?.message || 'Usuario no encontrado en la organización'}`);
      }

      // @ts-ignore - usuario y rol son joins
      const usuario = usuarioOrg.usuario;
      const rol = usuarioOrg.rol;

      // ✅ 2. NUEVO MODELO: Obtener especialidades por id_usuario_organizacion
      const { data: especialidadesData, error: especialidadesError } = await supabase
        .from('usuario_especialidad')
        .select(`
          precio_particular,
          precio_obra_social,
          especialidad:id_especialidad (
            id_especialidad,
            nombre
          )
        `)
        .eq('id_usuario_organizacion', usuarioOrg.id_usuario_organizacion)
        .eq('activo', true);

      // 3. Procesar especialidades con precios
      const especialidadesAdicionales = especialidadesError
        ? []
        : (especialidadesData || [])
            .map(item => ({
              // @ts-ignore
              id_especialidad: item.especialidad?.id_especialidad,
              // @ts-ignore
              nombre: item.especialidad?.nombre,
              precio_particular: item.precio_particular,
              precio_obra_social: item.precio_obra_social
            }))
            .filter(esp => esp.id_especialidad); // Filtrar elementos válidos

      // Primera especialidad como principal
      const especialidadPrincipalConPrecios = especialidadesAdicionales[0] || null;

      // ✅ 4. Combinar datos con nuevo modelo
      const perfil: PerfilCompleto = {
      id_usuario: usuario?.id_usuario,
      nombre: usuario?.nombre,
      apellido: usuario?.apellido,
      email: usuario?.email,
      telefono: usuario?.telefono,
      color: usuarioOrg.color_calendario, // ✅ Ahora viene de usuario_organizacion
      rol: {
        id: rol?.id || 1,
        nombre: rol?.nombre || 'usuario',
        jerarquia: rol?.jerarquia || 1
      },
      especialidad_principal: especialidadPrincipalConPrecios,
      especialidades_adicionales: especialidadesAdicionales
    };        

    return perfil;

  } catch (error) {
    console.error('Error en getPerfilEspecialista:', error);
    return null;
  }
}
