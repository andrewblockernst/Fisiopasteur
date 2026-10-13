/**
 * Toda Server Action que escribe debe exigir sesión.
 *
 * Cada export de un `*.action.ts` es un endpoint POST invocable desde afuera. Si la
 * action escribe (insert/update/upsert/delete, RPC que muta o envío de WhatsApp) sin
 * validar sesión, cualquiera puede mutar datos. El guard mínimo es `requireUsuario()`;
 * `requireAdmin()` es más estricto y también vale.
 * Correr con `node --test src/lib/actions/actions-escritura-con-guard.test.ts`.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const dir = new URL(".", import.meta.url);
const srcDir = new URL("../../", import.meta.url);

// RPCs que mutan datos (derivadas de las llamadas `.rpc(...)` de las actions).
const RPCS_ESCRITURA = [
  "bulk_actualizar_estado_turnos",
  "crear_paquete_sesiones_rpc",
  "crear_paquete_pilates_rpc",
  "actualizar_clase_pilates_rpc",
];

// Services que envían WhatsApp o registran notificaciones: cuentan como escritura.
const SERVICES_ESCRITURA = ["whatsapp-bot.service", "notificacion.service"];

const MARCADORES = [
  ".insert(",
  ".update(",
  ".upsert(",
  ".delete(",
  ...RPCS_ESCRITURA.map((r) => `.rpc('${r}'`),
  ...RPCS_ESCRITURA.map((r) => `.rpc("${r}"`),
  ...SERVICES_ESCRITURA.map((s) => `services/${s}`),
  // Helper interno de turno.action.ts que envía WhatsApp.
  "procesarNotificacionesRepeticion(",
];

// Funciones exentas de guard, con la razón de cada una.
const EXENTAS: Record<string, string> = {
  // Flujos de login/recuperación: se invocan sin sesión por diseño.
  "auth.action.ts:resetPassword": "recuperar contraseña: el usuario aún no tiene sesión",
  // Validan la sesión inline con supabase.auth.getUser() y responden "No autenticado".
  "perfil.action.ts:guardarPrecioUsuarioEspecialidad": "ya valida sesión con auth.getUser()",
  "perfil.action.ts:actualizarPerfil": "ya valida sesión con auth.getUser()",
  // Se invoca justo después del login para vincular auth con la tabla usuario.
  "sincronizar.action.ts:sincronizarUsuarioAuth": "sync post-login: crea/vincula el usuario desde la sesión de auth",
};

function acciones() {
  const archivos = readdirSync(dir).filter((f) => f.endsWith(".action.ts"));
  const out: { archivo: string; nombre: string; cuerpo: string }[] = [];
  for (const archivo of archivos) {
    const texto = readFileSync(new URL(archivo, dir), "utf8");
    const partes = texto.split(/^export async function /m).slice(1);
    for (const parte of partes) {
      const nombre = parte.match(/^(\w+)/)![1];
      out.push({ archivo, nombre, cuerpo: parte });
    }
  }
  return out;
}

test("toda action que escribe exige requireUsuario() o requireAdmin()", () => {
  const todas = acciones();
  assert.ok(todas.length > 0);
  const sinGuard = todas
    .filter(({ cuerpo }) => MARCADORES.some((m) => cuerpo.includes(m)))
    .filter(({ cuerpo }) => !/require(Usuario|Admin)\(/.test(cuerpo))
    .map(({ archivo, nombre }) => `${archivo}:${nombre}`)
    .filter((id) => !(id in EXENTAS));
  assert.deepEqual(sinGuard, []);
});

test("las exenciones apuntan a actions que existen", () => {
  const ids = new Set(acciones().map(({ archivo, nombre }) => `${archivo}:${nombre}`));
  for (const id of Object.keys(EXENTAS)) assert.ok(ids.has(id), `exención obsoleta: ${id}`);
});

test("requireOwnerOfTurno ya no existe en src/", () => {
  const archivos: string[] = [];
  const recorrer = (d: URL) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const u = new URL(e.name + (e.isDirectory() ? "/" : ""), d);
      if (e.isDirectory()) recorrer(u);
      else if (/\.(ts|tsx)$/.test(e.name) && e.name !== "actions-escritura-con-guard.test.ts") archivos.push(u.pathname);
    }
  };
  recorrer(srcDir);
  const conRef = archivos.filter((f) => readFileSync(f, "utf8").includes("requireOwnerOfTurno"));
  assert.deepEqual(conRef, []);
});
