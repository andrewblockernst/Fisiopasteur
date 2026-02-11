"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { OrganizacionContext, UsuarioConOrganizaciones } from "@/types/extended-database.types";

/**
 * Cookie name para almacenar la organización actual del usuario
 */
const ORG_COOKIE_NAME = "org_actual";

/**
 * Obtiene todas las organizaciones activas de un usuario
 * @param usuarioId - ID del usuario autenticado
 * @returns Lista de organizaciones con sus roles
 */
export async function getOrganizacionesUsuario(
  usuarioId: string
): Promise<{ success: boolean; data?: UsuarioConOrganizaciones; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuario")
      .select(`
        id_usuario,
        nombre,
        apellido,
        email,
        usuario_organizacion!inner(
          id_usuario_organizacion,
          id_organizacion,
          id_rol,
          activo,
          color_calendario,
          fecha_asignacion,
          organizacion:id_organizacion(
            id_organizacion,
            nombre,
            activo
          ),
          rol:id_rol(
            id,
            nombre,
            jerarquia
          )
        )
      `)
      .eq("id_usuario", usuarioId)
      .eq("usuario_organizacion.activo", true)
      .single();

    if (usuarioError) {
      console.error("Error obteniendo organizaciones del usuario:", usuarioError);
      return { success: false, error: usuarioError.message };
    }

    if (!usuario) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Transformar la estructura de datos
    const usuarioConOrgs: UsuarioConOrganizaciones = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      organizaciones: Array.isArray(usuario.usuario_organizacion)
        ? usuario.usuario_organizacion.map((uo: any) => ({
            id_usuario_organizacion: uo.id_usuario_organizacion,
            id_organizacion: uo.id_organizacion,
            id_rol: uo.id_rol,
            activo: uo.activo,
            color_calendario: uo.color_calendario,
            fecha_asignacion: uo.fecha_asignacion,
            organizacion: uo.organizacion,
            rol: uo.rol,
          }))
        : [],
    };

    return { success: true, data: usuarioConOrgs };
  } catch (error) {
    console.error("Error inesperado en getOrganizacionesUsuario:", error);
    return { success: false, error: "Error inesperado al obtener organizaciones" };
  }
}

/**
 * Obtiene la organización actualmente seleccionada por el usuario
 * Primero busca en cookies, si no hay, busca la primera activa del usuario
 * @param usuarioId - ID del usuario autenticado
 * @returns Contexto de la organización actual
 */
export async function getOrganizacionActual(
  usuarioId: string
): Promise<{ success: boolean; data?: OrganizacionContext; error?: string; requiresSelection?: boolean }> {
  try {
    const cookieStore = await cookies();
    const orgIdCookie = cookieStore.get(ORG_COOKIE_NAME)?.value;

    // Si hay una org guardada en cookie, validar que el usuario tiene acceso
    if (orgIdCookie) {
      const supabase = await createClient();
      
      const { data: usuarioOrg, error } = await supabase
        .from("usuario_organizacion")
        .select(`
          organizacion:id_organizacion(
            id_organizacion,
            nombre,
            telefono_contacto,
            email_contacto,
            cuit_cuil
          )
        `)
        .eq("id_usuario", usuarioId)
        .eq("id_organizacion", orgIdCookie)
        .eq("activo", true)
        .single();

      if (!error && usuarioOrg?.organizacion) {
        return {
          success: true,
          data: usuarioOrg.organizacion as any as OrganizacionContext,
        };
      }
    }

    // Si no hay cookie o no es válida, obtener todas las organizaciones del usuario
    const orgsResult = await getOrganizacionesUsuario(usuarioId);

    if (!orgsResult.success || !orgsResult.data) {
      return { success: false, error: "Usuario no tiene organizaciones asignadas" };
    }

    const organizaciones = orgsResult.data.organizaciones;

    if (organizaciones.length === 0) {
      return { success: false, error: "Usuario no tiene organizaciones activas" };
    }

    // Si tiene una sola organización, setearla automáticamente
    if (organizaciones.length === 1) {
      const org = organizaciones[0].organizacion;
      await setOrganizacionActual(org.id_organizacion);
      
      return {
        success: true,
        data: {
          id_organizacion: org.id_organizacion,
          nombre: org.nombre,
          telefono_contacto: null,
          email_contacto: null,
          cuit_cuil: null,
        },
      };
    }

    // Si tiene múltiples organizaciones, indicar que necesita selección
    return {
      success: false,
      requiresSelection: true,
      error: "El usuario tiene múltiples organizaciones. Debe seleccionar una.",
    };
  } catch (error) {
    console.error("Error inesperado en getOrganizacionActual:", error);
    return { success: false, error: "Error inesperado al obtener organización actual" };
  }
}

/**
 * Establece la organización actual del usuario en una cookie
 * @param orgId - ID de la organización a establecer
 */
export async function setOrganizacionActual(orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    
    // Setear cookie con la organización (expira en 30 días)
    cookieStore.set(ORG_COOKIE_NAME, orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: "/",
    });

    // ✅ Actualizar JWT con org_id para optimización del middleware
    try {
      await supabase.auth.updateUser({
        data: { org_actual: orgId }
      });
    } catch (jwtError) {
      console.error("Error al actualizar JWT con org_id:", jwtError);
      // No fallar toda la operación si falla la actualización del JWT
    }

    return { success: true };
  } catch (error) {
    console.error("Error al establecer organización actual:", error);
    return { success: false, error: "Error al establecer organización" };
  }
}

/**
 * Limpia la cookie de organización actual
 * Útil para logout o cambio de contexto
 */
export async function clearOrganizacionActual(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    
    cookieStore.delete(ORG_COOKIE_NAME);
    
    // ✅ Limpiar org_actual del JWT
    try {
      await supabase.auth.updateUser({
        data: { org_actual: null }
      });
    } catch (jwtError) {
      console.error("Error al limpiar JWT org_id:", jwtError);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error al limpiar organización actual:", error);
    return { success: false };
  }
}

/**
 * Verifica si un usuario tiene acceso a una organización específica
 * @param usuarioId - ID del usuario
 * @param orgId - ID de la organización
 * @returns true si el usuario tiene acceso activo
 */
export async function verificarAccesoOrganizacion(
  usuarioId: string,
  orgId: string
): Promise<{ success: boolean; hasAccess: boolean; rol?: { id: number; nombre: string; jerarquia: number } }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("usuario_organizacion")
      .select(`
        activo,
        rol:id_rol(
          id,
          nombre,
          jerarquia
        )
      `)
      .eq("id_usuario", usuarioId)
      .eq("id_organizacion", orgId)
      .eq("activo", true)
      .single();

    if (error || !data) {
      return { success: true, hasAccess: false };
    }

    return {
      success: true,
      hasAccess: data.activo,
      rol: data.rol as any,
    };
  } catch (error) {
    console.error("Error verificando acceso a organización:", error);
    return { success: false, hasAccess: false };
  }
}
