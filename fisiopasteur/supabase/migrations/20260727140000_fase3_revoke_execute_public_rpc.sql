-- =============================================================================
-- FASE 3 (M1) — Bloquear EXECUTE de las RPC al público / anónimo
-- =============================================================================
-- Postgres otorga EXECUTE a PUBLIC por default en cada función, lo que incluye
-- al rol `anon`. Para funciones SECURITY INVOKER, Fase 0 ya bloquea el acceso
-- a datos (corren como el que llama y anon no tiene grants), PERO la función
-- SECURITY DEFINER `actualizar_turnos_pendientes()` corre como owner y BYPASSA
-- RLS: cualquiera con la anon key podía dispararla (barrido masivo de estados).
--
-- FIX: revocar EXECUTE de PUBLIC en todas las funciones propias del schema
-- `public` y otorgarlo explícitamente a `authenticated` y `service_role`.
-- Esto SOLO reduce acceso (saca anon); la app (client autenticado) y el cron
-- (postgres/service_role) siguen funcionando. Se EXCLUYEN las funciones de
-- extensiones (pg_trgm, pgjwt) para no alterar su comportamiento.
--
-- Idempotente.
-- =============================================================================

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
        -- excluir funciones que pertenecen a una extensión
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute 'revoke execute on function ' || f.sig || ' from public';
    execute 'grant execute on function ' || f.sig || ' to authenticated, service_role';
  end loop;
end $$;
