/**
 * Utilidades para resolver IDs de especialidades dinámicamente por nombre.
 * Sin lógica multi-org — busca globalmente en la tabla especialidad.
 *
 * Estrategia de caché (dos capas):
 *  1. Map a nivel de módulo  → persiste durante la vida del proceso Node.js.
 *  2. cache() de React       → deduplica llamadas dentro del mismo request.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Capa 1: caché en memoria a nivel de módulo
const _memoriaEspecialidades = new Map<string, number>();

async function _fetchIdEspecialidad(nombre: string): Promise<number | null> {
  const cacheKey = nombre.toLowerCase();

  if (_memoriaEspecialidades.has(cacheKey)) {
    return _memoriaEspecialidades.get(cacheKey)!;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("especialidad")
      .select("id_especialidad")
      .ilike("nombre", nombre)
      .maybeSingle();

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

// Capa 2: deduplicación dentro del mismo request
const _fetchIdEspecialidadDeduplicado = cache(_fetchIdEspecialidad);

/**
 * Obtiene el ID de una especialidad por nombre.
 * @param _supabase - ignorado (compatibilidad con callers existentes)
 * @param nombre    - nombre de la especialidad (case-insensitive)
 * @param _orgId    - ignorado (sin multi-org)
 */
export async function obtenerIdEspecialidadPorNombre(
  _supabase: any,
  nombre: string,
  _orgId?: string
): Promise<number | null> {
  return _fetchIdEspecialidadDeduplicado(nombre);
}

/**
 * Obtiene el ID de Pilates buscándolo dinámicamente por nombre.
 * @param _supabase - ignorado
 * @param _orgId    - ignorado
 */
export async function obtenerIdPilates(
  _supabase?: any,
  _orgId?: string
): Promise<number | null> {
  return _fetchIdEspecialidadDeduplicado("pilates");
}

/**
 * Invalida manualmente la caché de una especialidad.
 */
export function invalidarCacheEspecialidad(nombre: string, _orgId?: string) {
  _memoriaEspecialidades.delete(nombre.toLowerCase());
}
