-- =====================================================================
-- Cron: actualizar turnos "programado" → "pendiente" cuando fecha/hora
-- ya pasaron. Reemplaza al polling client-side y al endpoint de Vercel.
-- =====================================================================

-- 1. Habilitar pg_cron (idempotente)
create extension if not exists pg_cron with schema extensions;

-- 2. Función que ejecuta el update
create or replace function public.actualizar_turnos_pendientes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  filas integer;
  ahora timestamp;
  fecha_actual date;
  hora_actual time;
begin
  -- Usar hora local de Argentina (las columnas fecha/hora no llevan TZ)
  ahora := (now() at time zone 'America/Argentina/Buenos_Aires');
  fecha_actual := ahora::date;
  hora_actual  := ahora::time;

  update public.turno
     set estado = 'pendiente',
         updated_at = now()
   where estado = 'programado'
     and (
       fecha < fecha_actual
       or (fecha = fecha_actual and hora < hora_actual)
     );

  get diagnostics filas = row_count;

  raise notice 'actualizar_turnos_pendientes: % filas actualizadas (fecha=%, hora=%)',
    filas, fecha_actual, hora_actual;

  return filas;
end;
$$;

comment on function public.actualizar_turnos_pendientes() is
  'Marca como "pendiente" los turnos "programado" cuya fecha/hora ya pasó. Ejecutado por pg_cron cada 5 minutos.';

-- 3. Programar ejecución cada 5 minutos
--    Idempotente: si el job ya existe, lo elimina antes de re-crearlo.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'turnos-pendientes-cada-5min') then
    perform cron.unschedule('turnos-pendientes-cada-5min');
  end if;

  perform cron.schedule(
    'turnos-pendientes-cada-5min',
    '*/15 * * * *',
    $cmd$ select public.actualizar_turnos_pendientes(); $cmd$
  );
end
$$;
