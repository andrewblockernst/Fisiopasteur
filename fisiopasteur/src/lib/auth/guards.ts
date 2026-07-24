import { obtenerUsuarioActual, type UsuarioActual } from '@/lib/auth/usuario-actual';
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
