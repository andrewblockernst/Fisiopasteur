/**
 * Reduccion de filas de auditoria a la estampa "Creado por / Editado por".
 * Correr con `node --test src/lib/auditoria/estampa.test.ts`.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { reducirEstampa, type FilaAuditoria } from "./estampa.ts";

const fila = (
  operacion: FilaAuditoria["operacion"],
  fecha: string,
  usuario: FilaAuditoria["usuario"] = { nombre: "Ana", apellido: "Perez" },
): FilaAuditoria => ({ operacion, fecha, usuario });

test("sin filas no hay estampa", () => {
  assert.deepEqual(reducirEstampa([]), {});
});

test("creado es el INSERT mas antiguo", () => {
  const r = reducirEstampa([
    fila("INSERT", "2026-10-12T17:30:00Z", { nombre: "B", apellido: "Dos" }),
    fila("INSERT", "2026-10-12T17:00:00Z", { nombre: "A", apellido: "Uno" }),
  ]);
  assert.deepEqual(r.creado, { nombre: "A Uno", fecha: "2026-10-12T17:00:00Z" });
  assert.equal(r.editado, undefined);
});

test("editado es el UPDATE mas reciente y solo existe con un UPDATE", () => {
  const r = reducirEstampa([
    fila("INSERT", "2026-10-12T17:00:00Z"),
    fila("UPDATE", "2026-10-13T09:10:00Z", { nombre: "Juan", apellido: "Gomez" }),
    fila("UPDATE", "2026-10-13T08:00:00Z"),
  ]);
  assert.deepEqual(r.editado, { nombre: "Juan Gomez", fecha: "2026-10-13T09:10:00Z" });
});

test("actor nulo se muestra como Sistema", () => {
  const r = reducirEstampa([fila("INSERT", "2026-10-12T17:00:00Z", null)]);
  assert.equal(r.creado?.nombre, "Sistema");
});

test("sin INSERT (registro previo a la migracion) pero con UPDATE solo hay editado", () => {
  const r = reducirEstampa([fila("UPDATE", "2026-10-13T09:10:00Z")]);
  assert.equal(r.creado, undefined);
  assert.equal(r.editado?.nombre, "Ana Perez");
});

test("DELETE se ignora", () => {
  assert.deepEqual(reducirEstampa([fila("DELETE", "2026-10-13T09:10:00Z")]), {});
});

test("apellido nulo no deja espacios sobrantes", () => {
  const r = reducirEstampa([fila("INSERT", "2026-10-12T17:00:00Z", { nombre: "Ana", apellido: null })]);
  assert.equal(r.creado?.nombre, "Ana");
});
