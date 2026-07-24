-- =============================================================================
-- FASE 0 — Contención de la brecha crítica de seguridad
-- =============================================================================
-- Activa Row Level Security (RLS) en TODAS las tablas del schema `public` y
-- revoca el acceso del rol `anon`.
--
-- POR QUÉ: la anon key es PÚBLICA (viaja en el bundle del navegador). Hoy, con
-- RLS apagado + grants CRUD a `anon`, cualquiera en internet lee/escribe toda
-- la base vía PostgREST (confirmado en prod: paciente=267, usuario=25,
-- evaluacion_inicial=3, evolucion_clinica=27, turno=2694, notificacion=2190).
--
-- QUÉ HACE: por cada tabla de `public`
--   1) dropea las policies existentes (incluye residuos multi-tenant y la
--      landmine `to public` de evaluacion_inicial),
--   2) activa RLS,
--   3) revoca todos los permisos de `anon`,
--   4) crea una policy PERMISIVA para `authenticated` (using(true)) para NO
--      romper la app de staff logueada.
--
-- ALCANCE: esto es CONTENCIÓN. El endurecimiento por rol (que un usuario no
-- pueda cambiar su propio `id_rol`, scoping a staff real, cerrar signup
-- público, sacar `contraseña` de las RPC) es FASE 2 y va en otra migración.
--
-- `service_role` (backend de la app + bot) SIEMPRE bypassa RLS: no necesita
-- policies. Por eso el bot debe pasar a service-role (ver PRE-REQUISITO).
--
-- ⚠️ PRE-REQUISITO ANTES DE APLICAR EN **PROD**:
--   El bot de WhatsApp (../fisio-bot) se conecta con SUPABASE_ANON_KEY y
--   lee/escribe la tabla `notificacion`. Al revocar `anon` deja de funcionar.
--   Antes de correr esto en PROD:
--     1) Cambiar ../fisio-bot/src/supabase.client.ts a SUPABASE_SERVICE_ROLE_KEY
--     2) Setear la config var SUPABASE_SERVICE_ROLE_KEY en Heroku + redeploy
--   En DEV el bot NO se ve afectado (apunta a prod), así que es seguro aplicar
--   primero en dev, probar la app logueada, y recién después ir a prod.
--
-- Idempotente: se puede correr más de una vez sin error.
-- =============================================================================

do $$
declare
  r   record;
  pol record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    -- 1) dropear todas las policies existentes en la tabla
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = r.tablename
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, r.tablename);
    end loop;

    -- 2) activar RLS
    execute format('alter table public.%I enable row level security', r.tablename);

    -- 3) revocar acceso de anon
    execute format('revoke all on public.%I from anon', r.tablename);

    -- 4) policy permisiva para authenticated (mantiene la app funcionando)
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'fase0_authenticated_all', r.tablename
    );

    raise notice 'RLS ON + anon revocado + policy authenticated: %', r.tablename;
  end loop;
end $$;

-- Defensa extra: revocar cualquier residuo de acceso de anon en el schema.
revoke all on all sequences in schema public from anon;

-- =============================================================================
-- VERIFICACIÓN (correr por separado en el SQL editor):
--
--   -- (a) RLS debe estar en TRUE en todas las tablas:
--   select relname, relrowsecurity
--   from pg_class
--   where relnamespace = 'public'::regnamespace and relkind = 'r'
--   order by relname;
--
--   -- (b) Desde afuera, con la anon key, esto debe devolver 0 filas / 401:
--   --   curl "https://<ref>.supabase.co/rest/v1/paciente?select=*&limit=1" \
--   --        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
-- =============================================================================
