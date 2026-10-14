/**
 * Check del paginado por bloques de selectAll().
 *
 * Sin frameworks: `node --test` viene en Node y este archivo no toca Supabase,
 * solo simula las respuestas. Correr con `npm run test:select-all`.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { POSTGREST_MAX_ROWS, selectAll } from "./select-all.ts";

/** Fake de la query: devuelve `total` filas repartidas en bloques y registra los rangos pedidos. */
function fakeQuery(total: number) {
  const rangos: Array<[number, number]> = [];

  const build = async (from: number, to: number) => {
    rangos.push([from, to]);
    const filas = [];
    for (let i = from; i <= Math.min(to, total - 1); i++) filas.push({ id: i });
    return { data: filas, error: null };
  };

  return { build, rangos };
}

test("una sola página cuando hay menos filas que el techo", async () => {
  const { build, rangos } = fakeQuery(10);

  const resultado = await selectAll<{ id: number }>(build);

  assert.equal(resultado.success, true);
  assert.equal(resultado.success && resultado.data.length, 10);
  assert.deepEqual(rangos, [[0, POSTGREST_MAX_ROWS - 1]]);
});

test("sigue pidiendo bloques hasta que uno viene incompleto", async () => {
  const total = POSTGREST_MAX_ROWS * 2 + 7;
  const { build, rangos } = fakeQuery(total);

  const resultado = await selectAll<{ id: number }>(build);

  assert.equal(resultado.success, true);
  assert.equal(resultado.success && resultado.data.length, total);
  // Tres requests: dos llenos y uno parcial que corta el loop.
  assert.equal(rangos.length, 3);
  assert.deepEqual(rangos[1], [POSTGREST_MAX_ROWS, POSTGREST_MAX_ROWS * 2 - 1]);
  // Sin huecos ni solapamientos: los ids salen consecutivos y sin repetir.
  assert.deepEqual(
    resultado.success && resultado.data.map((f) => f.id),
    Array.from({ length: total }, (_, i) => i)
  );
});

test("corta cuando el total es múltiplo exacto del techo", async () => {
  const { build, rangos } = fakeQuery(POSTGREST_MAX_ROWS);

  const resultado = await selectAll<{ id: number }>(build);

  assert.equal(resultado.success, true);
  assert.equal(resultado.success && resultado.data.length, POSTGREST_MAX_ROWS);
  // El bloque justo se llena, así que hace falta un request más para saber que terminó.
  assert.equal(rangos.length, 2);
});

test("propaga el error y no devuelve datos parciales", async () => {
  const resultado = await selectAll<{ id: number }>(async () => ({
    data: null,
    error: { message: "boom" },
  }));

  assert.equal(resultado.success, false);
  assert.equal(resultado.success === false && resultado.error, "boom");
});
