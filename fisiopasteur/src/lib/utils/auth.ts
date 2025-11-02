import { createClient } from '@/lib/supabase/server';
import { ROLES, esAdmin, esEspecialista, esProgramador, puedeGestionarSistema, puedeGestionarTurnos } from '@/lib/constants/roles';
import type { Tables } from '@/types/database.types';

type Usuario = Tables<'usuario'>;

/**
 * Obtiene el usuario autenticado actual con su información completa
 * ✅ MULTI-ORG: Obtiene usuario de la tabla usuario (sin id_rol)
 */
export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }
    
    const { data: usuario, error: dbError } = await supabase
      .from('usuario')
      .select('*')
      .eq('id_usuario', user.id)
      .single();
    
    if (dbError || !usuario) {
      return null;
    }
    
    return usuario;
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return null;
  }
}

/**
 * Verifica si el usuario actual tiene permisos de administrador
 * ✅ MULTI-ORG: Obtiene id_rol de usuario_organizacion
 */
export async function verificarEsAdmin(): Promise<boolean> {
  try {
    const { getAuthContext } = await import("./auth-context");
    const { orgId } = await getAuthContext();
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return false;
    
    const supabase = await createClient();
    const { data } = await supabase
      .from('usuario_organizacion')
      .select('id_rol')
      .eq('id_usuario', usuario.id_usuario)
      .eq('id_organizacion', orgId)
      .single();
    
    return esAdmin(data?.id_rol);
  } catch {
    return false;
  }
}

/**
 * Verifica si el usuario actual es especialista
 * ✅ MULTI-ORG: Obtiene id_rol de usuario_organizacion
 */
export async function verificarEsEspecialista(): Promise<boolean> {
  try {
    const { getAuthContext } = await import("./auth-context");
    const { orgId } = await getAuthContext();
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return false;
    
    const supabase = await createClient();
    const { data } = await supabase
      .from('usuario_organizacion')
      .select('id_rol')
      .eq('id_usuario', usuario.id_usuario)
      .eq('id_organizacion', orgId)
      .single();
    
    return esEspecialista(data?.id_rol);
  } catch {
    return false;
  }
}

/**
 * Verifica si el usuario actual es programador
 * ✅ MULTI-ORG: Obtiene id_rol de usuario_organizacion
 */
export async function verificarEsProgramador(): Promise<boolean> {
  try {
    const { getAuthContext } = await import("./auth-context");
    const { orgId } = await getAuthContext();
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return false;
    
    const supabase = await createClient();
    const { data } = await supabase
      .from('usuario_organizacion')
      .select('id_rol')
      .eq('id_usuario', usuario.id_usuario)
      .eq('id_organizacion', orgId)
      .single();
    
    return esProgramador(data?.id_rol);
  } catch {
    return false;
  }
}

/**
 * Verifica si el usuario actual puede gestionar el sistema
 * ✅ MULTI-ORG: Obtiene id_rol de usuario_organizacion
 */
export async function verificarPuedeGestionarSistema(): Promise<boolean> {
  try {
    const { getAuthContext } = await import("./auth-context");
    const { orgId } = await getAuthContext();
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return false;
    
    const supabase = await createClient();
    const { data } = await supabase
      .from('usuario_organizacion')
      .select('id_rol')
      .eq('id_usuario', usuario.id_usuario)
      .eq('id_organizacion', orgId)
      .single();
    
    return puedeGestionarSistema(data?.id_rol);
  } catch {
    return false;
  }
}

/**
 * Verifica si el usuario actual puede gestionar turnos
 * ✅ MULTI-ORG: Obtiene id_rol de usuario_organizacion
 */
export async function verificarPuedeGestionarTurnos(): Promise<boolean> {
  try {
    const { getAuthContext } = await import("./auth-context");
    const { orgId } = await getAuthContext();
    const usuario = await obtenerUsuarioActual();
    if (!usuario) return false;
    
    const supabase = await createClient();
    const { data } = await supabase
      .from('usuario_organizacion')
      .select('id_rol')
      .eq('id_usuario', usuario.id_usuario)
      .eq('id_organizacion', orgId)
      .single();
    
    return puedeGestionarTurnos(data?.id_rol);
  } catch {
    return false;
  }
}

/**
 * Obtiene el nombre completo del rol
 */
export function obtenerNombreRol(id_rol: number | undefined | null): string {
  if (!id_rol) return 'Sin rol';
  
  switch (id_rol) {
    case ROLES.ADMIN:
      return 'Administrador';
    case ROLES.ESPECIALISTA:
      return 'Especialista';
    case ROLES.PROGRAMADOR:
      return 'Programador';
    default:
      return 'Desconocido';
  }
}

/**
 * Hook type para usar en componentes cliente
 */
export interface UseAuthReturn {
  usuario: Usuario | null;
  esAdmin: boolean;
  esEspecialista: boolean;
  esProgramador: boolean;
  puedeGestionarSistema: boolean;
  puedeGestionarTurnos: boolean;
  nombreRol: string;
  loading: boolean;
}
