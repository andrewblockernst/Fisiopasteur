-- Re-define `crear_paquete_pilates_rpc` para que reciba los pacientes como
-- `jsonb` (array de enteros) en vez de `integer[]`. El typegen de Supabase
-- (`supabase gen types typescript`) no genera tipos para funciones con
-- parámetros tipo array nativo de Postgres, así que cambiamos a jsonb para
-- exponerla en `database.types.ts`.

drop function if exists public.crear_paquete_pilates_rpc(
  integer[],
  uuid,
  integer,
  text,
  jsonb
);

drop function if exists public.crear_paquete_pilates_rpc(
  jsonb,
  uuid,
  integer,
  text,
  jsonb
);

create or replace function public.crear_paquete_pilates_rpc(
  p_id_pacientes jsonb,
  p_id_especialista uuid,
  p_id_especialidad integer,
  p_dificultad text default 'principiante',
  p_turnos jsonb default '[]'::jsonb
)
returns table(
  id_turno integer,
  fecha date,
  hora time,
  id_paciente integer,
  id_especialista uuid,
  id_especialidad integer,
  estado text,
  dificultad text,
  tipo_plan text,
  paciente_nombre text,
  paciente_apellido text,
  paciente_telefono text,
  especialista_nombre text,
  especialista_apellido text
)
language plpgsql
as $$
declare
  v_turno jsonb;
  v_turno_id integer;
  v_fecha date;
  v_hora time;
  v_paciente_id integer;
  v_pacientes integer[];
  v_conflictos text;
  v_capacidad_max constant integer := 4;
  v_nuevos_por_slot integer;
  v_especialista_nombre text;
  v_especialista_apellido text;
  v_paciente_nombre text;
  v_paciente_apellido text;
  v_paciente_telefono text;
  v_dificultad text;
begin
  if jsonb_typeof(p_turnos) is distinct from 'array' then
    raise exception 'p_turnos debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_turnos) = 0 then
    raise exception 'p_turnos no puede ser vacio';
  end if;

  if p_id_pacientes is null or jsonb_typeof(p_id_pacientes) is distinct from 'array' then
    raise exception 'p_id_pacientes debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_id_pacientes) = 0 then
    raise exception 'p_id_pacientes no puede ser vacio';
  end if;

  if p_id_especialidad is null then
    raise exception 'p_id_especialidad no puede ser nulo';
  end if;

  -- Convertir jsonb array -> integer[]
  select array_agg((value)::integer)
    into v_pacientes
  from jsonb_array_elements(p_id_pacientes);

  v_dificultad := coalesce(nullif(p_dificultad, ''), 'principiante');
  v_nuevos_por_slot := array_length(v_pacientes, 1);

  if v_nuevos_por_slot > v_capacidad_max then
    raise exception 'CONFLICTOS_PAQUETE: la cantidad de pacientes (%) supera la capacidad maxima (% por clase).', v_nuevos_por_slot, v_capacidad_max
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('paquete_pilates_' || p_id_especialista::text));

  select u.nombre, u.apellido
    into v_especialista_nombre, v_especialista_apellido
  from public.usuario u
  where u.id_usuario = p_id_especialista;

  -- Slots duplicados dentro del payload
  with payload as (
    select
      row_number() over () as rid,
      (t ->> 'fecha')::date as fecha,
      (t ->> 'hora')::time as hora
    from jsonb_array_elements(p_turnos) as t
  ),
  duplicados as (
    select to_char(p1.fecha, 'DD/MM/YYYY') || ' ' || to_char(p1.hora, 'HH24:MI') as slot
    from payload p1
    join payload p2 on p1.rid < p2.rid and p1.fecha = p2.fecha and p1.hora = p2.hora
  )
  select string_agg(distinct slot, ', ')
  into v_conflictos
  from duplicados;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: hay slots repetidos en la solicitud (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Capacidad por slot
  with payload as (
    select
      (t ->> 'fecha')::date as fecha,
      (t ->> 'hora')::time as hora
    from jsonb_array_elements(p_turnos) as t
  ),
  ocupacion as (
    select
      p.fecha,
      p.hora,
      count(tr.id_turno) as existentes
    from payload p
    left join public.turno tr
      on tr.fecha = p.fecha
     and tr.hora = p.hora
     and tr.id_especialidad = p_id_especialidad
     and tr.estado not in ('cancelado','eliminado')
    group by p.fecha, p.hora
  )
  select string_agg(
           to_char(fecha, 'DD/MM/YYYY') || ' ' || to_char(hora, 'HH24:MI')
           || ' (' || existentes || '+' || v_nuevos_por_slot || '/' || v_capacidad_max || ')'
         , ', ')
  into v_conflictos
  from ocupacion
  where existentes + v_nuevos_por_slot > v_capacidad_max;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: clases superan capacidad (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Conflictos por paciente: no duplicar el mismo paciente en el mismo slot
  with payload as (
    select
      (t ->> 'fecha')::date as fecha,
      (t ->> 'hora')::time as hora
    from jsonb_array_elements(p_turnos) as t
  ),
  pacientes_t as (
    select unnest(v_pacientes) as id_paciente
  ),
  expandido as (
    select pa.id_paciente, p.fecha, p.hora
    from pacientes_t pa cross join payload p
  ),
  ya_tienen as (
    select
      to_char(e.fecha, 'DD/MM/YYYY') || ' ' || to_char(e.hora, 'HH24:MI')
      || ' (paciente ' || e.id_paciente || ')' as slot
    from expandido e
    join public.turno tr
      on tr.id_paciente = e.id_paciente
     and tr.fecha = e.fecha
     and tr.hora = e.hora
     and tr.estado not in ('cancelado','eliminado')
  )
  select string_agg(slot, ', ')
  into v_conflictos
  from ya_tienen;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: un paciente ya tiene turno en (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Crear todos los turnos atómicamente
  for v_turno in
    select value from jsonb_array_elements(p_turnos)
  loop
    v_fecha := (v_turno ->> 'fecha')::date;
    v_hora := (v_turno ->> 'hora')::time;

    foreach v_paciente_id in array v_pacientes loop
      select p.nombre, p.apellido, p.telefono
        into v_paciente_nombre, v_paciente_apellido, v_paciente_telefono
      from public.paciente p
      where p.id_paciente = v_paciente_id;

      insert into public.turno (
        fecha,
        hora,
        id_especialista,
        id_paciente,
        id_especialidad,
        estado,
        tipo_plan,
        dificultad
      )
      values (
        v_fecha,
        v_hora,
        p_id_especialista,
        v_paciente_id,
        p_id_especialidad,
        'programado',
        'particular',
        v_dificultad
      )
      returning turno.id_turno into v_turno_id;

      id_turno := v_turno_id;
      fecha := v_fecha;
      hora := v_hora;
      id_paciente := v_paciente_id;
      id_especialista := p_id_especialista;
      id_especialidad := p_id_especialidad;
      estado := 'programado';
      dificultad := v_dificultad;
      tipo_plan := 'particular';
      paciente_nombre := v_paciente_nombre;
      paciente_apellido := v_paciente_apellido;
      paciente_telefono := v_paciente_telefono;
      especialista_nombre := v_especialista_nombre;
      especialista_apellido := v_especialista_apellido;
      return next;
    end loop;
  end loop;
end;
$$;

grant execute on function public.crear_paquete_pilates_rpc(jsonb, uuid, integer, text, jsonb) to authenticated;
grant execute on function public.crear_paquete_pilates_rpc(jsonb, uuid, integer, text, jsonb) to service_role;
