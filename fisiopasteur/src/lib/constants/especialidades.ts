/**
 * Utilidades para trabajar con Especialidades
 * Evita hardcoding de IDs y permite búsqueda dinámica por nombre
 */

/**
 * Búsqueda de especialidades por nombre (case-insensitive)
 */
export function findEspecialidadByNombre(
  especialidades: any[],
  nombre: string
): any | undefined {
  if (!Array.isArray(especialidades)) return undefined;
  return especialidades.find(
    (e) => e.nombre?.toLowerCase() === nombre.toLowerCase()
  );
}

/**
 * Obtiene el ID de Pilates buscándolo por nombre en el listado
 */
export function getIdPilates(especialidades: any[]): number | null {
  const pilates = findEspecialidadByNombre(especialidades, 'Pilates');
  return pilates?.id_especialidad ?? null;
}

/**
 * Verifica si una especialidad es Pilates comparando por nombre
 */
export function esPilates(especialidad: any): boolean {
  if (!especialidad) return false;
  const nombre = especialidad.nombre ?? especialidad;
  return nombre.toLowerCase() === 'pilates';
}

/**
 * Busca una especialidad por ID y verifica si es Pilates
 */
export function esPilatesById(
  id_especialidad: number | null | undefined,
  especialidades: any[]
): boolean {
  if (id_especialidad === null || id_especialidad === undefined) return false;
  const esp = especialidades.find((e) => e.id_especialidad === id_especialidad);
  return esPilates(esp);
}

/**
 * Horarios disponibles para Pilates: 08:00 a 22:00 en intervalos de 30 minutos
 * Formato: HH:mm (solo :00 y :30 permitidos)
 */
export const HORARIOS_PILATES_30MIN = (() => {
  const horarios: string[] = [];
  // Empezar desde las 08:00
  for (let hora = 8; hora < 22; hora++) {
    horarios.push(`${String(hora).padStart(2, '0')}:00`);
    horarios.push(`${String(hora).padStart(2, '0')}:30`);
  }
  // Agregar 22:00
  horarios.push('22:00');
  return horarios;
})();
