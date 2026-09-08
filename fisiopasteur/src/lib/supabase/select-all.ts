/**
 * PostgREST corta TODA respuesta en `db-max-rows` (1000 por defecto en Supabase)
 * y no devuelve error: entrega las primeras N filas y listo. Una lista que crece
 * empieza a "perder" datos en silencio.
 *
 * Ese fue el bug del calendario: la ventana de 3 meses pedía todos los turnos sin
 * `.range()`, y al pasar las 1000 filas del trimestre solo llegaban las más
 * antiguas — de mitad del trimestre en adelante aparecía vacío.
 *
 * `selectAll` trae por bloques hasta agotar el rango. Usalo en cualquier query
 * que devuelva una lista sin paginado explícito y cuya tabla pueda crecer.
 * `scripts/check-unbounded-queries.mjs` verifica que no se olvide.
 */

// Techo de filas por respuesta que impone PostgREST.
// Si en Supabase se sube ese valor, subirlo acá también: un valor MENOR al real
// solo cuesta un request extra, uno MAYOR vuelve a truncar en silencio.
export const POSTGREST_MAX_ROWS = 1000;

export type SelectAllResult<T> =
  | { success: true; data: T[] }
  | { success: false; error: string };

/**
 * Ejecuta la query por bloques de `POSTGREST_MAX_ROWS` hasta agotar el rango.
 *
 * `buildQuery` tiene que construir la query DESDE CERO en cada llamada: los
 * builders de PostgREST no se pueden reutilizar después de un `await`.
 *
 * IMPORTANTE: la query debe tener un orden total (agregá la PK como último
 * `.order()`). Sin desempate, dos filas iguales en la clave de orden pueden
 * reordenarse entre requests y duplicarse o perderse al cruzar el borde de un
 * bloque.
 */
export async function selectAll<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<SelectAllResult<T>> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += POSTGREST_MAX_ROWS) {
    const { data, error } = await buildQuery(offset, offset + POSTGREST_MAX_ROWS - 1);

    if (error) return { success: false, error: error.message };

    rows.push(...(data ?? []));

    if (!data || data.length < POSTGREST_MAX_ROWS) break;
  }

  return { success: true, data: rows };
}
