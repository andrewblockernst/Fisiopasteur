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
      (no cambian prod: Supabase rastrea por versión). Guards: `20260306172743` (UPDATE desde
      `usuario_organizacion` ya dropeada) y `20260415140500` (DROP antes de cambiar tipo de retorno).
      Evidencia: `supabase start -x vector,logflare` exit 0; 11 tablas = `database.types.ts`;
      funciones: local tiene 2 extra (`actualizar_clase_pilates_rpc`, `bulk_actualizar_estado_turnos`)
      → tipos desactualizados, no migraciones (deuda de tipos, fase 1). Commit: `347c194`.
- [x] T1. Sacar `"use server"` de las services; confirmar que ningún client component las importa.
      Ruta: inline (3 ediciones mecánicas de 1 línea). Importadores: solo `turno.action.ts` y 3 route
      handlers ya protegidos (`requireSesion` / `requireCronSecret`).
      TDD: RED `services-no-server-actions.test.ts` (3 expuestas) → GREEN (1 pass).
      Checks: `tsc --noEmit` 76 errores (= base), `npm run build` exit 0. RDD: off (global).
- [ ] T2. Guards: `requireUsuario` en actions de escritura; `requireOwnerOfTurno` → sesión válida.
- [ ] T3. Migración `auditoria` + trigger sobre turno, evolucion_clinica, paciente, evaluacion_inicial; test en local.
- [ ] T4. Estampa visible en diálogos de turno, evolución y paciente.

## Progreso

- Rama `feature/permisos-auditoria` desde `develop` (contenido idéntico a `main`, verificado).

## Entorno local

- Docker vía Colima (`colima start`). El Supabase de `san3dblock` usa los mismos puertos: frenarlo antes.
- `supabase/.temp/storage-version` (cache de `supabase link`) fija una imagen no pública; se movió a un lado.
- `supabase start -x vector,logflare` (vector no monta el socket de Colima).

## Próximo paso

T1.
