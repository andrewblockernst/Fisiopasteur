# Feature: permisos-auditoria

## Objetivo

Cerrar los endpoints públicos de las services, permitir que cualquier especialista opere
sobre turnos ajenos y dejar registrada (y visible en la UI) toda escritura.

## Problema

- `src/lib/services/{notificacion,whatsapp-bot,cron-recordatorios}.service.ts` tienen
  `"use server"`: cada export es un endpoint invocable sin sesión.
- `requireOwnerOfTurno` bloquea a especialistas sobre turnos ajenos (actualizar, eliminar,
  atendido, cancelar), pero el negocio necesita que puedan cubrirse entre sí.
- No hay auditoría: `turno` solo tiene `created_at`/`updated_at`.

## Decisiones (usuario, 2026-10-13)

- Lectura: todo el staff logueado ve todo. RLS SELECT `using(true)` para authenticated es aceptable.
- Escritura: el especialista puede operar sobre turnos ajenos; queda estampado.
- La estampa se ve en los diálogos de detalle (turno, evolución, paciente).
- Admin (1) y Programador (3): todo.
- Migraciones: borrador, probadas en Supabase local. Nunca aplicar en remoto sin aprobación.

## Alcance autorizado

- Services sin `"use server"`, importadas solo desde actions con guard.
- `requireUsuario` en toda action de escritura; reemplazar `requireOwnerOfTurno`.
- Migración `auditoria` + trigger (draft, local).
- Estampa "Creado/Editado por X · fecha" en diálogos.

Fuera de alcance: cerrar signup público (usuario, dashboard), RLS de escritura por rol (S4),
sanitizar `.or()` (S5).

## Modo de verificación

- TDD: estricto (config de sesión). Runner: `node --test` (ver `test:select-all`).
- Checks: `npm run build` (incluye `check:queries`), `npx tsc --noEmit` comparando contra base (76 errores previos).

## Tareas

- [x] T0. Verificar que las migraciones del repo levantan el schema completo en Supabase local.
      Ruta: inline. No levantaban; el usuario aprobó guards de replay en migraciones históricas
      (no cambian prod: Supabase rastrea por versión). `20260306172743`: se ELIMINÓ el backfill
      duplicado desde `usuario_organizacion` (white label dado de baja; el backfill real está en
      `remove_multi_org`). `20260415140500`: DROP antes de cambiar tipo de retorno.
      Evidencia: `supabase start -x vector,logflare` exit 0; 11 tablas = `database.types.ts`;
      funciones: local tiene 2 extra (`actualizar_clase_pilates_rpc`, `bulk_actualizar_estado_turnos`)
      → tipos desactualizados, no migraciones (deuda de tipos, fase 1). Commit: `347c194`.
- [x] T1. Sacar `"use server"` de las services; confirmar que ningún client component las importa.
      Ruta: inline (3 ediciones mecánicas de 1 línea). Importadores: solo `turno.action.ts` y 3 route
      handlers ya protegidos (`requireSesion` / `requireCronSecret`).
      TDD: RED `services-no-server-actions.test.ts` (3 expuestas) → GREEN (1 pass).
      Checks: `tsc --noEmit` 76 errores (= base), `npm run build` exit 0. RDD: off (global). Commit: `fb782d3`.
- [x] T2. Guards: `requireUsuario` en actions de escritura; `requireOwnerOfTurno` → sesión válida.
      Ruta: delegated (writer trigger: ~12 action files). `requireOwnerOfTurno` eliminado; sus 4 usos
      en `turno.action.ts` ahora usan `requireUsuario()` (el "no encontrado" lo siguen reportando los
      SELECT posteriores de cada action; `actualizarTurno` no cambia). 19 actions nuevas con guard:
      turno 12, paciente 6, evaluacionInicial 1. Exentas (con razón en el test): `resetPassword`,
      `sincronizarUsuarioAuth` (sin sesión por diseño), `guardarPrecioUsuarioEspecialidad` y
      `actualizarPerfil` (ya validan `auth.getUser()` inline). No tocado: `updatePassword`.
      TDD: RED `actions-escritura-con-guard.test.ts` (24 actions sin guard + `requireOwnerOfTurno`
      presente, 2 fail) → GREEN (3 pass).
      Checks: `tsc --noEmit` 75 errores (base 76), `npm run build` exit 0, services test 1 pass,
      select-all 4 tests pass (el proceso `node --test` no termina en esta máquina; ver Entorno).
- [x] T3. Migración `auditoria` + trigger sobre turno, evolucion_clinica, paciente, evaluacion_inicial; test en local.
      Ruta: delegated (preparation + migration + pgTAP). Migración `20261013120000_auditoria.sql`.
      Diseño: tabla `auditoria(id, tabla, registro_id, operacion, actor, fecha, cambios)`; una función
      `registrar_auditoria()` SECURITY DEFINER (PK por `TG_ARGV[0]`), trigger AFTER I/U/D por fila en las 4 tablas.
      `actor` = `auth.uid()` solo si existe en `usuario` (si no, NULL = Sistema). UPDATE guarda solo columnas
      cambiadas `{col:{old,new}}`; si solo cambió `updated_at` no escribe; DELETE guarda la fila vieja.
      RLS: SELECT authenticated `using(true)`; sin policies de escritura; grants revocados salvo SELECT.
      Volumen: el cron (cada 15 min) solo toca turnos que pasan de programado a pendiente: ~1 fila por turno, aceptable.
      TDD: RED `supabase test db` (tabla inexistente, 17 fail) -> GREEN 16/16 (`supabase/tests/auditoria.test.sql`).
      Checks: `supabase db reset --local` exit 0 (37 migraciones), services/guard tests 4 pass, `npm run build` exit 0.
