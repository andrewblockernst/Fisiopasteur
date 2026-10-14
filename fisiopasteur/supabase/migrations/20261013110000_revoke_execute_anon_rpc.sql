-- =============================================================================
-- Revocar EXECUTE a `anon` en las funciones de `public`
-- =============================================================================
-- Fase 3 (20260727140000) solo revocó PUBLIC. En Supabase cloud `anon` además
-- tiene un grant PROPIO en cada función, que viene de los default privileges
-- del rol `postgres` en el schema `public`. Por eso la anon key seguía pudiendo
-- llamar todas las RPC, incluida `actualizar_turnos_pendientes()` (SECURITY
-- DEFINER, saltea RLS).
--
-- FIX:
--   1. Default privileges: las funciones nuevas que cree `postgres` ya no se
--      otorgan a `anon` ni a PUBLIC; sí a `authenticated` y `service_role`.
--   2. Funciones existentes: revocar PUBLIC y `anon`. Solo quita acceso: no
--      otorga nada, para no pisar revokes deliberados (ej. la función de
--      trigger de auditoria). Se excluyen las de extensiones.
--
-- El cron corre como `postgres` (owner) y no se ve afectado.
-- Idempotente.
-- =============================================================================

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
alter default privileges for role postgres
  revoke execute on functions from public;
-- Explícito: en local los default privileges de `postgres` en `public` no
-- existen, y sin esto las funciones nuevas quedarían solo para el owner.
alter default privileges for role postgres in schema public
  grant execute on functions to authenticated, service_role;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute 'revoke execute on function ' || f.sig || ' from public, anon';
  end loop;
end $$;
