import { obtenerUsuarioActual, type UsuarioActual } from '@/lib/auth/usuario-actual';
import { createClient } from '@/lib/supabase/server';
import { esAdmin } from '@/lib/constants/roles';

/**
 * Guards de autorización para Server Actions.
 *
 * Devuelven el `usuario` si el acceso es válido, o `null` si no. El llamador
 * debe hacer el early-return con el error de su convención, ej.:
 *
 *   const admin = await requireAdmin();
 *   if (!admin) return { success: false, error: 'No autorizado' };
 */

/** Requiere un usuario logueado (existente en la tabla `usuario`). */
export async function requireUsuario(): Promise<UsuarioActual | null> {
  return await obtenerUsuarioActual();
}

/** Requiere que el usuario logueado sea admin o programador. */
export async function requireAdmin(): Promise<UsuarioActual | null> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario || !esAdmin(usuario.id_rol)) return null;
  return usuario;
}

/**
 * Requiere que el usuario logueado sea admin/programador, o el especialista
 * dueño del turno. Devuelve el usuario si pasa; null si no.
 * Si el turno no existe, también devuelve null (el llamador debe reportar como
 * "turno no encontrado o no autorizado" sin filtrar cuál de los dos fue).
 */
export async function requireOwnerOfTurno(id_turno: number): Promise<UsuarioActual | null> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return null;
  if (esAdmin(usuario.id_rol)) return usuario;

  const supabase = await createClient();
  const { data: turno } = await supabase
    .from('turno')
    .select('id_especialista')
    .eq('id_turno', id_turno)
    .maybeSingle();

  if (!turno) return null;
  if (turno.id_especialista !== usuario.id_usuario) return null;
  return usuario;
}
