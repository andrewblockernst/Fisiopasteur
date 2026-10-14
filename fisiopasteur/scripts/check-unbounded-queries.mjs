#!/usr/bin/env node
/**
 * Detecta SELECTs de Supabase que devuelven listas sin techo explícito.
 *
 * PostgREST corta toda respuesta en `db-max-rows` (1000 por defecto) sin error:
 * entrega las primeras 1000 filas y listo. Una tabla que crece empieza a perder
 * datos en silencio — así desapareció medio trimestre del calendario, dos veces.
 *
 * Esto se chequea con un script y no a ojo porque el bug no se ve: no hay
 * excepción, no hay log, la lista simplemente llega incompleta.
 *
 * Arreglos posibles para lo que marque:
 *   - `selectAll()` de src/lib/supabase/select-all.ts (traer el rango completo)
 *   - `.range()` / `.limit()` explícito (paginado o top-N)
 *   - `.single()` / `.maybeSingle()` (si devuelve una fila)
 *   - `// unbounded-ok: <razón>` si la tabla no puede crecer y querés dejarlo
 *
 * Uso: node scripts/check-unbounded-queries.mjs
 */

import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

// Tablas que pueden pasar las 1000 filas. Las chicas y de tamaño fijo (box,
// especialidad, usuario, rol) no entran: nunca van a llegar al techo.
// Si agregás una tabla que crece con el uso, agregala acá.
const GROWABLE_TABLES = [
  "turno",
  "notificacion",
  "paciente",
  "evolucion_clinica",
  "grupo_tratamiento",
];

// Si el statement tiene alguno de estos, ya está acotado o no es un SELECT de lista.
const BOUNDED_MARKERS = [
  ".range(",
  ".limit(",
  ".single(",
  ".maybeSingle(",
  ".insert(",
  ".update(",
  ".upsert(",
  ".delete(",
  "head: true",
];

const ALLOW_COMMENT = "unbounded-ok";

// Cuántas líneas se miran hacia atrás para encontrar el `// unbounded-ok` o el
// `selectAll(` que envuelve la query. Suficiente para un comentario de varias
// líneas o la apertura de un closure.
const LOOKBACK_LINES = 6;

/**
 * Reemplaza el contenido de los comentarios por espacios, manteniendo la
 * longitud y los saltos de línea para que los offsets y los números de línea
 * sigan siendo válidos. Sin esto, un `;` dentro de un comentario corta el
 * statement antes de tiempo y un `.limit()` posterior pasa desapercibido.
 * El `:` previo evita comerse el `//` de una URL.
 */
function blankComments(source) {
  const blank = (match) => match.replace(/[^\n]/g, " ");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (match, prefix) => prefix + blank(match.slice(prefix.length)));
}

/** Devuelve el statement completo que arranca en `.from(` (hasta el `;` que lo cierra). */
function statementAt(source, fromIndex) {
  const end = source.indexOf(";", fromIndex);
  return source.slice(fromIndex, end === -1 ? source.length : end);
}

const files = globSync("src/**/*.{ts,tsx}");
const findings = [];

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const source = blankComments(raw);
  // La allowlist se busca en el fuente original: vive en un comentario.
  const lines = raw.split("\n");

  for (const table of GROWABLE_TABLES) {
    const needle = `.from("${table}")`;
    let index = source.indexOf(needle);

    while (index !== -1) {
      const statement = statementAt(source, index);
      const line = source.slice(0, index).split("\n").length;

      // El `// unbounded-ok` o el `selectAll(` que envuelve la query viven unas
      // líneas más arriba, no necesariamente en el mismo statement.
      const nearby = lines.slice(Math.max(0, line - 1 - LOOKBACK_LINES), line).join("\n");
      const allowed = nearby.includes(ALLOW_COMMENT);
      // selectAll() ya trae el rango completo por bloques: la query va dentro
      // de un closure y el .range() lo aplica el helper, fuera del statement.
      // `selectAll<Row>(` también cuenta: el genérico va entre el nombre y el paréntesis.
      const wrappedInSelectAll = /selectAll\s*[<(]/.test(nearby);
      const bounded =
        wrappedInSelectAll || BOUNDED_MARKERS.some((marker) => statement.includes(marker));

      if (!bounded && !allowed && statement.includes(".select(")) {
        findings.push({ file, line, table });
      }

      index = source.indexOf(needle, index + 1);
    }
  }
}

if (findings.length === 0) {
  console.log("✓ Sin SELECTs de lista sin techo explícito.");
  process.exit(0);
}

console.error(
  `\n✗ ${findings.length} SELECT(s) sin techo explícito sobre tablas que crecen.\n` +
    `  PostgREST los va a truncar en 1000 filas SIN error cuando la tabla crezca.\n`
);
for (const { file, line, table } of findings) {
  console.error(`  ${file}:${line}  → tabla "${table}"`);
}
console.error(
  `\n  Arreglalo con selectAll() (src/lib/supabase/select-all.ts), .range()/.limit(),\n` +
    `  .single(), o marcalo con "// ${ALLOW_COMMENT}: <razón>" si de verdad no puede crecer.\n`
);
process.exit(1);
