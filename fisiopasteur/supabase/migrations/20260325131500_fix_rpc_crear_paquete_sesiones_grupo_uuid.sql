-- Eliminar overloads anteriores para evitar que PostgREST elija la version equivocada
-- version original (id_especialista text)
drop function if exists public.crear_paquete_sesiones_rpc(
  integer,
  text,
  integer,
  date,
  text,
  text,
  jsonb
);

-- version intermedia (id_especialista uuid) pero con retorno de grupo como text
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
returns table(id_turno integer, id_grupo_tratamiento uuid)
language plpgsql
as $$
declare
  v_id_grupo uuid;
  v_turno jsonb;
  v_turno_id integer;
begin
  if jsonb_typeof(p_turnos) is distinct from 'array' then
    raise exception 'p_turnos debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_turnos) = 0 then
    raise exception 'p_turnos no puede ser vacio';
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
      coalesce((v_turno ->> 'fecha')::date, p_fecha_inicio),
      (v_turno ->> 'hora')::time,
      p_id_especialista,
      p_id_paciente,
      p_id_especialidad,
      nullif(v_turno ->> 'id_box', '')::integer,
      nullif(v_turno ->> 'observaciones', ''),
      coalesce(nullif(v_turno ->> 'estado', ''), 'programado'),
      coalesce(nullif(v_turno ->> 'tipo_plan', ''), p_tipo_plan),
      v_id_grupo
    )
    returning turno.id_turno into v_turno_id;

    id_turno := v_turno_id;
    id_grupo_tratamiento := v_id_grupo;
    return next;
  end loop;
end;
$$;
