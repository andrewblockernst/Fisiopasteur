/**
 * Las services no pueden ser Server Actions.
 *
 * Con "use server" al tope, cada export de un archivo pasa a ser un endpoint POST
 * invocable sin sesión (así quedaba expuesto el envío de WhatsApp). Las services se
 * importan solo desde actions y route handlers que ya validan la sesión.
 * Correr con `node --test src/lib/services/services-no-server-actions.test.ts`.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const dir = new URL(".", import.meta.url);
const services = readdirSync(dir).filter((f) => f.endsWith(".service.ts"));

test("ninguna service declara la directiva 'use server'", () => {
  assert.ok(services.length > 0);
  const expuestas = services.filter((f) =>
    /^\s*(["'])use server\1/m.test(readFileSync(new URL(f, dir), "utf8")),
  );
  assert.deepEqual(expuestas, []);
});
