/**
 * Utilidades para resolver IDs de especialidades dinámicamente por nombre
 * Evita hardcoding de IDs y permite búsqueda por nombre en la BD
 *
 * Estrategia de caché (dos capas):
 *  1. Map a nivel de módulo  → persiste durante la vida del proceso Node.js,
 *                              compartido entre todos los requests del mismo worker.
 *                              Compatible con cookies/Supabase auth.
 *  2. cache() de React       → deduplica llamadas dentro del mismo request,
 *                              evita que múltiples funciones que se llamen en
 *                              paralelo disparen queries simultáneas.
 *
 * Nota: unstable_cache no es compatible con createClient() porque este usa
 * cookies(), que es una fuente de datos dinámica prohibida dentro de ese scope.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────
// Capa 1: caché en memoria a nivel de módulo
// Key: `<nombre>:<orgId>` (ej: "pilates:org-uuid-123")
// Se invalida únicamente al reiniciar el proceso (deploy/restart).
// Las especialidades prácticamente no cambian en producción.
// ─────────────────────────────────────────────────────────────
const _memoriaEspecialidades = new Map<string, number>();

async function _fetchIdEspecialidad(nombre: string, orgId?: string): Promise<number | null> {
  const cacheKey = `${nombre}:${orgId ?? "global"}`;

  if (_memoriaEspecialidades.has(cacheKey)) {
    return _memoriaEspecialidades.get(cacheKey)!;
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("especialidad")
      .select("id_especialidad")
      .ilike("nombre", nombre);

    if (orgId) {
      query = query.eq("id_organizacion", orgId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(`Error obteniendo ID de especialidad '${nombre}':`, error);
      return null;
    }

    const id = data?.id_especialidad ?? null;
    if (id !== null) {
      _memoriaEspecialidades.set(cacheKey, id);
    }
    return id;
  } catch (error) {
    console.error(`Error inesperado al obtener ID de especialidad '${nombre}':`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Capa 2: deduplicación dentro del mismo request (React cache)
// Si obtenerIdPilates se llama 5 veces en paralelo dentro del mismo
// request y la entrada no está en el Map todavía, React cache()
// garantiza que solo se dispara 1 query, no 5.
// ─────────────────────────────────────────────────────────────
const _fetchIdEspecialidadDeduplicado = cache(_fetchIdEspecialidad);

// ─────────────────────────────────────────────────────────────
// API pública — mantiene la firma original (supabase: any) por
// compatibilidad con todos los callers existentes, pero lo ignora.
// ─────────────────────────────────────────────────────────────
export async function obtenerIdEspecialidadPorNombre(
  _supabase: any,
  nombre: string,
  orgId?: string
): Promise<number | null> {
  return _fetchIdEspecialidadDeduplicado(nombre, orgId);
}

/**
 * Obtiene el ID de Pilates buscándolo dinámicamente por nombre.
 * 1 query por worker en toda la vida del proceso como máximo.
 *
 * @param _supabase - ignorado, se crea internamente
 * @param orgId     - ID de la organización
 */
export async function obtenerIdPilates(
  _supabase?: any,
  orgId?: string
): Promise<number | null> {
  return _fetchIdEspecialidadDeduplicado("pilates", orgId);
}

/**
 * Invalida manualmente la caché de una especialidad.
 * Útil si se renombra una especialidad en la BD sin reiniciar el proceso.
 */
export function invalidarCacheEspecialidad(nombre: string, orgId?: string) {
  const cacheKey = `${nombre}:${orgId ?? "global"}`;
  _memoriaEspecialidades.delete(cacheKey);
}
