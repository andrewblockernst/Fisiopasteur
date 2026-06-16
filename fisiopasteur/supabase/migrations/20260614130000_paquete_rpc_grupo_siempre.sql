-- Fix: el RPC `crear_paquete_sesiones_rpc` creaba `grupo_tratamiento` solo
-- cuando llegaba un `p_titulo_tratamiento` no vacío. Como consecuencia, los
-- paquetes creados sin título quedaban sin grupo y los turnos sin número de
-- sesión derivable.
--
-- Cambio: por definición, llamar a este RPC implica crear un paquete, por lo
-- tanto siempre se inserta el `grupo_tratamiento`. Si el caller no manda
-- título, se usa un nombre por defecto que el server action ya intenta
-- proveer; este fallback en SQL es defensivo.

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
  v_titulo text;
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

  -- Validación de conflictos (preservada del RPC anterior)
  with turnos_data as (
    select
      coalesce(((value ->> 'fecha')::date), p_fecha_inicio) as fecha,
      ((value ->> 'hora')::time) as hora
    from jsonb_array_elements(p_turnos)
  )
  select string_agg(distinct to_char(td.fecha, 'YYYY-MM-DD') || ' ' || to_char(td.hora, 'HH24:MI'), ', ')
    into v_conflictos
  from turnos_data td
  join public.turno t
    on t.fecha = td.fecha
   and t.hora = td.hora
   and t.estado <> 'cancelado'
   and t.estado <> 'eliminado'
   and (
     t.id_especialista = p_id_especialista
     or (t.id_paciente = p_id_paciente)
   );

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: los siguientes horarios ya estan ocupados (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Siempre crear el grupo_tratamiento (antes era condicional).
  -- Si el caller no manda título, usamos un fallback descriptivo.
  v_titulo := nullif(btrim(p_titulo_tratamiento), '');
  if v_titulo is null then
    v_titulo := 'Paquete de sesiones - ' || to_char(p_fecha_inicio, 'DD/MM/YYYY');
  end if;

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
    v_titulo,
    p_fecha_inicio,
    p_tipo_plan,
    jsonb_array_length(p_turnos)
  )
  returning id_grupo into v_id_grupo;

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
