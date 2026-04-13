drop function if exists public.crear_paquete_sesiones_rpc(
  integer,
  uuid,
  integer,
  date,
  text,
  text,
  jsonb
);

create or replace function public.crear_paquete_sesiones_rpc(
  p_id_paciente integer,
  p_id_especialista uuid,
  p_id_especialidad integer,
  p_fecha_inicio date,
  p_tipo_plan text,
  p_titulo_tratamiento text default null,
  p_turnos jsonb default '[]'::jsonb
)
returns table(
  id_turno integer,
  id_grupo_tratamiento uuid,
  fecha date,
  hora time,
  id_paciente integer,
  id_especialista uuid,
  id_especialidad integer,
  id_box integer,
  observaciones text,
  estado text,
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
  v_id_grupo uuid;
  v_turno jsonb;
  v_turno_id integer;
  v_conflictos text;
  v_duplicados text;
  v_paciente_nombre text;
  v_paciente_apellido text;
  v_paciente_telefono text;
  v_especialista_nombre text;
  v_especialista_apellido text;
  v_fecha date;
  v_hora time;
  v_id_box integer;
  v_observaciones text;
  v_estado text;
  v_tipo_plan text;
begin
  if jsonb_typeof(p_turnos) is distinct from 'array' then
    raise exception 'p_turnos debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_turnos) = 0 then
    raise exception 'p_turnos no puede ser vacio';
  end if;

  select p.nombre, p.apellido, p.telefono
    into v_paciente_nombre, v_paciente_apellido, v_paciente_telefono
  from public.paciente p
  where p.id_paciente = p_id_paciente;

  select u.nombre, u.apellido
    into v_especialista_nombre, v_especialista_apellido
  from public.usuario u
  where u.id_usuario = p_id_especialista;

  -- Serialize creates for same specialist in this transaction window.
  perform pg_advisory_xact_lock(hashtext('turno_paquete_' || p_id_especialista::text));

  -- Validate overlapping slots inside the payload (60-minute duration).
  with payload as (
    select
      row_number() over () as rid,
      coalesce((t ->> 'fecha')::date, p_fecha_inicio) as fecha,
      (t ->> 'hora')::time as hora,
      nullif(t ->> 'id_box', '')::integer as id_box
    from jsonb_array_elements(p_turnos) as t
  ),
  superpuestos as (
    select
      to_char(p1.fecha, 'DD/MM/YYYY') || ' ' || to_char(p1.hora, 'HH24:MI') || ' ~ ' || to_char(p2.hora, 'HH24:MI') as slot
    from payload p1
    join payload p2
      on p1.rid < p2.rid
     and p1.fecha = p2.fecha
     and p1.hora < (p2.hora + interval '60 minutes')
     and (p1.hora + interval '60 minutes') > p2.hora
  )
  select string_agg(slot, ', ')
  into v_duplicados
  from superpuestos;

  if v_duplicados is not null then
    raise exception 'CONFLICTOS_PAQUETE: hay horarios superpuestos en la solicitud (%).', v_duplicados
      using errcode = 'P0001';
  end if;

  -- Validate overlapping collisions against existing appointments (60-minute duration).
  with payload as (
    select
      coalesce((t ->> 'fecha')::date, p_fecha_inicio) as fecha,
      (t ->> 'hora')::time as hora,
      nullif(t ->> 'id_box', '')::integer as id_box
    from jsonb_array_elements(p_turnos) as t
  ),
  conflictos as (
    select
      to_char(p.fecha, 'DD/MM/YYYY') || ' ' || to_char(p.hora, 'HH24:MI') as slot
    from payload p
    join public.turno tr
      on tr.fecha = p.fecha
     and tr.estado <> 'cancelado'
     and tr.estado <> 'eliminado'
     and (
       tr.id_especialista = p_id_especialista
       or (p.id_box is not null and tr.id_box = p.id_box)
     )
     and tr.hora < (p.hora + interval '60 minutes')
     and (tr.hora + interval '60 minutes') > p.hora
    group by p.fecha, p.hora
  )
  select string_agg(slot, ', ')
  into v_conflictos
  from conflictos;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: los siguientes horarios ya estan ocupados (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  if p_titulo_tratamiento is not null and btrim(p_titulo_tratamiento) <> '' then
    insert into public.grupo_tratamiento (
      id_paciente,
      id_especialista,
      id_especialidad,
      nombre,
      fecha_inicio,
      tipo_plan,
      cantidad_turnos_planificados
    )
    values (
      p_id_paciente,
      p_id_especialista,
      p_id_especialidad,
      p_titulo_tratamiento,
      p_fecha_inicio,
      p_tipo_plan,
      jsonb_array_length(p_turnos)
    )
    returning id_grupo into v_id_grupo;
  end if;

  for v_turno in
    select value from jsonb_array_elements(p_turnos)
  loop
    v_fecha := coalesce((v_turno ->> 'fecha')::date, p_fecha_inicio);
    v_hora := (v_turno ->> 'hora')::time;
    v_id_box := nullif(v_turno ->> 'id_box', '')::integer;
    v_observaciones := nullif(v_turno ->> 'observaciones', '');
    v_estado := coalesce(nullif(v_turno ->> 'estado', ''), 'programado');
    v_tipo_plan := coalesce(nullif(v_turno ->> 'tipo_plan', ''), p_tipo_plan);

    insert into public.turno (
      fecha,
      hora,
      id_especialista,
      id_paciente,
      id_especialidad,
      id_box,
      observaciones,
      estado,
      tipo_plan,
      id_grupo_tratamiento
    )
    values (
      v_fecha,
      v_hora,
      p_id_especialista,
      p_id_paciente,
      p_id_especialidad,
      v_id_box,
      v_observaciones,
      v_estado,
      v_tipo_plan,
      v_id_grupo
    )
    returning turno.id_turno into v_turno_id;

    id_turno := v_turno_id;
    id_grupo_tratamiento := v_id_grupo;
    fecha := v_fecha;
    hora := v_hora;
    id_paciente := p_id_paciente;
    id_especialista := p_id_especialista;
    id_especialidad := p_id_especialidad;
    id_box := v_id_box;
    observaciones := v_observaciones;
    estado := v_estado;
    tipo_plan := v_tipo_plan;
    paciente_nombre := v_paciente_nombre;
    paciente_apellido := v_paciente_apellido;
    paciente_telefono := v_paciente_telefono;
    especialista_nombre := v_especialista_nombre;
    especialista_apellido := v_especialista_apellido;
    return next;
  end loop;
end;
$$;

grant execute on function public.crear_paquete_sesiones_rpc(integer, uuid, integer, date, text, text, jsonb) to authenticated;
grant execute on function public.crear_paquete_sesiones_rpc(integer, uuid, integer, date, text, text, jsonb) to service_role;
