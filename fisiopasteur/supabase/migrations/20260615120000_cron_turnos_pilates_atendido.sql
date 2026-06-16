-- =====================================================================
-- Actualiza la función del cron para que los turnos vencidos de Pilates
-- pasen directamente a "atendido" en lugar de "pendiente".
-- El resto de los turnos siguen pasando de "programado" → "pendiente".
-- =====================================================================

create or replace function public.actualizar_turnos_pendientes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  filas_pendiente integer := 0;
  filas_atendido  integer := 0;
  ahora timestamp;
  fecha_actual date;
  hora_actual time;
  id_pilates integer;
begin
  -- Usar hora local de Argentina (las columnas fecha/hora no llevan TZ)
  ahora := (now() at time zone 'America/Argentina/Buenos_Aires');
  fecha_actual := ahora::date;
  hora_actual  := ahora::time;

  -- Resolver el id de la especialidad "Pilates" por nombre (case-insensitive)
  select e.id_especialidad
    into id_pilates
    from public.especialidad e
   where lower(e.nombre) = 'pilates'
   limit 1;

  -- Turnos de Pilates vencidos → "atendido"
  if id_pilates is not null then
    update public.turno
       set estado = 'atendido',
           updated_at = now()
     where estado = 'programado'
       and id_especialidad = id_pilates
       and (
         fecha < fecha_actual
         or (fecha = fecha_actual and hora < hora_actual)
       );

    get diagnostics filas_atendido = row_count;
  end if;

  -- Resto de turnos vencidos → "pendiente"
  update public.turno
     set estado = 'pendiente',
         updated_at = now()
   where estado = 'programado'
     and (id_pilates is null or id_especialidad is distinct from id_pilates)
     and (
       fecha < fecha_actual
       or (fecha = fecha_actual and hora < hora_actual)
     );

  get diagnostics filas_pendiente = row_count;

  raise notice 'actualizar_turnos_pendientes: % pendiente, % atendido (pilates) (fecha=%, hora=%)',
    filas_pendiente, filas_atendido, fecha_actual, hora_actual;

  return filas_pendiente + filas_atendido;
end;
$$;

comment on function public.actualizar_turnos_pendientes() is
  'Marca como "pendiente" los turnos "programado" cuya fecha/hora ya pasó. Los turnos de Pilates pasan directamente a "atendido". Ejecutado por pg_cron cada 15 minutos.';