- [x] T4. Estampa visible en diálogos de turno, evolución y paciente.
      Ruta: delegated (writer trigger: action + component + 3+ dialogs). Action `obtenerEstampaAuditoria`
      (`auditoria.action.ts`, `requireUsuario`, Zod, 2 queries `.limit(1)`; cast con `// ponytail:` porque
      `database.types.ts` no incluye `auditoria`), reducción pura en `src/lib/auditoria/estampa.ts`, componente
      `EstampaAuditoria` (TanStack Query, `['auditoria', tabla, id]`; sin invalidación: refetch al remontar).
      Montada en: `detalle-turno-dialog` (turno), `turno-detail-mobile` (turno), `datos-paciente` y footer de
      `editar-paciente-dialog` (paciente), `tabla-historial` y `historial-clinico-mobile` (evolución: es el campo
      `turno.evolucion_clinica`, estampa de `turno`, solo al editar para no hacer N consultas por fila).
      No cableada: `evaluacion-inicial-modal` (recibe `idGrupo`, no el id de `evaluacion_inicial`).
      TDD: RED `estampa.test.ts` (módulo inexistente) -> GREEN 7 pass.
      Verificado en Supabase local: embed `usuario:actor(nombre,apellido)` vía PostgREST con JWT authenticated
      devuelve el nombre; anon recibe 42501. Datos de prueba borrados.
      Checks: node --test 11 pass, `supabase test db` 16/16, `tsc --noEmit` 75 errores, `npm run build` exit 0.
- [x] T5. Fixes de develop: columnas `notif_*` sin migración y EXECUTE de `anon` en RPC.
      Ruta: inline (2 migraciones SQL chicas + 1 test). Usuario autorizó aplicar en develop
      (gtrkgzkxxsxaxafxsvcw), sumado a esta rama.
      `20261013100000_paciente_notif_columns.sql`: `add column if not exists` boolean not null default true
      (definición copiada de develop). `20261013110000_revoke_execute_anon_rpc.sql`: default privileges de
      `postgres` (sin anon ni PUBLIC en funciones nuevas; grant explícito a authenticated/service_role porque
      en local esa entrada no existe) + revoke `public, anon` en las funciones existentes. Solo quita acceso:
      un grant a authenticated en el loop pisaba el revoke deliberado de la función de trigger de auditoria
      (lo detectó `auditoria.test.sql` al re-ejecutar).
      Timestamps anteriores a `auditoria` para que develop quede lineal (auditoria sigue sin aplicar ahí).
      TDD: RED `rpc_anon.test.sql` 5/7 fallan (columnas ausentes; función nueva ejecutable por anon) ->
      GREEN tras `db reset`: `supabase test db` 23/23. Re-ejecución de ambas migraciones: sin error, 23/23.
      Nota: `auditoria` no es re-ejecutable (trigger ya existe); irrelevante para el flujo normal.
      Develop (2026-10-13 ~23:07 UTC): aplicadas vía `db query --linked -f` + `migration repair --status applied`
      (no `db push`, que habría aplicado también `auditoria`). Antes: anon HTTP 200 en `auth_bcrypt_hash`.
      Después: anon 401/42501 en `auth_bcrypt_hash` y `actualizar_turnos_pendientes`; anon 0/19, authenticated
      19/19; `obtener_boxes_disponibles_rpc` y `dashboard_kpis_snapshot` OK como authenticated; cron
      (`postgres`, */15) `succeeded` a las 23:15. `fisio-bot` usa SERVICE_ROLE_KEY: no afectado.

## Progreso

- Rama `feature/permisos-auditoria` desde `develop` (contenido idéntico a `main`, verificado).

## Entorno local

- Docker vía Colima (`colima start`). El Supabase de `san3dblock` usa los mismos puertos: frenarlo antes.
- `supabase/.temp/storage-version` (cache de `supabase link`) fija una imagen no pública; se movió a un lado.
- `supabase start -x vector,logflare` (vector no monta el socket de Colima).
- `node --test select-all.test.ts` se cuelga en Node 26 (preexistente, fuera de alcance).

## Hallazgos en develop (fisiopasteur-dev, lectura 2026-10-13)

- Develop tiene las 36 migraciones del repo; solo falta `20261013120000_auditoria`.
- Drift: `paciente.notif_confirmacion` y `paciente.notif_recordatorios` existen en develop y el código
  las usa, pero ninguna migración las crea.
- Seguridad: `anon` conserva EXECUTE sobre todas las funciones de `public` (incluida
  `actualizar_turnos_pendientes`, SECURITY DEFINER). `fase3` solo revoca `from public`; en cloud
  `anon` tiene grant explícito. El replay local no lo reproduce.
- Resuelto en T5 (misma rama).

## Próximo paso

Prod (qasrvhpdcerymjtvcfed, PG15): precheck de solo lectura (columnas `notif_*`, última migración,
owner de funciones, anon EXECUTE, rol del cron) y aplicar solo con OK del usuario. Luego PR a develop.
