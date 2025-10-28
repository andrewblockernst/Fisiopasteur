/**
 * Constantes de roles del sistema
 */
export const ROLES = {
  ADMIN: 1,
  ESPECIALISTA: 2,
  PROGRAMADOR: 3,
} as const;

/**
 * Roles que tienen acceso completo de administrador
 */
export const ROLES_CON_ACCESO_ADMIN = [ROLES.ADMIN, ROLES.PROGRAMADOR] as const;

/**
 * Roles que pueden aparecer como especialistas en turnos (selector de profesionales)
 */
export const ROLES_ESPECIALISTAS = [ROLES.ADMIN, ROLES.ESPECIALISTA] as const;

/**
 * Roles que pueden gestionar turnos (crear/editar turnos de cualquier especialista)
 * Incluye Admin y Programadores - tienen acceso completo al sistema de turnos
 */
export const ROLES_PUEDE_GESTIONAR_TURNOS = [ROLES.ADMIN, ROLES.PROGRAMADOR] as const;

/**
 * Verifica si un usuario tiene permisos de administrador
 */
export function esAdmin(id_rol: number | undefined | null): boolean {
  if (!id_rol) return false;
  return ROLES_CON_ACCESO_ADMIN.includes(id_rol as typeof ROLES_CON_ACCESO_ADMIN[number]);
}

/**
 * Verifica si un usuario es especialista
 */
export function esEspecialista(id_rol: number | undefined | null): boolean {
  if (!id_rol) return false;
  return id_rol === ROLES.ESPECIALISTA;
}

/**
 * Verifica si un usuario es programador
 */
export function esProgramador(id_rol: number | undefined | null): boolean {
  if (!id_rol) return false;
  return id_rol === ROLES.PROGRAMADOR;
}

/**
 * Verifica si un usuario puede gestionar el sistema (admin o programador)
 */
export function puedeGestionarSistema(id_rol: number | undefined | null): boolean {
  return esAdmin(id_rol);
}

/**
 * Verifica si un usuario puede aparecer como especialista en turnos
 */
export function puedeAsignarTurnos(id_rol: number | undefined | null): boolean {
  if (!id_rol) return false;
  return ROLES_ESPECIALISTAS.includes(id_rol as typeof ROLES_ESPECIALISTAS[number]);
}

/**
 * Verifica si un usuario puede gestionar turnos (crear turnos para cualquier especialista)
 * True para Admin y Programadores
 */
export function puedeGestionarTurnos(id_rol: number | undefined | null): boolean {
  if (!id_rol) return false;
  return ROLES_PUEDE_GESTIONAR_TURNOS.includes(id_rol as typeof ROLES_PUEDE_GESTIONAR_TURNOS[number]);
}
