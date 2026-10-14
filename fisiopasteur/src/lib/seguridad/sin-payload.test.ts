/**
 * Guardia contra el payload inyectado por force-push (incidente 2026-09-15 / 2026-10-01).
 * El atacante agregaba código ofuscado al final de archivos de config, escondido detrás
 * de cientos de espacios. Este test solo LEE archivos; nunca los importa ni los ejecuta.
 * Correr con `node --test src/lib/seguridad/sin-payload.test.ts`.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const RAIZ = join(import.meta.dirname, "../../../..");
const PROYECTOS = ["fisiopasteur", "fisio-bot"];
const IGNORAR = new Set(["node_modules", ".git", ".next", "dist", ".codegraph", ".vercel"]);
const EXTENSIONES = /\.(m?[jt]sx?|cjs|json)$/;

// Armadas por partes para que este archivo no contenga las firmas literales.
const FIRMAS = [
  "5-1348" + "-du",
  "global" + ".i=",
  "global" + ".o=",
  "global" + ".r=require",
];
const ESPACIOS_Y_CODIGO = /[ \t]{200,}\S/;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    if (IGNORAR.has(nombre)) return [];
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return EXTENSIONES.test(nombre) ? [ruta] : [];
  });
}

test("ningún archivo fuente contiene el payload ni código escondido tras espacios", () => {
  const infectados = PROYECTOS.flatMap((p) => archivos(join(RAIZ, p)))
    .filter((ruta) => {
      const texto = readFileSync(ruta, "utf8");
      return FIRMAS.some((f) => texto.includes(f)) || ESPACIOS_Y_CODIGO.test(texto);
    })
    .map((ruta) => ruta.slice(RAIZ.length + 1));

  assert.deepEqual(infectados, []);
});
