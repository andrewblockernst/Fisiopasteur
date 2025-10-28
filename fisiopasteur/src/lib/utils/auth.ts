import { createClient } from '@/lib/supabase/server';
import { ROLES, esAdmin, esEspecialista, esProgramador, puedeGestionarSistema, puedeGestionarTurnos } from '@/lib/constants/roles';
import type { Tables } from '@/types/database.types';

type Usuario = Tables<'usuario'>;

/**
 * Obtiene el usuario autenticado actual con su información completa
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
 */
export async function verificarEsAdmin(): Promise<boolean> {
  const usuario = await obtenerUsuarioActual();
  return esAdmin(usuario?.id_rol);
}

/**
 * Verifica si el usuario actual es especialista
 */
export async function verificarEsEspecialista(): Promise<boolean> {
  const usuario = await obtenerUsuarioActual();
  return esEspecialista(usuario?.id_rol);
}

/**
 * Verifica si el usuario actual es programador
 */
export async function verificarEsProgramador(): Promise<boolean> {
  const usuario = await obtenerUsuarioActual();
  return esProgramador(usuario?.id_rol);
}

/**
 * Verifica si el usuario actual puede gestionar el sistema
 */
export async function verificarPuedeGestionarSistema(): Promise<boolean> {
  const usuario = await obtenerUsuarioActual();
  return puedeGestionarSistema(usuario?.id_rol);
}

/**
 * Verifica si el usuario actual puede gestionar turnos
 */
export async function verificarPuedeGestionarTurnos(): Promise<boolean> {
  const usuario = await obtenerUsuarioActual();
  return puedeGestionarTurnos(usuario?.id_rol);
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
