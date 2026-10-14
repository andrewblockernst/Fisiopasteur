-- =============================================================================
-- paciente.notif_confirmacion / notif_recordatorios
-- =============================================================================
-- Estas columnas se crearon desde el dashboard en develop y prod, sin migración.
-- El código (paciente.action, schemas, diálogos) las usa, así que una base
-- reconstruida desde el repo fallaba al crear o editar pacientes.
-- Definición copiada de develop: boolean not null default true.
--
-- Idempotente: en una base donde ya existen no hace nada.
-- =============================================================================

alter table public.paciente
  add column if not exists notif_confirmacion boolean not null default true,
  add column if not exists notif_recordatorios boolean not null default true;
